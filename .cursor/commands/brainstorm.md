---
name: brainstorm
description: Generates focused ideas and options without overwhelming the user. Use when the user asks to brainstorm, explore options, compare approaches, name something, or wants creative directions before deciding.
---

# Brainstorm

Keep it light. The goal is momentum and a clear choice — not a wall of possibilities.

## Before responding

1. **Restate the goal** in one sentence (rewrite the ask; don't interrogate).
2. **Note constraints** only if the user gave them or they're obvious from context.
3. **Ask at most one question** — and only if you truly cannot produce useful options without it. Otherwise skip and state assumptions briefly.

## How many ideas

| Request | Ideas |
|---------|-------|
| Quick / "give me a few" | 3 |
| Default | 3–5 |
| "Go wide" / explicit breadth | 5–7 max |

Never exceed 7 in one pass. Offer a follow-up round instead of dumping more.

## Idea quality bar

Each idea should be:
- **Distinct** — not the same idea reworded
- **Concrete** — enough detail to compare (one line of "what it is" + one line of tradeoff)
- **Honest** — include a real downside or risk, not only upsides

Skip filler ("it depends", generic platitudes). Skip research rabbit holes unless the user asked for it.

## Emoji guide

Use a **fixed, small set** — section headers and field labels only. No emoji on every bullet or sentence.

| Use | Emoji |
|-----|-------|
| Goal | 🎯 |
| Assumptions | 📌 |
| Options (section) | 💡 |
| What | 🔹 |
| Pros | ✅ |
| Cons | ⚠️ |
| Recommendation | ⭐ |
| Next step | 👉 |

## Response structure

Use this template every time:

```markdown
## 🎯 Goal
[One sentence]

## 📌 Assumptions
- [Only if needed; 1–3 bullets max]

## 💡 Options

### 1. [Short name]
🔹 **What:** [1 sentence]
✅ **Pros:** [1–2 bullets]
⚠️ **Cons:** [1 bullet]

### 2. [Short name]
...

## ⭐ Recommendation
**[Pick one option]** — [2–3 sentences: why it fits best *for this goal*, what to watch out for]

## 👉 Next step
[One concrete action or one narrowing question — not both unless the question is trivial]
```

## Grouping (optional)

Use sections only when the ask has clear dimensions (e.g. "names" vs "features", or "quick wins" vs "bigger bets"). Max 2 groups.

## Modes

Adjust tone and depth to the trigger:

- **Naming / branding** → short list, say each name aloud in your head; avoid awkward collisions
- **Feature / product** → user value + implementation cost in one line each
- **Technical approach** → tradeoffs over buzzwords; one recommended path
- **Writing / content angles** → hook + audience fit

## Don't

- Don't produce tables with 10+ rows
- Don't list "hybrid of all options" as its own option unless it's genuinely best
- Don't end with "let me know if you want more" — use the **👉 Next step** section instead
- Don't brainstorm and implement in the same response unless asked
- Don't sprinkle random emojis — stick to the emoji guide above
