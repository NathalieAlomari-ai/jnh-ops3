# Workflow: Notify Meeting Attendees

## Objective
Send a formatted HTML email to every attendee when a new meeting is scheduled in the JNH Operations Platform.

---

## When to Run
Run this workflow immediately after a meeting is created — either triggered manually or by the n8n webhook that fires on the `meeting.scheduled` event (see `src/lib/webhook.ts`).

---

## Required Inputs

| Input | Source | Example |
|---|---|---|
| `title` | meeting object | `"Weekly Sync"` |
| `date` | meeting object | `"2026-04-28"` |
| `time` | meeting object | `"10:00"` |
| `notes` | meeting object (optional) | `"Q2 review, action items"` |
| `emails` | attendee list — join each attendee's email into a comma-separated string | `"alice@jnh.com,bob@jnh.com"` |

Attendee emails come from the `profiles` table (via `whatsapp_number` or `email` column). Use the `email` field from each profile record that appears in the meeting's `attendees` JSONB array.

---

## Environment Variables
These must be present in `.env` before running:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=ops@yourdomain.com
```

`FROM_EMAIL` must be a verified sender domain in your Resend account.

---

## Tool to Run

```bash
python tools/send_meeting_email.py \
  --title  "<meeting title>" \
  --date   "<yyyy-MM-dd>" \
  --time   "<HH:mm>" \
  --emails "<comma-separated emails>" \
  --notes  "<optional notes>"
```

### Full example

```bash
python tools/send_meeting_email.py \
  --title  "Weekly Sync" \
  --date   "2026-04-28" \
  --time   "10:00" \
  --emails "alice@jnh.com,bob@jnh.com" \
  --notes  "Agenda: Q2 review, blockers, action items"
```

The script prints one status line per recipient:
```
✅ Email sent to: alice@jnh.com
✅ Email sent to: bob@jnh.com
```

Exit code `0` means all succeeded. Exit code `1` means at least one failed.

---

## Handling Failures

**Partial failure** (some emails sent, some failed):
- The script prints `❌ Failed: <email> — <reason>` to stderr for each failure.
- Exit code will be `1`.
- Re-run the script with only the failed addresses in `--emails` — already-sent recipients won't receive duplicates because Resend deduplicates by recipient+subject within a short window.

**All failed / auth error**:
- Verify `RESEND_API_KEY` is valid: log in to resend.com → API Keys.
- Verify `FROM_EMAIL` domain is verified in Resend → Domains.
- Check for network connectivity to `api.resend.com`.

**No emails in attendee list**:
- Confirm the meeting's attendee profiles have `email` set in the `profiles` table.
- Run a quick check: `SELECT id, full_name, email FROM profiles WHERE id = ANY('{...}'::uuid[]);`

---

## Notes
- The script has no external Python dependencies — it uses only the standard library (`urllib`, `argparse`, `json`, `os`). No `pip install` needed.
- If notes are empty or whitespace-only, the Notes section is omitted from the email automatically.
- The HTML email is responsive and renders correctly in Gmail, Outlook, and Apple Mail.
