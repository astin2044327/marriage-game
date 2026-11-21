# Feature map — Marriage Game

| Goal | Files |
| --- | --- |
| Shell / routes / table UI | `index.html`, `js/app.js`, `css/app.css` |
| Storage / logs | `js/storage.js`, `js/safe.js` |
| Cards (faces, backs, fans) | `js/cards.js` |
| Marriage calculator math | `js/marriage-calc.js` |
| Call Break scorecard math | `js/callbreak-calc.js` |
| Call Break play | `js/callbreak-play.js` |
| Marriage play (simplified) | `js/marriage-play.js` |
| PWA | `sw.js` (`marriage-game-v5`), `manifest.webmanifest`, `icons/` |
| Product design | `DESIGN.md` |
| MPC research | `docs/RESEARCH_MPC.md` |
| UI lock | `docs/UI_SPEC.md`, `docs/UI_NEPALI_GAMES.md`, `docs/UI_MATURE.md` |

Boot order matches `index.html` script tags. Bump `CACHE` in `sw.js` when shell files change. Never duplicate settle / scoreDeal formulas in UI.
