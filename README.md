# MailCheck — Email Deliverability Checker

A full-stack web application that validates email addresses and reports their deliverability status using RFC syntax checks and live DNS/MX record lookups.

---

## Project Overview

MailCheck lets you paste one or more email addresses and instantly checks whether each one is likely to be delivered, likely to bounce, or has an unknown status. It works by:

1. **Syntax validation** — checks that the address follows RFC 5321/5322 rules.
2. **DNS MX record lookup** — confirms that the domain has mail exchange records configured.

Results are displayed in a clean results table with colour-coded status badges and plain-English explanations.

---

## Features

- Paste multiple email addresses (one per line, up to 100 per batch)
- Real-time line counter as you type
- Three deliverability statuses: **Likely Delivered**, **Likely to Bounce**, **Unknown**
- Summary statistics (total, delivered, bounce, unknown)
- Responsive design — works on desktop, tablet, and mobile
- Live Flask REST API backend with DNS/MX record lookups via `dnspython`

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, JavaScript, Vanilla CSS |
| Backend | Python 3, Flask, Flask-CORS, dnspython |
| Deployment (frontend) | Vercel |
| Deployment (backend) | Render |

---

## Project Folder Structure

```
email/
├── index.html                  # Vite HTML entry point
├── vite.config.js              # Vite configuration
├── package.json                # Frontend dependencies
├── README.md                   # This file
│
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root component and state management
│   ├── App.css                 # Application-level styles
│   ├── index.css               # Global base styles
│   │
│   ├── components/
│   │   ├── Header.jsx          # App header with branding
│   │   ├── EmailInput.jsx      # Textarea input, counter, and action buttons
│   │   ├── ResultsTable.jsx    # Results table with status badges
│   │   ├── ResultsSummary.jsx  # Summary statistics cards
│   │   └── StatusBadge.jsx     # Colour-coded status badge component
│   │
│   └── services/
│       ├── verificationService.js  # HTTP client for Flask API
│       └── mockVerification.js     # Local mock (not used in production)
│
└── backend/
    ├── app.py                  # Flask application and API routes
    ├── validator.py            # Email syntax and DNS/MX validation logic
    ├── requirements.txt        # Python dependencies
    ├── test_app.py             # Backend test suite
    └── README.md               # Backend-specific notes
```

---

## Prerequisites

- **Node.js** 18 or later — [nodejs.org](https://nodejs.org)
- **Python 3.10** or later — [python.org](https://python.org)
- **Git** — [git-scm.com](https://git-scm.com)

---

## Installation and Local Setup (Windows)

### 1. Clone the repository

```powershell
git clone https://github.com/ayeshasyed1409/MailCheck-Email-Deliverability-Checker.git
cd MailCheck-Email-Deliverability-Checker
```

### 2. Install frontend dependencies

```powershell
npm install
```

### 3. Set up the Python backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

---

## Running Locally

You need **two separate terminal windows** — one for the backend, one for the frontend.

### Terminal 1 — Start the Flask backend

```powershell
cd backend
venv\Scripts\activate
python app.py
```

The backend starts on **http://127.0.0.1:5000**.

### Terminal 2 — Start the React frontend

```powershell
npm run dev
```

The frontend starts on **http://localhost:5173**. Open this URL in your browser.

---

## API Documentation

### Base URL (local)

```
http://127.0.0.1:5000
```

---

### GET /api/health

Confirms the backend is running.

**Response**

```json
{
  "status": "ok",
  "message": "Email verification backend is running"
}
```

---

### POST /api/verify

Validates a batch of email addresses.

**Request**

```
POST /api/verify
Content-Type: application/json
```

```json
{
  "emails": [
    "alice@example.com",
    "invalid-email",
    "contact@organization.org"
  ]
}
```

**Constraints**

- `emails` must be a non-empty JSON array of strings
- Maximum **100 emails** per request

**Response (200 OK)**

```json
{
  "results": [
    {
      "email": "alice@example.com",
      "status": "Likely Delivered",
      "reason": "Valid syntax. MX records found for example.com.",
      "checks": {
        "syntax_valid": true,
        "mx_found": true
      }
    },
    {
      "email": "invalid-email",
      "status": "Likely to Bounce",
      "reason": "Invalid email syntax.",
      "checks": {
        "syntax_valid": false,
        "mx_found": false
      }
    }
  ]
}
```

**Error Response (400 Bad Request)**

```json
{
  "error": "Missing required field: 'emails'"
}
```

---

## Testing

### Backend tests

```powershell
cd backend
venv\Scripts\activate
python -m pytest test_app.py -v
```

### Manual API test (PowerShell)

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://127.0.0.1:5000/api/verify" `
  -ContentType "application/json" `
  -Body '{"emails": ["test@gmail.com", "bad@fake-domain-xyz.com"]}'
```

---

## Result Classifications

| Status | Meaning |
|---|---|
| **Likely Delivered** | The address has valid syntax **and** the domain has MX records. Mail servers are configured to receive email. |
| **Likely to Bounce** | The address has invalid syntax, or the domain has no MX records. Sending to this address will likely fail. |
| **Unknown** | The syntax is valid but the DNS lookup timed out or returned an inconclusive result. Delivery cannot be confirmed. |

---

## Limitations

- **MX record checks do not prove individual mailbox existence.** An MX record means the domain *can* receive email — it does not confirm that the specific username (e.g. `alice`) exists on that server.
- **DNS results can be cached or stale.** A recently added or removed MX record may not reflect immediately.
- **No SMTP handshake is performed.** This tool does not connect to the recipient's mail server and therefore cannot verify individual mailbox availability.
- **Catch-all addresses are undetectable.** Some domains accept all email regardless of username; these addresses will appear as "Likely Delivered".
- **Delivery is never guaranteed.** Spam filters, reputation scores, and server-side rules all affect final delivery independent of MX records.

---

## Security Considerations

- The backend enforces a maximum batch size of **100 emails per request** to prevent abuse.
- No email addresses are stored, logged, or persisted on the server.
- The backend exposes no stack traces or internal error details in HTTP responses.
- CORS is configured to allow only trusted origins (the Vercel frontend URL in production).

---

## Deployment

### Frontend — Vercel

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the following **Environment Variable** in the Vercel project settings:

   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://your-render-backend-url.onrender.com` |

4. Redeploy after adding the environment variable.

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com) pointing to the `backend/` folder.
2. Set the **Build Command** to:
   ```
   pip install -r requirements.txt
   ```
3. Set the **Start Command** to:
   ```
   python app.py
   ```
4. Add the environment variable `CORS_ALLOWED_ORIGINS` with the value of your Vercel frontend URL:
   ```
   https://your-vercel-app.vercel.app
   ```

> **Important:** After deploying the backend on Render, copy its public URL into the `VITE_API_BASE_URL` environment variable on Vercel, then redeploy the frontend.

---

## Local vs Production Behaviour

| Setting | Local Development | Production (Vercel + Render) |
|---|---|---|
| Frontend URL | `http://localhost:5173` | `https://your-app.vercel.app` |
| Backend URL | `http://127.0.0.1:5000` | Set via `VITE_API_BASE_URL` on Vercel |
| CORS origin | `localhost:5173` | Your Vercel URL (via `CORS_ALLOWED_ORIGINS`) |
