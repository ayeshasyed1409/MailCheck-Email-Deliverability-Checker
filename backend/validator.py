"""Email Validator & DNS Resolver Module

Provides syntax validation and DNS mail-routing checks for email addresses.

IMPORTANT ACCURACY CONSTRAINTS:
1. Syntax validity or MX record existence does NOT prove that a mailbox exists
   or that an email will be successfully delivered.
2. No emails are sent and no SMTP mailbox probing or authentication is performed.
3. Deliverability statuses are strictly limited to:
   - "Likely to Bounce" (invalid syntax or no mail-routing records)
   - "Unknown" (mail-routing records exist or DNS query was inconclusive; mailbox existence unverified)
   - "Likely Delivered" (reserved for future stages where end-to-end delivery confirmation is possible)
"""

import re
import email.utils
import dns.resolver
import dns.exception

# Official status constants
STATUS_LIKELY_DELIVERED = "Likely Delivered"
STATUS_LIKELY_BOUNCE = "Likely to Bounce"
STATUS_UNKNOWN = "Unknown"

# RFC 5321 length limits
MAX_EMAIL_LENGTH = 254
MAX_LOCAL_PART_LENGTH = 64
MAX_DOMAIN_PART_LENGTH = 253

# Comprehensive email syntax pattern
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


def validate_email_syntax(email_address: str) -> tuple[bool, str]:
    """Validates the basic syntax and structure of an email address.

    Args:
        email_address: The email string to check (assumed trimmed).

    Returns:
        tuple[bool, str]: (is_valid, failure_reason)
    """
    if not email_address:
        return False, "Email address is empty."

    if len(email_address) > MAX_EMAIL_LENGTH:
        return False, f"Email address exceeds maximum length of {MAX_EMAIL_LENGTH} characters."

    if email_address.count("@") != 1:
        return False, "Email address must contain exactly one '@' symbol."

    local_part, domain_part = email_address.split("@")

    if not local_part:
        return False, "Local part before '@' cannot be empty."

    if len(local_part) > MAX_LOCAL_PART_LENGTH:
        return False, f"Local part exceeds maximum length of {MAX_LOCAL_PART_LENGTH} characters."

    if not domain_part:
        return False, "Domain part after '@' cannot be empty."

    if len(domain_part) > MAX_DOMAIN_PART_LENGTH:
        return False, f"Domain part exceeds maximum length of {MAX_DOMAIN_PART_LENGTH} characters."

    # Domain syntax checks
    if not "." in domain_part:
        return False, "Domain part must contain at least one dot separating labels."

    if domain_part.startswith(".") or domain_part.endswith("."):
        return False, "Domain cannot start or end with a dot."

    if domain_part.startswith("-") or domain_part.endswith("-"):
        return False, "Domain cannot start or end with a hyphen."

    if ".." in domain_part:
        return False, "Domain cannot contain consecutive dots."

    # Validate individual domain labels
    labels = domain_part.split(".")
    for label in labels:
        if not label:
            return False, "Domain contains an empty label."
        if len(label) > 63:
            return False, f"Domain label '{label}' exceeds maximum length of 63 characters."
        if label.startswith("-") or label.endswith("-"):
            return False, f"Domain label '{label}' cannot start or end with a hyphen."

    # Top-level domain (TLD) must have at least 2 alphabetic characters
    tld = labels[-1]
    if not tld.isalpha() or len(tld) < 2:
        return False, "Domain must have a valid top-level domain (TLD) with at least 2 letters."

    # Regex check
    if not EMAIL_REGEX.match(email_address):
        return False, "Email contains invalid characters or malformed structure."

    # Standard library parseaddr verification
    _, parsed_addr = email.utils.parseaddr(email_address)
    if not parsed_addr or parsed_addr != email_address:
        return False, "Email address failed standard RFC parsing."

    return True, ""


def query_dns_records(domain: str, dns_timeout: float = 2.0, dns_lifetime: float = 3.0) -> tuple[str, str, dict]:
    """Performs DNS lookups for MX records, falling back to A/AAAA records.

    Args:
        domain: The domain name to query.
        dns_timeout: Timeout per individual DNS query in seconds.
        dns_lifetime: Total timeout for DNS resolution in seconds.

    Returns:
        tuple[str, str, dict]: (status, reason, checks_dict)
    """
    resolver = dns.resolver.Resolver()
    resolver.timeout = dns_timeout
    resolver.lifetime = dns_lifetime

    # 1. Query MX records
    try:
        mx_answers = resolver.resolve(domain, "MX")
        if mx_answers and len(mx_answers) > 0:
            # Check for RFC 7505 Null MX (host is "." with priority 0, meaning rejects all email)
            for rdata in mx_answers:
                target_str = str(rdata.exchange).rstrip(".")
                if target_str == "" and rdata.preference == 0:
                    return (
                        STATUS_LIKELY_BOUNCE,
                        "The domain explicitly rejects email (Null MX record configured per RFC 7505).",
                        {"syntax_valid": True, "mx_found": False, "dns_result": "Null MX record found (RFC 7505)"},
                    )

            return (
                STATUS_UNKNOWN,
                "The domain has mail-routing records, but mailbox existence and actual delivery are unverified.",
                {"syntax_valid": True, "mx_found": True, "dns_result": "MX records found"},
            )

    except dns.resolver.NXDOMAIN:
        # Domain does not exist at all in DNS
        return (
            STATUS_LIKELY_BOUNCE,
            "The domain does not exist in DNS (NXDOMAIN).",
            {"syntax_valid": True, "mx_found": False, "dns_result": "Domain does not exist (NXDOMAIN)"},
        )

    except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        # No MX answer; proceed to fallback A/AAAA check below
        pass

    except dns.exception.Timeout:
        return (
            STATUS_UNKNOWN,
            "DNS lookup timed out while checking MX records. Deliverability cannot be verified at this time.",
            {"syntax_valid": True, "mx_found": False, "dns_result": "DNS query timed out"},
        )

    except dns.exception.DNSException as exc:
        return (
            STATUS_UNKNOWN,
            f"DNS query was inconclusive: {exc.__class__.__name__}. Deliverability remains unverified.",
            {"syntax_valid": True, "mx_found": False, "dns_result": "Inconclusive DNS result"},
        )

    except Exception:
        return (
            STATUS_UNKNOWN,
            "An unexpected error occurred during DNS lookup. Deliverability remains unverified.",
            {"syntax_valid": True, "mx_found": False, "dns_result": "Unexpected lookup error"},
        )

    # 2. Check for implicit-MX fallback: A or AAAA records (RFC 5321 section 5.1)
    has_fallback = False
    fallback_details = []

    for record_type in ("A", "AAAA"):
        try:
            addr_answers = resolver.resolve(domain, record_type)
            if addr_answers and len(addr_answers) > 0:
                has_fallback = True
                fallback_details.append(record_type)
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
            continue
        except dns.exception.Timeout:
            return (
                STATUS_UNKNOWN,
                "DNS lookup timed out while checking address fallback records. Deliverability is unverified.",
                {"syntax_valid": True, "mx_found": False, "dns_result": "DNS query timed out on fallback check"},
            )
        except dns.exception.DNSException:
            # Continue checking the other address family or conclude
            continue
        except Exception:
            continue

    if has_fallback:
        records_str = "/".join(fallback_details)
        return (
            STATUS_UNKNOWN,
            f"No MX records found, but fallback address ({records_str}) records exist. Mailbox existence and delivery are unverified.",
            {"syntax_valid": True, "mx_found": False, "dns_result": f"Fallback {records_str} records found"},
        )

    # Neither MX nor fallback address records exist
    return (
        STATUS_LIKELY_BOUNCE,
        "The domain does not have any usable mail-routing (MX) or fallback address records.",
        {"syntax_valid": True, "mx_found": False, "dns_result": "No mail-routing or fallback records found"},
    )


def verify_email(raw_email: str) -> dict:
    """Performs full verification on a single email string.

    Never raises an uncaught exception.

    Args:
        raw_email: Email address to verify.

    Returns:
        dict: Standardized result dict with keys:
            - email: trimmed input
            - status: "Likely to Bounce" | "Unknown" | "Likely Delivered"
            - reason: human-readable explanation
            - checks: dict with syntax_valid, mx_found, dns_result
    """
    email_clean = raw_email.strip() if isinstance(raw_email, str) else str(raw_email).strip()

    # Step 1: Syntax Validation
    is_valid_syntax, syntax_reason = validate_email_syntax(email_clean)
    if not is_valid_syntax:
        return {
            "email": email_clean,
            "status": STATUS_LIKELY_BOUNCE,
            "reason": f"Invalid email syntax: {syntax_reason}",
            "checks": {
                "syntax_valid": False,
                "mx_found": False,
                "dns_result": "Syntax check failed; DNS lookup skipped",
            },
        }

    # Step 2: Extract domain and run DNS check
    domain = email_clean.split("@")[1].lower()
    status, reason, checks = query_dns_records(domain)

    return {
        "email": email_clean,
        "status": status,
        "reason": reason,
        "checks": checks,
    }
