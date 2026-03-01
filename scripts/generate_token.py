"""
SignalIQ — Stream Token Generator

Generates Stream user tokens for testing.
Run this to get a token that lets you join a call from the browser test page.

Usage:
    python scripts/generate_token.py
"""

import os
import sys
import time
import hashlib
import hmac
import json
import base64

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()


def generate_stream_token(user_id: str, api_key: str, api_secret: str, expiry_hours: int = 24) -> str:
    """Generate a Stream user token using JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "user_id": user_id,
        "iat": now,
        "exp": now + (expiry_hours * 3600),
    }

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    header_b64 = b64url(json.dumps(header).encode())
    payload_b64 = b64url(json.dumps(payload).encode())
    signature = hmac.new(
        api_secret.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256,
    ).digest()
    signature_b64 = b64url(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def main():
    api_key = os.environ.get("STREAM_API_KEY", "")
    api_secret = os.environ.get("STREAM_API_SECRET", "")

    if not api_key or not api_secret or "your_" in api_key:
        print("❌ STREAM_API_KEY and STREAM_API_SECRET must be set in .env")
        print("   Get them from: https://dashboard.getstream.io")
        sys.exit(1)

    # Generate tokens for test users
    prospect_token = generate_stream_token("prospect-user", api_key, api_secret)
    agent_token = generate_stream_token("signaliq-agent", api_key, api_secret)

    print("=" * 60)
    print("  SignalIQ — Stream Test Tokens")
    print("=" * 60)
    print()
    print(f"  API Key:        {api_key}")
    print()
    print(f"  Prospect Token: {prospect_token}")
    print(f"  Agent Token:    {agent_token}")
    print()
    print(f"  Test Call ID:   signaliq-test-1")
    print()
    print("  Paste these into the Test Call page at:")
    print("  http://localhost:3000/test-call")
    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
