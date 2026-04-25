# Tools

This directory contains Python scripts that perform deterministic, repeatable execution — the actual work in the WAT framework.

## Purpose

Each script handles one specific operation:

- **API calls** — fetching data from external services
- **Data transformations** — parsing, cleaning, reshaping data
- **File operations** — reading, writing, moving files
- **Database queries** — reading from or writing to databases

Scripts are designed to be consistent, testable, and fast. They do not make decisions — that is the agent's job. They simply execute what they are told.

## Credentials

API keys and secrets are stored in `.env` at the project root. Scripts read from there at runtime. Never hardcode credentials inside a script.

## How to use

Workflows in `workflows/` specify which tools to call and with what inputs. Before building a new script, check whether an existing one already covers the task. Only create something new when nothing fits.

## Maintenance

When a script fails, read the full error, fix the root cause, verify the fix works, then update the relevant workflow in `workflows/` with anything learned (rate limits, API quirks, changed endpoints). Each fix should make the system more robust for next time.
