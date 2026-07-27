---
name: haia-frontend
description: Use this skill whenever writing or modifying Haia's Next.js/React web dashboard — components, sidebar navigation, layout, styling, or any UI-facing copy. Trigger on Next.js, React, UI, dashboard, component, sidebar, page, or styling. Critical for terminology — always consult this before writing any user-facing string (task/quest, points/XP, etc.) so the game framing stays consistent. Read haia-architect first for overall structure and haia-product for tone/UX philosophy.
---

# Haia Frontend (Next.js + React)

Covers everything under `/web`. Assumes `haia-architect` has been read for overall structure. For *how the app should feel* (not just what words to use), also read `haia-product`.

## Structure

- One component per file; filename matches the component name (`PascalCase`).
- `camelCase` for variables/functions, `PascalCase` for components.
- Shared types between frontend and backend have **one source of truth** — generate frontend types from backend Pydantic models, or keep a shared schema definition. Never hand-duplicate a type shape in both places; it will drift.

## Sidebar — 6 tabs, in this order

1. **Home** — daily landing. Today's tasks/deadlines, current streaks, XP bar/level up top, quick-capture box (same casual-input style as the Telegram bot). Should feel like opening a game, not checking a chore list.
2. **Quests** — full task/deadline view. Filterable by School, Personal, or All. Each item shows XP value and source (typed, Telegram, email, photo). Completing here is the primary way XP is earned.
3. **Habits** — recurring personal habits, separate from one-off tasks. Own streak counter + visual consistency heatmap per habit.
4. **Goals** — longer-term targets fed by linked tasks/habits, so day-to-day effort visibly rolls up.
5. **Schedule** — weekly timetable from COR/schedule-photo data. Week and day views, PNG export, Google Calendar sync status.
6. **Haia (chat)** — full conversation thread with the AI assistant, same one available via Telegram. Persistent history + a few quick-action prompts.

Profile menu (bottom of sidebar): **Character Sheet** (level, XP growth, badges/achievements, lifetime stats), **Appearance** (predefined color themes), **Settings & Integrations** (Telegram link, Google Calendar connection, email-forwarding address, semester dates, notification prefs).

## Terminology — non-negotiable

Code-level naming (variables, table names, API routes) does not need to mirror these — but **every user-facing string** must use the game framing, never generic to-do-app language:

| Never say | Always say |
|---|---|
| Tasks (as a tab/section label) | **Quests** |
| Points | **XP** |
| Profile / Stats page | **Character Sheet** |
| Streak (fine as-is, keep it) | **Streak** |
| Rank / Tier | **Level** |

If you're about to write a button label, empty state, tooltip, notification, or heading and it uses "task," "points," "profile," or similar generic productivity-app language, rewrite it before shipping. This applies to loading states and error copy too — see `haia-product` for the tone those should carry.

## Component guidance

- Anything with logic (XP bar calculation, streak heatmap rendering, Quests filter logic) should be a distinct, testable component — don't bury calculation logic inside JSX.
- Realtime updates (task completed elsewhere → XP bar should update) come from Supabase Realtime; don't build a separate polling mechanism.
- The quick-capture box on Home should mirror the casual, low-friction feel of texting the Telegram bot — not a multi-field form.

## Styling

- No specific CSS framework mandated in the architecture doc beyond "predefined color themes" for Appearance — if Tailwind/shadcn is already in use in the repo, stay consistent with it rather than introducing a second styling approach. Check the existing codebase before picking a new one.
- Consult `frontend-design` skill (if available in this environment) for broader visual-design judgment — distinctive typography, avoiding templated-default look — when building new UI from scratch.

## Before calling a frontend feature done

- Component tests for anything with logic (XP bar calc, streak heatmap, Quests filters).
- At least one end-to-end test per main tab covering its primary user action (e.g. completing a quest → XP updates). See `haia-testing`.
- Manually walk through the feature in the actual UI at least once — automated tests don't replace confirming the experience *feels* like the gamified UX this project is going for.