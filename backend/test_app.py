"""Automated Test Suite for MailCheck Flask Backend

Tests:
1. Health check endpoint (GET /api/health)
2. Request validation & error responses (POST /api/verify)
3. Syntax validation rules (malformed emails -> Likely to Bounce)
4. DNS MX record lookups & RFC fallback (A/AAAA)
5. DNS timeouts & inconclusive handling
6. Batch processing limits & preservation of order and duplicates
"""

import pytest
from unittest.mock import patch, MagicMock
import dns.resolver
import dns.exception

from app import create_app
from validator import (
    validate_email_syntax,
    query_dns_records,
    verify_email,
    STATUS_LIKELY_DELIVERED,
    STATUS_LIKELY_BOUNCE,
    STATUS_UNKNOWN,
)


@pytest.fixture
def client():
    """Flask test client fixture."""
    app = create_app({"TESTING": True})
    with app.test_client() as client:
        yield client


# =============================================================================
# 1. Health Check Endpoint Tests
# =============================================================================

def test_health_check_endpoint(client):
    """GET /api/health returns 200 OK with correct status and message."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["message"] == "Email verification backend is running"


# =============================================================================
# 2. Request Body Validation Tests (POST /api/verify)
# =============================================================================

def test_verify_rejects_non_json(client):
    """POST /api/verify without JSON Content-Type returns 400 Bad Request."""
    response = client.post("/api/verify", data="not json", content_type="text/plain")
    assert response.status_code == 400
    assert "Content-Type must be 'application/json'" in response.get_json()["error"]


def test_verify_rejects_missing_emails_field(client):
    """POST /api/verify without 'emails' key returns 400 Bad Request."""
    response = client.post("/api/verify", json={"wrong_field": ["test@example.com"]})
    assert response.status_code == 400
    assert "Missing required field: 'emails'" in response.get_json()["error"]


def test_verify_rejects_non_list_emails(client):
    """POST /api/verify where 'emails' is a string returns 400 Bad Request."""
    response = client.post("/api/verify", json={"emails": "test@example.com"})
    assert response.status_code == 400
    assert "must be a list of strings" in response.get_json()["error"]


def test_verify_rejects_empty_emails_list(client):
    """POST /api/verify where 'emails' is empty returns 400 Bad Request."""
    response = client.post("/api/verify", json={"emails": []})
    assert response.status_code == 400
    assert "cannot be empty" in response.get_json()["error"]


def test_verify_rejects_batch_exceeding_100(client):
    """POST /api/verify with > 100 emails returns 400 Bad Request."""
    too_many = [f"user{i}@example.com" for i in range(101)]
    response = client.post("/api/verify", json={"emails": too_many})
    assert response.status_code == 400
    assert "Maximum allowed is 100" in response.get_json()["error"]


def test_verify_rejects_non_string_items(client):
    """POST /api/verify with non-string elements returns 400 Bad Request."""
    response = client.post("/api/verify", json={"emails": ["valid@example.com", 12345]})
    assert response.status_code == 400
    assert "must be strings" in response.get_json()["error"]


# =============================================================================
# 3. Syntax Validation Unit Tests
# =============================================================================

@pytest.mark.parametrize(
    "invalid_email, expected_reason",
    [
        ("", "Email address is empty"),
        ("plainaddress", "exactly one '@'"),
        ("@missing-local.com", "Local part before '@' cannot be empty"),
        ("missing-domain@", "Domain part after '@' cannot be empty"),
        ("user@domain-no-dot", "must contain at least one dot"),
        ("user@.leadingdot.com", "cannot start or end with a dot"),
        ("user@trailingdot.com.", "cannot start or end with a dot"),
        ("user@-leadinghyphen.com", "cannot start or end with a hyphen"),
        ("user@consecutive..dots.com", "cannot contain consecutive dots"),
        ("user@domain.c", "valid top-level domain (TLD) with at least 2 letters"),
    ],
)
def test_syntax_validation_rejects_invalid_patterns(invalid_email, expected_reason):
    is_valid, reason = validate_email_syntax(invalid_email)
    assert is_valid is False
    assert expected_reason.lower() in reason.lower()


def test_syntax_validation_accepts_valid_patterns():
    valid_emails = [
        "alex.smith@company.com",
        "user+tag@sub.domain.org",
        "first.last@service.co.uk",
        "simple@example.net",
    ]
    for email in valid_emails:
        is_valid, reason = validate_email_syntax(email)
        assert is_valid is True, f"Failed for {email}: {reason}"


# =============================================================================
# 4. DNS Lookups & Delivery Status Tests (with Mocked DNS)
# =============================================================================

@patch("dns.resolver.Resolver.resolve")
def test_dns_mx_records_found_returns_unknown(mock_resolve):
    """When MX records exist, status must be 'Unknown' because mailbox existence is unverified."""
    mock_mx = MagicMock()
    mock_mx.exchange = "mail.example.com."
    mock_mx.preference = 10
    mock_resolve.return_value = [mock_mx]

    status, reason, checks = query_dns_records("example.com")
    assert status == STATUS_UNKNOWN
    assert "mail-routing records" in reason
    assert "unverified" in reason
    assert checks["syntax_valid"] is True
    assert checks["mx_found"] is True
    assert checks["dns_result"] == "MX records found"


@patch("dns.resolver.Resolver.resolve")
def test_dns_null_mx_returns_likely_to_bounce(mock_resolve):
    """RFC 7505 Null MX record (exchange='.', preference=0) indicates domain rejects email."""
    mock_null_mx = MagicMock()
    mock_null_mx.exchange = "."
    mock_null_mx.preference = 0
    mock_resolve.return_value = [mock_null_mx]

    status, reason, checks = query_dns_records("rejects-mail.com")
    assert status == STATUS_LIKELY_BOUNCE
    assert "explicitly rejects email" in reason
    assert checks["mx_found"] is False


@patch("dns.resolver.Resolver.resolve")
def test_dns_fallback_a_record_returns_unknown(mock_resolve):
    """When no MX records exist, but A/AAAA fallback exists, return 'Unknown' per RFC 5321."""
    def side_effect(domain, rdtype):
        if rdtype == "MX":
            raise dns.resolver.NoAnswer()
        elif rdtype == "A":
            mock_a = MagicMock()
            return [mock_a]
        raise dns.resolver.NoAnswer()

    mock_resolve.side_effect = side_effect

    status, reason, checks = query_dns_records("fallback-domain.org")
    assert status == STATUS_UNKNOWN
    assert "fallback address" in reason
    assert checks["mx_found"] is False
    assert "Fallback A records found" in checks["dns_result"]


@patch("dns.resolver.Resolver.resolve")
def test_dns_no_mx_no_fallback_returns_likely_to_bounce(mock_resolve):
    """When neither MX nor fallback A/AAAA records exist, return 'Likely to Bounce'."""
    mock_resolve.side_effect = dns.resolver.NoAnswer()

    status, reason, checks = query_dns_records("no-routing.com")
    assert status == STATUS_LIKELY_BOUNCE
    assert "usable mail-routing" in reason.lower()
    assert checks["mx_found"] is False


@patch("dns.resolver.Resolver.resolve")
def test_dns_nxdomain_returns_likely_to_bounce(mock_resolve):
    """When domain does not exist in DNS (NXDOMAIN), return 'Likely to Bounce'."""
    mock_resolve.side_effect = dns.resolver.NXDOMAIN()

    status, reason, checks = query_dns_records("nonexistent-domain-xyz123.com")
    assert status == STATUS_LIKELY_BOUNCE
    assert "NXDOMAIN" in reason
    assert checks["mx_found"] is False


@patch("dns.resolver.Resolver.resolve")
def test_dns_timeout_returns_unknown(mock_resolve):
    """When DNS lookup times out, return 'Unknown' instead of falsely claiming bounce."""
    mock_resolve.side_effect = dns.exception.Timeout()

    status, reason, checks = query_dns_records("slow-dns.com")
    assert status == STATUS_UNKNOWN
    assert "timed out" in reason.lower()
    assert checks["mx_found"] is False


# =============================================================================
# 5. Full Batch Processing Endpoint Tests
# =============================================================================

@patch("validator.query_dns_records")
def test_verify_batch_preserves_order_and_duplicates(mock_dns, client):
    """Endpoint trims whitespace, preserves input order, and does not drop duplicates."""
    mock_dns.return_value = (
        STATUS_UNKNOWN,
        "The domain has mail-routing records, but mailbox existence and actual delivery are unverified.",
        {"syntax_valid": True, "mx_found": True, "dns_result": "MX records found"},
    )

    payload = {
        "emails": [
            "  valid1@domain.com  ",
            "invalid-syntax-email",
            "valid1@domain.com",  # Duplicate preserved!
        ]
    }

    response = client.post("/api/verify", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    results = data["results"]

    assert len(results) == 3

    # Check row 1: trimmed valid1
    assert results[0]["email"] == "valid1@domain.com"
    assert results[0]["status"] == STATUS_UNKNOWN
    assert results[0]["checks"]["syntax_valid"] is True

    # Check row 2: invalid syntax
    assert results[1]["email"] == "invalid-syntax-email"
    assert results[1]["status"] == STATUS_LIKELY_BOUNCE
    assert results[1]["checks"]["syntax_valid"] is False

    # Check row 3: duplicate valid1
    assert results[2]["email"] == "valid1@domain.com"
    assert results[2]["status"] == STATUS_UNKNOWN
    assert results[2]["checks"]["syntax_valid"] is True
