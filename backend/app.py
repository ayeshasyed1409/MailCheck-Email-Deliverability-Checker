"""MailCheck Flask Backend Application

Part 2: Email Deliverability Checker REST API
Provides endpoints for health checking and email deliverability analysis
using RFC syntax validation and DNS/MX record lookups.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from validator import verify_email

# Maximum number of email addresses allowed per validation batch
MAX_BATCH_SIZE = 100

# Permitted CORS origins for local frontend development
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


def create_app(test_config=None) -> Flask:
    """Application factory for the Flask app."""
    app = Flask(__name__)

    if test_config:
        app.config.update(test_config)

    # Configure CORS - allows frontend on Vite dev server to connect
    allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS")
    if allowed_origins:
        origins_list = [o.strip() for o in allowed_origins.split(",") if o.strip()]
    else:
        origins_list = DEFAULT_ORIGINS

    CORS(
        app,
        resources={r"/api/*": {"origins": origins_list}},
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    # -------------------------------------------------------------------------
    # Route: GET /api/health
    # -------------------------------------------------------------------------
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint confirming that the backend service is running."""
        return (
            jsonify({
                "status": "ok",
                "message": "Email verification backend is running",
            }),
            200,
        )

    # -------------------------------------------------------------------------
    # Route: POST /api/verify
    # -------------------------------------------------------------------------
    @app.route("/api/verify", methods=["POST"])
    def verify_batch():
        """Validates a batch of email addresses and evaluates their deliverability status.

        Expects JSON payload:
            {"emails": ["alice@example.com", "bob@domain.org"]}

        Returns JSON:
            {"results": [...]}
        """
        # Ensure client sent a JSON body
        if not request.is_json:
            return (
                jsonify({
                    "error": "Invalid request: Content-Type must be 'application/json'",
                }),
                400,
            )

        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return (
                jsonify({
                    "error": "Invalid request: Request body must be a valid JSON object",
                }),
                400,
            )

        # Validate that 'emails' field exists
        if "emails" not in data:
            return (
                jsonify({
                    "error": "Missing required field: 'emails'",
                }),
                400,
            )

        emails = data["emails"]

        # Validate that 'emails' is a list
        if not isinstance(emails, list):
            return (
                jsonify({
                    "error": "Invalid field type: 'emails' must be a list of strings",
                }),
                400,
            )

        # Validate that 'emails' list is not empty
        if len(emails) == 0:
            return (
                jsonify({
                    "error": "Invalid request: 'emails' list cannot be empty",
                }),
                400,
            )

        # Validate maximum batch size
        if len(emails) > MAX_BATCH_SIZE:
            return (
                jsonify({
                    "error": f"Batch limit exceeded: Maximum allowed is {MAX_BATCH_SIZE} emails per request (received {len(emails)})",
                }),
                400,
            )

        # Validate that all elements in the list are strings
        for index, item in enumerate(emails):
            if not isinstance(item, str):
                return (
                    jsonify({
                        "error": f"Invalid email at index {index}: All items in 'emails' list must be strings",
                    }),
                    400,
                )

        # Process each address in order, never failing the whole batch for one email
        results = []
        for raw_email in emails:
            result = verify_email(raw_email)
            results.append(result)

        return jsonify({"results": results}), 200

    # -------------------------------------------------------------------------
    # Safe error handlers (no traceback exposure)
    # -------------------------------------------------------------------------
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": str(error.description if hasattr(error, 'description') else "Bad request")}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "HTTP method not allowed for this endpoint"}), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "An internal server error occurred"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1")
    print(f"Starting MailCheck Flask Backend on port {port} (Debug: {debug_mode})...")
    app.run(host="127.0.0.1", port=port, debug=debug_mode)
