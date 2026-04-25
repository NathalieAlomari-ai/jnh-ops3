# Workflows

This directory contains Markdown SOP (Standard Operating Procedure) files — one per automation task.

## Purpose

Each workflow file defines the full instructions for a specific task:

- **Objective** — what the task accomplishes
- **Required inputs** — what data or parameters are needed before starting
- **Tools to use** — which scripts in `tools/` to call and in what order
- **Expected outputs** — what a successful run produces
- **Edge cases** — how to handle failures, rate limits, or unexpected data

## How to use

When an agent receives a task, it reads the relevant workflow here first, then executes the corresponding tools in `tools/` in the correct sequence. Workflows are the source of truth for *how* a task should be done.

## Maintenance

Workflows should evolve as the system learns. When a better method is found, a constraint is discovered, or a recurring issue is resolved, update the relevant workflow file. These are living documents.

Do not delete or overwrite a workflow without explicit instruction — they encode hard-won knowledge about how each task actually works in practice.
