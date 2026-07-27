---
name: haia-ai
description: Use this skill whenever working on Haia's Gemini integration — prompt design, structured-output parsing, intent routing between conversational and item-logging messages, embeddings/semantic goal matching, photo/voice/document parsing, hallucination prevention, retry logic, or confidence-based fallback behavior. Trigger on Gemini, prompt, structured output, intent routing, embeddings, parsing, hallucination, or AI parsing. Read haia-architect first; read haia-backend for how validated output is persisted.
---

# Haia AI (Gemini Integration)

Covers everything that calls the Gemini API: text parsing, photo-to-task, voice note parsing, bulk syllabus import, COR/schedule photo parsing, semantic goal matching, and the unified chatbot's intent router and conversational replies.

## The one rule that matters most

**Structured Gemini output must pass Pydantic validation before it touches the database. Never write directly to the DB from raw model output.** This is true for every parsing task listed above — no exceptions for "simple" ones.

## Model selection

Default to **Flash-Lite**. Use full **Flash** only where the task's quality bar actually requires it (e.g. long-context syllabus extraction, nuanced conversational replies) — don't reach for the heavier model by default. If you're choosing a model, be able to say why Flash-Lite wasn't sufficient.

## Confidence and fallback

Every parsing path needs a defined behavior for low confidence or failed validation:

- **Never silently drop the message.**
- **Never guess** a value the model wasn't confident about and pass it through as if it were certain.
- On low confidence or schema mismatch → save as a raw/unparsed item the user can review and fix manually, rather than either dropping it or inventing structure. Surface this to the user in-tone (see `haia-product`), e.g. "Couldn't quite parse that — try rephrasing?"
- For genuinely ambiguous conversational input, prefer asking a clarifying follow-up over guessing which of two plausible interpretations to log.

## Prompt management

- Every prompt (text parsing, photo, voice, syllabus, schedule/COR, intent routing, conversational assistant) lives in a **versioned, reviewable file** — not an inline string buried in a service function.
- Treat prompt edits like code changes: diffable, reviewable, with a reason for the change noted in the commit.
- When a parsing task has a dedicated prompt file, new logic for that task should read from it rather than duplicating a near-identical prompt inline elsewhere.

## Intent routing (unified chatbot)

Every incoming message — from Telegram or in-app chat — hits the same classification step:

1. Gemini classifies the message as **(a)** a new task/habit/goal to log, or **(b)** a conversational question/request.
2. **(a)** → same structured extraction/saving pipeline used everywhere else (parsed → Pydantic-validated → saved).
3. **(b)** → conversational assistant path (below).

Do not build a separate, simpler parser for one channel "for now" — both channels share this router and the same downstream logic. See `haia-backend` for the channel-agnostic endpoint rule this depends on.

## Conversational assistant — must be grounded, never generic

Replies to things like "how am I doing this week," "what should I prioritize today," "motivate me" must be generated using a **live snapshot** of the user's actual tasks, goals, streaks, and XP pulled from Supabase at request time, plus recent chat history — never a generic, context-free pep-talk. If the live snapshot can't be fetched, that's a fallback/error case (see `haia-backend` error handling), not a reason to answer without it.

Chat history is stored per **user**, not per channel (`chat_messages` table), so a conversation started on Telegram continues seamlessly on web.

## Photo / voice / document parsing

- **Photo-to-task** (whiteboard, assignment sheet): Gemini vision → structured tasks, same downstream validation pipeline as text parsing.
- **Voice note parsing**: transcription + parsing in a single Gemini call where possible, rather than a separate transcription step feeding a second parsing call, unless accuracy demands splitting them.
- **Bulk syllabus import**: uses Gemini's long-context window to extract every deadline from a full syllabus in one pass — this is one of the few cases where Flash (not Flash-Lite) is likely justified given the volume and nuance of what's being extracted.
- **Schedule/COR photo parsing**: extracts structured course data — code, section, days, time, room, modality, instructor — which then branches to (a) the PNG schedule renderer and (b) Google Calendar event creation. Get the schema right here since two downstream systems depend on it; test blurry/partial photos and non-standard COR formats explicitly (see `haia-testing`).

## Semantic goal matching

Use Gemini embeddings to compare new tasks against existing goals and suggest which goal a task contributes to. This is a **suggestion**, not an automatic assignment — don't silently attach a task to a goal without the association being visible/reversible. No hardcoded keyword rules; this is explicitly an embeddings-based approach per the architecture.

## Retry and rate-limit handling

- Gemini calls can fail (timeout, rate limit, malformed JSON back). Handle explicitly — retry with backoff where appropriate, or fail into the confidence/fallback path above. Never let an unhandled exception from the Gemini call crash the request (see `haia-backend`).

## Testing

- Mock Gemini in all tests — never make live calls to the paid/rate-limited API from a test suite.
- Test malformed-JSON-from-Gemini as an explicit failure case, not just the happy path. See `haia-testing` for the full cross-cutting scenario list (channel parity, gamification correctness, calendar edge cases, schedule/COR parsing edge cases).