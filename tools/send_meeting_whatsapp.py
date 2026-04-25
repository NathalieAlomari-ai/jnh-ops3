#!/usr/bin/env python3
"""
tools/send_meeting_whatsapp.py
──────────────────────────────
Sends a WhatsApp meeting notification to one or more phone numbers via the
Twilio API.

Usage:
    python tools/send_meeting_whatsapp.py \
        --title  "Weekly Sync" \
        --date   "2026-04-28" \
        --time   "10:00" \
        --phones "+9661234567890,+9669876543210" \
        [--notes "Agenda: Q2 review, action items"]

Phone numbers must be in international format (e.g. +9661234567890).
Numbers that are missing the leading '+' are skipped with a warning.

Environment variables (loaded from .env / .env.local):
    TWILIO_ACCOUNT_SID      – Twilio Account SID   (required)
    TWILIO_AUTH_TOKEN       – Twilio Auth Token     (required)
    TWILIO_WHATSAPP_FROM    – WhatsApp-enabled number without 'whatsapp:' prefix
                              e.g. +14155238886     (required)

Exit codes:
    0 – all messages sent successfully
    1 – one or more messages failed (or a required env var is missing)
"""

import argparse
import base64
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
import json

from pathlib import Path


# ── Load .env / .env.local ────────────────────────────────────────────────────

def load_dotenv(path: Path) -> None:
    """Minimal .env loader — no external dependency required."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:  # don't overwrite real env vars
            os.environ[key] = value


# Load both .env and .env.local (this project uses .env.local)
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")
load_dotenv(_root / ".env.local")


# ── Message template ──────────────────────────────────────────────────────────

def build_message(title: str, date: str, time: str, notes: str) -> str:
    lines = [
        "📅 *Meeting Scheduled*",
        "",
        f"*{title}*",
        f"📆 Date: {date}",
        f"⏰ Time: {time}",
    ]

    if notes.strip():
        lines.append("")
        lines.append(notes.strip())

    lines.append("")
    lines.append("_Sent from JNH Ops Platform_")

    return "\n".join(lines)


# ── Phone number validation ───────────────────────────────────────────────────

def validate_phone(raw: str) -> tuple[bool, str]:
    """
    Returns (is_valid, cleaned_number).
    Expects international format starting with '+'.
    Strips spaces and dashes for leniency, but requires the '+' prefix.
    """
    cleaned = raw.strip().replace(" ", "").replace("-", "")
    if not cleaned.startswith("+"):
        return False, cleaned
    if len(cleaned) < 8:          # '+' + at least 7 digits
        return False, cleaned
    if not cleaned[1:].isdigit():
        return False, cleaned
    return True, cleaned


# ── Twilio API call ───────────────────────────────────────────────────────────

def send_whatsapp(account_sid: str, auth_token: str, from_number: str,
                  to_number: str, body: str) -> tuple[bool, str]:
    """
    POST to Twilio Messages API.
    Returns (success: bool, detail: str).

    'from_number' and 'to_number' should already be in international format
    with '+'. This function prepends 'whatsapp:' before sending.
    """
    url = (
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    )

    payload = urllib.parse.urlencode({
        "From": f"whatsapp:{from_number}",
        "To":   f"whatsapp:{to_number}",
        "Body": body,
    }).encode("utf-8")

    # Twilio uses HTTP Basic Auth: SID as username, token as password
    credentials = base64.b64encode(
        f"{account_sid}:{auth_token}".encode("utf-8")
    ).decode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type":  "application/x-www-form-urlencoded",
            "User-Agent":    "Mozilla/5.0 (compatible; JNH-Ops/1.0)",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            response_body = resp.read().decode("utf-8")
            data = json.loads(response_body)
            return True, data.get("sid", "ok")
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        try:
            err = json.loads(body_text)
            detail = err.get("message", body_text)
        except json.JSONDecodeError:
            detail = body_text
        return False, f"HTTP {exc.code}: {detail}"
    except urllib.error.URLError as exc:
        return False, str(exc.reason)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Send a WhatsApp meeting notification via Twilio."
    )
    parser.add_argument("--title",  required=True, help="Meeting title")
    parser.add_argument("--date",   required=True, help="Meeting date (yyyy-MM-dd)")
    parser.add_argument("--time",   required=True, help="Meeting time (HH:mm)")
    parser.add_argument("--phones", required=True,
                        help="Comma-separated phone numbers in international format")
    parser.add_argument("--notes",  default="",   help="Optional meeting notes / agenda")
    args = parser.parse_args()

    account_sid  = os.environ.get("TWILIO_ACCOUNT_SID",   "").strip()
    auth_token   = os.environ.get("TWILIO_AUTH_TOKEN",    "").strip()
    from_number  = os.environ.get("TWILIO_WHATSAPP_FROM", "").strip()

    missing = [
        name for name, val in [
            ("TWILIO_ACCOUNT_SID",   account_sid),
            ("TWILIO_AUTH_TOKEN",    auth_token),
            ("TWILIO_WHATSAPP_FROM", from_number),
        ]
        if not val
    ]
    if missing:
        for name in missing:
            print(f"❌ {name} is not set. Add it to .env.local and try again.",
                  file=sys.stderr)
        return 1

    # Ensure from_number has the '+' prefix
    if not from_number.startswith("+"):
        from_number = "+" + from_number

    raw_phones = [p.strip() for p in args.phones.split(",") if p.strip()]
    if not raw_phones:
        print("❌ No phone numbers provided.", file=sys.stderr)
        return 1

    message    = build_message(args.title, args.date, args.time, args.notes)
    any_failed = False

    for raw in raw_phones:
        valid, phone = validate_phone(raw)
        if not valid:
            print(f"⚠️  Skipped invalid number: '{raw}' — must start with '+' in international format",
                  file=sys.stderr)
            any_failed = True
            continue

        success, detail = send_whatsapp(account_sid, auth_token, from_number, phone, message)
        if success:
            print(f"✅ WhatsApp sent to: {phone}")
        else:
            print(f"❌ Failed: {phone} — {detail}", file=sys.stderr)
            any_failed = True

    return 1 if any_failed else 0


if __name__ == "__main__":
    sys.exit(main())
