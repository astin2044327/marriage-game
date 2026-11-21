# UI spec — real card table (beat MPC)

## Direction

Nepali home card table: deep green felt, warm lamp, cream card faces, brass accents. **Not** Shrestha red-form, not coffee utility, not purple AI chrome.

## Tokens (extend existing)

Keep `--felt*`, `--lamp`, `--ink`, `--paper`, `--win`, `--lose`, `--accent`. Add:
- `--rail` wood brown for oval rim
- `--chip-seen`, `--chip-unseen`, `--chip-dublee`, `--chip-foul`, `--chip-hold`, `--chip-open`
- `--card-face`, `--card-back-a`, `--card-back-b` (themeable)
- Themes via `data-theme="classic|gold|midnight"` on `<html>`

## Components

1. **`.table-oval`** — elliptical felt with wood `--rail` border; seats around perimeter (`.seat` top/right/bottom/left / nth for 2–10).
2. **`.seat`** — avatar initial, name, status chips, maal stepper or bid/tricks; `.seat.winner` gold ring; `.seat.active` lamp glow.
3. **`.card`** — larger cream face, corner rank+suit, slight 3D; `.card.back` patterned reverse; `.card.fan` overlap; playable lift.
4. **`.trick-pit`** — center of oval for played cards / tiplu.
5. **`.rail-bar`** — mode, rate, Open Marriage, deal # — brass strip over felt.
6. **`.settle-tray`** — paper slip with math lines + money chips (win green / lose red).
7. **Home** — brand hero on felt with 4 oversized “table invite” tiles (not generic cards list).

## Screen redesigns (reuse math engines)

### Marriage calculator `#/calc/marriage`
- Oval with N seats; each seat: name edit, maal ±, chips Seen/Dublee/Open/Foul, winner crown.
- Rail: players count, Murder|Kidnap, rate, Open Marriage.
- Live settle tray under table calling `MG_MARRIAGE_CALC.settle` only.
- Auto-seen via `ensureSeen` (unchanged).

### Call Break scorecard `#/calc/callbreak`
- Sticky brass scoreboard + table seats showing running totals; deal entry as “next hand” rail form.

### Play Call Break `#/play/cb`
- Full oval: opponents face-down fans, you face-up fan, trick pit center, bid pills on rail, pass-device banner.

### Play Marriage `#/play/marriage`
- Deal animation into seats; tiplu in pit; editable maal on seats; settle tray.

### Home / logs
- Felt hero + table metaphors; logs as score slips.

## Motion (2–3+)
1. `@keyframes deal-in` cards
2. `.card.playable:hover` translateY
3. `.seat.winner` pulse / settle flash

## Non-negotiable reuse
`MG_MARRIAGE_CALC.settle`, `ensureSeen`, `MG_CB_CALC.scoreDeal`, `MG_CARDS.*`, `MG_STORE`, hash routes. No formula duplication. Bump `sw.js` cache.
