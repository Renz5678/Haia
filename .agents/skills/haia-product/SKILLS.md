---
name: haia-product
description: Use this skill whenever making a product or UX decision for Haia — writing user-facing copy (notifications, empty states, error messages, onboarding), designing a gamification mechanic (XP values, streaks, rewards, badges), deciding how much friction an interaction should have, or judging whether a feature "feels" right for the app. Trigger on tone, copywriting, UX, gamification, notification text, reward, onboarding, or "does this feel right." This is the taste and philosophy layer — consult it alongside haia-frontend (which enforces terminology) whenever writing anything the user will read, and alongside haia-ai when designing conversational replies.
---

# Haia Product Philosophy

Haia exists because plain to-do apps feel like homework. The whole premise is that momentum and a bit of adrenaline beat a quiet, guilt-inducing checklist. "Haia" itself is meant to land like a ninja battle-cry — every design and copy decision should be checked against whether it holds that energy or quietly reverts to generic productivity-app blandness.

## The core test for any UX decision

**Does this feel exciting, or does it feel like homework?** If a screen, flow, or piece of copy could be lifted unchanged into a generic to-do app, it's not done yet — find the version that only makes sense for Haia.

A second useful test for any screen: **does it answer "what should I do next?"** Home in particular should never leave the user staring at a wall of data with no clear next action.

## Principles

- **Conversation before forms.** The primary way to add something is to say it casually — typed into a quick-capture box or texted to the bot — the same way you'd text a friend. Multi-field forms are a fallback for editing/correcting, not the default input method.
- **Reduce friction wherever the AI can absorb it.** If Gemini can infer the subject, due date, or type from what the user said, don't ask them to also pick it from a dropdown "just in case."
- **Celebrate progress, don't just log it.** Completing a quest, hitting a streak milestone, or leveling up should feel like a moment, not a silent status change — a number ticking up somewhere the user has to go look for it isn't enough on its own.
- **Encouraging language, never guilt.** Missed a day on a streak? Don't scold or shame the reset — frame it as a comeback, not a failure. Avoid language that makes the user feel bad for not opening the app (no "You've abandoned 5 quests!" energy).
- **Every screen should answer "what should I do next?"** — especially Home. If a redesign leaves that question unanswered, it's not finished.

## Copywriting rules

- Use the app's terminology consistently — Quests (not tasks), XP (not points), Character Sheet (not profile/stats), Level, Streak. See `haia-frontend` for the full terminology table; this skill covers *why* it matters (consistency reinforces the game framing) and the tone around it.
- **Errors and failures are in-tone, not clinical.** "Couldn't quite parse that — try rephrasing?" beats "Error: parsing failed" or a raw stack trace, every time. This applies everywhere — chat replies, dashboard toasts, Telegram bot responses.
- **Notification copy nudges, it doesn't nag.** A deadline reminder should feel like a teammate giving you a heads-up, not a passive-aggressive ping.
- **Conversational assistant replies are grounded, specific, and a little bit hyped** — not generic motivational-poster text. "You've hit a 6-day streak on Workouts and you're 2 quests from leveling up — one more push today" beats "You're doing great, keep it up!" Grounding comes from the live Supabase snapshot (see `haia-ai`); tone comes from this skill.

## Gamification design

- **Bigger/harder items are worth more XP.** Don't flatten everything to the same point value — effort and difficulty should visibly matter.
- **Consistency is rewarded**, not just raw completion count — streaks exist specifically to make showing up repeatedly feel distinct from a one-off burst.
- **Goals are the payoff layer above day-to-day quests/habits** — completing a quest should visibly feed into something bigger the user is working toward, not disappear into a list the moment it's checked off.
- **Character Sheet is the "look how far I've come" screen** — level, XP growth over time, badges/achievements, lifetime stats (longest streak, total quests completed). This is a reward screen, not a settings screen; design and copy on it should feel like a payoff.
- **Appearance customization (color themes) is itself a small reward** in a gamified system — unlockable/expressive personalization reinforces progress, it's not just a preference toggle.

## When designing a new mechanic or flow

Before finalizing, check it against:
1. Does it use conversation/casual input over a form wherever possible?
2. Does completing/progressing produce a moment, not just a silent state change?
3. Is the copy encouraging and in-tone, with zero guilt-tripping language?
4. Does it use the correct terminology (Quests/XP/Character Sheet/Level/Streak)?
5. If it's a screen, does it make clear what to do next?

If a proposed feature fails several of these, it's probably drifting toward "generic productivity app" and is worth reconsidering before implementation, not just softening the copy afterward.