# Marriage Game (MPC+) — design

## Product idea

Offline Nepali card-table PWA: a Marriage Point Calculator that closes gaps left by Shrestha MPC & peers, plus lightweight **Play Call Break** and simplified **Play Marriage** (bots or hotseat friends). Vanilla HTML/CSS/JS. No React, no backend, no accounts — Mathenomics-style static PWA.

## Gaps closed (vs typical MPC apps)

| Gap | MPC+ answer |
| --- | --- |
| Mid-game Call Break scorecard | Always-visible running board |
| Seen flag | Auto-seen when points entered |
| Old sessions | Resume from local log list |
| Open Marriage | Optional +4 hapeko |
| Player count (calc) | 2–10 |
| Dublee | Explicit toggle / clear labeling |
| Point rate | Decimal rates allowed |
| Settlement | Show the math, not only totals |
| Roster mid-game | Edit players without wiping scores |
| Share score | One-tap copy text / JSON |
| Modes | Kidnap vs Murder |

## Screens / routes (hash)

| Route | Purpose |
| --- | --- |
| `#/` | Home: Calc · Play Call Break · Play Marriage · Logs |
| `#/calc/marriage` | Marriage calculator (2–10, modes, Open Marriage, Dublee, decimal rate, settlement breakdown) |
| `#/calc/callbreak` | Call Break scorecard (always-on board, auto-seen, mid-game edit) |
| `#/play/cb` | Call Break deal: bots **or** hotseat; optional room-code invite |
| `#/play/marriage` | Simplified Marriage: teachable deal → maal settle **or** guided calc-assisted |
| `#/logs` | Resume / delete / share past sessions |
| `#/invite` | Paste shared JSON to join same-session hotseat state |

## Data model (localStorage)

| Key | Value |
| --- | --- |
| `mg-settings` | `{ theme?, lastMode, defaultRate, openMarriageDefault }` |
| `mg-logs` | `[{ id, game, createdAt, updatedAt, title, payload }]` — resumeable sessions |
| `mg-active-cb` | Live Call Break session (bids, tricks, seen, players, scores) |
| `mg-active-marriage` | Live Marriage calc/play session (maal, modes, rate, settlement) |
| `mg-invite` | Ephemeral room blob `{ code, game, state, updatedAt }` for copy/paste sync only |

No server. “Shareable room code” = generate short code + export/import JSON; peers paste into `#/invite`. Same-session lightweight invite only.

## Scoring formulas

### Call Break

- Players: typically 4 (play) / flexible in calc. Each deal: bid `C` tricks; take `T`.
- **Made** (`T ≥ C`): score `C + 0.1 × (T − C)` (overtricks as tenths).
- **Failed** (`T < C`): score `−C`.
- Running total = sum of deal scores. **Seen** flips on when that deal’s points are entered (manual override allowed).

### Marriage (maal settlement)

- Per hand: each player’s **maal points** `Mᵢ` (cards/combos as entered or dealt in simplified play).
- Modes: **Kidnap** vs **Murder** (affect who pays whom / zeroing rules — UI labels both; implement common Nepali table conventions).
- **Open Marriage**: when enabled, add **+4 hapeko** to the open-marriage holder’s maal before settle.
- **Dublee**: when flagged, apply Dublee multiplier/pay rule distinctly (never buried in a generic “bonus”).
- **Point rate** `R` (decimal, e.g. `0.5`, `1`, `1.5`): money = points × `R`.
- Settlement (show steps): for each player, net points vs table average (or winner-pays rules per mode), then `netPoints × R` → rupees. Display formula lines, not only a final column.

## Play scope

- **Call Break play**: full teachable deals vs bots **or** friends (hotseat / pass-and-play); optional copy/paste room JSON.
- **Marriage play**: simplified deals vs bots **or** hotseat — teach maal recognition + settle after hand, **or** guided calculator-assisted entry. Full casino-grade Marriage rules are out of scope.

## UX principles

- Nepali card-table atmosphere: felt green, warm lamp light, ink scoreboard — **not** purple gradients / generic AI chrome.
- CSS vars: `--felt`, `--felt-deep`, `--lamp`, `--ink`, `--paper`, `--win`, `--lose`, `--accent` (gold/brass, not violet).
- One job per screen; scoreboard never hidden mid-Call-Break.
- Large tap targets for hotseat; clear “pass device” cue.
- Settlement and share text readable when pasted into a chat.

## Non-goals

- No ads, no accounts, no analytics backend
- No frontend → database; nothing leaves the device except user-copied text/JSON
- No real multiplayer server / WebRTC / Firebase sync
- No full Marriage rule engine / tournament / stakes ledger beyond local logs
- No React, no build-required SPA framework

## Technical shape

Static PWA: `index.html`, `css/app.css`, `js/*`, `sw.js`, `manifest.webmanifest`. Hash routes. Service worker network-first with cache fallback; bump cache name on shell changes.
