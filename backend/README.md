# MailCheck — Python Flask Backend (Part 2)

Welcome to the backend service for **MailCheck**, an email deliverability checker.

This REST API evaluates email addresses using **RFC-compliant syntax validation** and **DNS mail-routing (MX and fallback A/AAAA) record lookups**.

---

## 1. What the Backend Does

- **Validates Email Syntax**: Checks email addresses against standard RFC 5321 length limits, format rules (single `@`, valid local part, dot-separated domain labels, valid TLD), and illegal character patterns.
- **Performs DNS Mail-Routing Lookups**:
  - Uses `dnspython` to query Mail Exchange (MX) records.
  - Inspects records for RFC 7505 "Null MX" records (domains explicitly declaring they reject email).
  - Performs implicit-MX fallback lookups for address (`A` / `AAAA`) records per RFC 5321 Section 5.1 when no MX records are published.
- **Classifies Deliverability Safely**:
  - Assigns strictly defined, honest deliverability statuses (`Likely to Bounce` or `Unknown`).
  - Never falsely asserts guaranteed delivery or mailbox existence based merely on format or MX presence.
- **Processes Batches Safely**: Accepts up to 100 email addresses per batch, trims whitespace, preserves input order, retains duplicates, and never crashes an entire batch due to a single invalid address.
- **Enables Local Development**: Configured with `Flask-CORS` to communicate seamlessly with the Vite React frontend.

---

## 2. Prerequisites

- **Python 3.8+** (Python 3.10+ recommended, tested with Python 3.15)
- **Windows Command Prompt** or **PowerShell**

---

## 3. Setup and Installation (Windows)

Follow these steps from the `email/backend/` directory:

### Step 1: Open a terminal and navigate to the backend folder
```powershell
cd C:\Users\Janibasha\OneDrive\Desktop\email\backend
```

### Step 2: Create a Python virtual environment
```powershell
# Using the Windows Python launcher:
py -m venv venv

# Or using python directly:
python -m venv venv
```

### Step 3: Activate the virtual environment
In **PowerShell**:
```powershell
.\venv\Scripts\Activate.ps1
```
*(If you encounter a PowerShell script execution policy restriction, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

In **Command Prompt (cmd.exe)**:
```cmd
venv\Scripts\activate.bat
```

### Step 4: Install required dependencies
```powershell
pip install -r requirements.txt
```

The dependencies installed include:
- `Flask`: REST API framework
- `Flask-Cors`: Cross-Origin Resource Sharing handling for Vite local development
- `dnspython`: DNS resolution library for MX, A, and AAAA records
- `pytest`: Automated test framework

---

## 4. Starting the Server

To start the Flask development server:

```powershell
python app.py
```

By default, the server runs on:
`http://127.0.0.1:5000`

Optional environment variables:
- `PORT`: Set custom port (default: `5000`)
- `FLASK_DEBUG`: Enable debug mode (`true` or `false`, default: `false`)
- `CORS_ALLOWED_ORIGINS`: Comma-separated allowed origins (default includes `http://localhost:5173` and `http://localhost:4173`)

---

## 5. API Reference & Testing

### A. Health Check Endpoint
Confirms that the backend service is running.

- **URL**: `GET /api/health`
- **Method**: `GET`
- **Response**: `200 OK`

#### Example Request:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method Get
```
Or with `curl`:
```bash
curl -i http://127.0.0.1:5000/api/health
```

#### Example Response:
```json
{
  "message": "Email verification backend is running",
  "status": "ok"
}
```

---

### B. Email Verification Endpoint
Analyzes a batch of email addresses for syntax correctness and mail-routing records.

- **URL**: `POST /api/verify`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "emails": [
      "user@example.com",
      "invalid-email",
      "  sales@company.org  "
    ]
  }
  ```

#### Request Validation Rules:
- Body must be valid JSON with a non-empty `"emails"` array.
- All items in `"emails"` must be strings.
- Maximum batch size is **100** addresses per request.
- Whitespace surrounding each address is automatically trimmed.
- Input order is preserved in the output. Duplicates are retained.

#### Example Request (PowerShell):
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/verify" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"emails": ["invalid-email", "person@gmail.com", "user@nonexistent-domain-12345.xyz"]}' `
  | ConvertTo-Json -Depth 5
```

#### Example Request (curl):
```bash
curl -X POST http://127.0.0.1:5000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"emails": ["invalid-email", "person@gmail.com", "user@nonexistent-domain-12345.xyz"]}'
```

---

## 6. Example Requests & Expected Response Shapes

### 1. Malformed Email Address (Syntax Error)
An email missing `@`, containing forbidden characters, or lacking a valid domain structure.

**Input:**
```json
{
  "emails": ["invalid-email"]
}
```

**Response:**
```json
{
  "results": [
    {
      "email": "invalid-email",
      "status": "Likely to Bounce",
      "reason": "Invalid email syntax: Email address must contain exactly one '@' symbol.",
      "checks": {
        "syntax_valid": false,
        "mx_found": false,
        "dns_result": "Syntax check failed; DNS lookup skipped"
      }
    }
  ]
}
```

### 2. Syntactically Valid Address with MX Records
The domain has active mail-routing records, but mailbox existence cannot be confirmed by DNS alone.

**Input:**
```json
{
  "emails": ["person@gmail.com"]
}
```

**Response:**
```json
{
  "results": [
    {
      "email": "person@gmail.com",
      "status": "Unknown",
      "reason": "The domain has mail-routing records, but mailbox existence and actual delivery are unverified.",
      "checks": {
        "syntax_valid": true,
        "mx_found": true,
        "dns_result": "MX records found"
      }
    }
  ]
}
```

### 3. Domain with No Usable Mail-Routing Records (NXDOMAIN or No MX/A)
The domain does not exist in DNS or has neither MX records nor fallback address records.

**Input:**
```json
{
  "emails": ["user@this-domain-does-not-exist-9876543210.com"]
}
```

**Response:**
```json
{
  "results": [
    {
      "email": "user@this-domain-does-not-exist-9876543210.com",
      "status": "Likely to Bounce",
      "reason": "The domain does not exist in DNS (NXDOMAIN).",
      "checks": {
        "syntax_valid": true,
        "mx_found": false,
        "dns_result": "Domain does not exist (NXDOMAIN)"
      }
    }
  ]
}
```

### 4. Inconclusive DNS Lookup (Timeouts / Refusals)
DNS lookup times out or encounters unreachable nameservers. Rather than falsely declaring the address invalid, the status safely remains `Unknown`.

**Response:**
```json
{
  "results": [
    {
      "email": "user@slow-or-blocked-dns.org",
      "status": "Unknown",
      "reason": "DNS lookup timed out while checking MX records. Deliverability cannot be verified at this time.",
      "checks": {
        "syntax_valid": true,
        "mx_found": false,
        "dns_result": "DNS query timed out"
      }
    }
  ]
}
```

---

## 7. What Each Status Means

| Status | Meaning | When It Is Used |
| :--- | :--- | :--- |
| **`Likely to Bounce`** | High probability that mail cannot be delivered. | 1. Malformed syntax (missing `@`, invalid domain, illegal characters).<br>2. Domain does not exist in DNS (`NXDOMAIN`).<br>3. Domain explicitly rejects email via RFC 7505 Null MX.<br>4. Domain publishes neither MX records nor fallback `A`/`AAAA` address records. |
| **`Unknown`** | Deliverability cannot be established without SMTP interaction. | 1. Domain publishes valid MX records (mailbox existence is unverified).<br>2. Domain has no MX but has fallback `A`/`AAAA` records.<br>3. DNS queries timed out, were filtered, or yielded inconclusive results. |
| **`Likely Delivered`** | Reserved for full verification stages. | **Not used in Part 2.** A valid format or DNS record alone does not prove that a mailbox exists or will accept messages. |

---

## 8. Important Technical Limitations & Accuracy Rules

### Why DNS/MX Checks Cannot Confirm Mailbox Existence or Guarantee Delivery
1. **MX Records Route to Servers, Not Users**: An MX record merely specifies which mail transfer agent (MTA) server is responsible for receiving messages for a domain. It says nothing about whether an individual username (e.g. `alice` in `alice@example.com`) exists, was deleted, or has an active mailbox.
2. **Catch-All Domains**: Many mail servers accept incoming messages for *any* email address at their domain (a "catch-all" or wildcard configuration) and silently discard unknown recipients later.
3. **No SMTP Mailbox Probing Performed**: In this stage, no emails are sent and no SMTP socket connections (`RCPT TO` handshakes) are initiated. Modern email providers (Gmail, Outlook, Yahoo) frequently block or tarpit IP addresses attempting SMTP mailbox probing, and disable RFC 2821 `VRFY` commands for privacy and anti-harvesting reasons.
4. **Spam Filtering & Reputation**: Even if a mailbox exists, real-world delivery depends on sender IP reputation, DKIM, SPF, DMARC, and recipient inbox quota.

### DNS Constraints in Cloud & Serverless Environments
- Many cloud hosting platforms (such as AWS Lambda outside a VPC, Vercel Serverless Functions, or restricted containers) block or throttle outbound **UDP port 53** traffic to prevent abuse.
- In such environments, standard DNS queries may time out. The backend handles this gracefully by returning `status: "Unknown"` with an explanatory message, rather than erroneously marking addresses as bouncing.

---

## 9. Running Automated Tests

An automated test suite is provided in `backend/test_app.py` covering endpoints, input validation, syntax edge cases, DNS mock scenarios, timeouts, batch ordering, and duplicate preservation.

To run the tests:

```powershell
cd C:\Users\Janibasha\OneDrive\Desktop\email\backend
.\venv\Scripts\pytest test_app.py -v
```

All 25 automated unit and integration tests should pass.
