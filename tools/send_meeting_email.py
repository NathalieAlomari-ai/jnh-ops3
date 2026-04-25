#!/usr/bin/env python3
"""
tools/send_meeting_email.py
───────────────────────────
Sends a meeting-notification email to one or more recipients via the Resend API.

Usage:
    python tools/send_meeting_email.py \
        --title  "Weekly Sync" \
        --date   "2026-04-28" \
        --time   "10:00" \
        --emails "alice@example.com,bob@example.com" \
        [--notes "Agenda: Q2 review, action items"]

Environment variables (loaded from .env):
    RESEND_API_KEY   – your Resend secret key  (required)
    FROM_EMAIL       – verified sender address  (required)

Exit codes:
    0 – all emails sent successfully
    1 – one or more emails failed
"""

import argparse
import os
import sys
import urllib.request
import urllib.error
import json

from pathlib import Path


# ── Load .env ────────────────────────────────────────────────────────────────

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


# ── HTML template ─────────────────────────────────────────────────────────────

def build_html(title: str, date: str, time: str, emails: list[str], notes: str) -> str:
    attendees_html = "".join(
        f'<li style="margin: 4px 0; color: #374151;">{email}</li>'
        for email in emails
    )

    notes_section = ""
    if notes.strip():
        notes_section = f"""
        <tr>
          <td style="padding: 0 32px 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600;
                      text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">
              Notes
            </p>
            <p style="margin: 0; font-size: 15px; color: #374151;
                      white-space: pre-wrap; line-height: 1.6;">
              {notes}
            </p>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Scheduled</title>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; background: #ffffff;
                                    border-radius: 12px; overflow: hidden;
                                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
                        padding: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 28px;">📅</p>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;
                          color: #ffffff; letter-spacing: -0.01em;">
                Meeting Scheduled
              </h1>
            </td>
          </tr>

          <!-- Meeting title -->
          <tr>
            <td style="padding: 32px 32px 0;">
              <h2 style="margin: 0; font-size: 22px; font-weight: 700;
                          color: #111827; letter-spacing: -0.01em;">
                {title}
              </h2>
            </td>
          </tr>

          <!-- Date / time highlight box -->
          <tr>
            <td style="padding: 20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: #eff6ff; border: 1.5px solid #bfdbfe;
                              border-radius: 10px; padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 32px;">
                          <p style="margin: 0 0 2px; font-size: 11px; font-weight: 600;
                                    text-transform: uppercase; letter-spacing: 0.08em;
                                    color: #3b82f6;">
                            Date
                          </p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700;
                                    color: #1d4ed8;">
                            {date}
                          </p>
                        </td>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 11px; font-weight: 600;
                                    text-transform: uppercase; letter-spacing: 0.08em;
                                    color: #3b82f6;">
                            Time
                          </p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700;
                                    color: #1d4ed8;">
                            {time}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Attendees -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600;
                        text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">
                Attendees
              </p>
              <ul style="margin: 0; padding-left: 18px;">
                {attendees_html}
              </ul>
            </td>
          </tr>

          <!-- Notes (conditional) -->
          {notes_section}

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This message was sent from JNH Operations Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


# ── Resend API call ───────────────────────────────────────────────────────────

def send_email(api_key: str, from_email: str, to_email: str,
               subject: str, html: str) -> tuple[bool, str]:
    """
    POST to Resend /emails.
    Returns (success: bool, detail: str).
    """
    payload = json.dumps({
        "from":    from_email,
        "to":      [to_email],
        "subject": subject,
        "html":    html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
            "User-Agent":    "Mozilla/5.0 (compatible; JNH-Ops/1.0)",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return True, resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return False, f"HTTP {exc.code}: {body}"
    except urllib.error.URLError as exc:
        return False, str(exc.reason)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Send a meeting-notification email via Resend."
    )
    parser.add_argument("--title",  required=True,  help="Meeting title")
    parser.add_argument("--date",   required=True,  help="Meeting date (yyyy-MM-dd)")
    parser.add_argument("--time",   required=True,  help="Meeting time (HH:mm)")
    parser.add_argument("--emails", required=True,  help="Comma-separated recipient email addresses")
    parser.add_argument("--notes",  default="",     help="Optional meeting notes / agenda")
    args = parser.parse_args()

    api_key    = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("FROM_EMAIL", "").strip()

    if not api_key:
        print("❌ RESEND_API_KEY is not set. Add it to .env and try again.", file=sys.stderr)
        return 1
    if not from_email:
        print("❌ FROM_EMAIL is not set. Add it to .env and try again.", file=sys.stderr)
        return 1

    emails  = [e.strip() for e in args.emails.split(",") if e.strip()]
    if not emails:
        print("❌ No valid email addresses provided.", file=sys.stderr)
        return 1

    subject  = f"Meeting Scheduled: {args.title}"
    html     = build_html(args.title, args.date, args.time, emails, args.notes)

    any_failed = False
    for email in emails:
        success, detail = send_email(api_key, from_email, email, subject, html)
        if success:
            print(f"✅ Email sent to: {email}")
        else:
            print(f"❌ Failed: {email} — {detail}", file=sys.stderr)
            any_failed = True

    return 1 if any_failed else 0


if __name__ == "__main__":
    sys.exit(main())
