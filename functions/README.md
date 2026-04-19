# Functions — AI Advisor Backend

Firebase Cloud Functions for the real-estate advisor agent.

## What's here

| File | Purpose |
|---|---|
| `src/index.ts` | Callable functions: `askAdvisor`, `seedLegalLibrary` |
| `src/systemPrompt.ts` | Long, stable system prompt (cached at Anthropic) |
| `src/legal/retrieval.ts` | Keyword + topic-tag ranking over Firestore `/legalLibrary` |
| `src/tools/portfolio.ts` | Claude tools that read the caller's Firestore data (read-only) |
| `src/types.ts` | Shared types (intent/quality tags, audit-log entry, etc.) |

Seed data lives at `../src/scripts/seedLegalLibrary.json` (6 starter UAE laws). Ingest via the `seedLegalLibrary` callable (admin only).

## One-time setup

```bash
# 1. Upgrade your Firebase project to Blaze (pay-as-you-go). Spark (free) does not allow outbound network calls from Cloud Functions — required to reach api.anthropic.com.
#    https://console.firebase.google.com/project/<your-project>/usage/details

# 2. Install SDKs
cd functions
npm install

# 3. Set the Anthropic API key as a Firebase Function secret (NOT env var in .env)
firebase functions:secrets:set ANTHROPIC_API_KEY
# paste the key when prompted

# 4. Log in + select project (if not done)
firebase login
firebase use <your-project-id>
```

## Deploy

```bash
# From the repo root:
firebase deploy --only functions

# Or deploy only one function:
firebase deploy --only functions:askAdvisor
```

## Seed the legal library (one-time, admin-only)

From the browser console on the deployed app, while signed in as an admin user:

```js
const fn = firebase.functions().httpsCallable('seedLegalLibrary')
const laws = await fetch('/my-web-app/src/scripts/seedLegalLibrary.json').then(r => r.json()).then(d => d.laws)
await fn({ laws })
// → { data: { seeded: 6 } }
```

Or via the Firebase Console → Firestore, manually add docs under `/legalLibrary/{lawId}` matching the JSON shape.

## Local testing with the emulator

```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore,auth
```

Point the client at the emulator by adding this in `src/firebase/config.js` (dev only):

```js
import { connectFunctionsEmulator } from 'firebase/functions'
if (import.meta.env.DEV) connectFunctionsEmulator(functions, 'localhost', 5001)
```

## Cost expectations

Per `askAdvisor` turn (Claude Opus 4.7):

- First turn: ~$0.03 (uncached system prompt + docs)
- Subsequent turns: ~$0.014 (system prompt cached at ~10%)
- 10-turn conversation: ~$0.15

At 1000 conversations/month: ~$150.

Rate limit is 100 turns/user/day (configurable in `index.ts`).

## Audit log

Every advisor turn writes to `/advisorAuditLog/{docId}` with:
- Intent tag (legal_query / portfolio_query / hybrid / general_chat)
- Quality tag (normal / tricky / low_info / high_stakes / out_of_scope / unanswered_no_law)
- Refusal flag
- Retrieved law IDs + tool calls
- Token usage + model

Admin reviews this via the `/admin/advisor-logs` page in the app.

## Expanding the legal library

1. Add a new law to `../src/scripts/seedLegalLibrary.json` (follow the existing shape — id, jurisdiction, year, articles with topic tags).
2. Re-run the `seedLegalLibrary` callable; it upserts by ID.
3. Watch `/admin/advisor-logs` filter for `unanswered_no_law` — those are the real gaps.

## Updating the system prompt

Edit `src/systemPrompt.ts`. Because it sits inside `cache_control: ephemeral`, **any change invalidates the cache** for all users until it rebuilds. Change during low-traffic periods.
