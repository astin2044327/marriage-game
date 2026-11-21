# UI target — match nepali.games/tools/marriage-points

Reference: https://nepali.games/tools/marriage-points (dark theme)

## Look

- **Cloth bg** `#1f150d` with subtle grain/wave wash — not bright felt gradient + hard ink borders
- **Ink** `#f0e7d5`, soft `#b5a68c`
- **Panels** `#2e1f12` / `--panel`, soft `panel-border` (~12% ink), gentle lift shadow — no neo-brutal 2px black + offset shadow
- **Win** `#4fb87c`, **lose** `#f3897d`, **accent/brass** `#d9a441` / `#f3d9a4`
- **Fonts**: display **Khand**, body **Mukta** (Google Fonts OK)
- Soft `--r-press: 10px` buttons; hairline rules; large tabular scores

## Marriage calc layout (like NG)

1. Title “Marriage Points Calculator” + mode line (“Murder: …”)
2. **Standing list**: rank · avatar · name (+ crown if winner) · big ±pts · muted Rs
3. Round entry card: per-player maal + status chips (keep our Dublee/Open/Foul/Seen)
4. **Rounds** table (if rounds exist) + Total / money row
5. Soft footer actions: Share · Save · New sheet — not heavy brutal buttons

## Also restyle

Home, CB calc, play screens, logs — same tokens (keep oval play tables but coffee/cloth chrome instead of hard felt+brass bars).

## Keep

`MG_MARRIAGE_CALC.settle`, `ensureSeen`, `MG_CB_CALC.*`, routes, storage. No formula changes.
Bump `sw.js` cache.
