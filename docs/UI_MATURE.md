# Mature UI — MPC video + Nepali Games hybrid

Reference video: `~/Downloads/WhatsApp Video 2026-11-21 at 14.47.16.mp4` (Shrestha MPC capture).
Also: nepali.games/tools/marriage-points dark coffee standing list.

## Direction

Premium mobile score app — **not** toy felt ovals on calc, not chip spam, not neo-brutal borders.

### Palette
- Page: coffee cloth `#1A120C` (NG)
- Surface: `#2A1C14` panels
- Ink: `#F3EADF` / soft `#B8A894`
- **Brand crimson** `#B4233A` (MPC headers, primary CTA)
- Win mint `#3D9B6E` / row wash `#1F3D2E`
- Lose coral `#E86A5F`
- Brass crown `#D4A84B` sparingly

### Typography
- Display: Khand 600
- Body: Mukta 400/600
- Large tabular scores

### Marriage calc (match video flow)
1. Crimson app bar: brand · back · Home
2. Title + mode subtitle
3. NG-style **standing** (rank, avatar, name+crown, ±pts, Rs)
4. Compact settings row (rate, mode, players, open) — not gold rail
5. **Player rows** like MPC: name | Winner/Set winner | maal | status `<select>` (Unseen/Seen/Dublee/Foul/Hold)
6. Winner row mint wash
7. Sticky bottom CTA: **Calculate · Total maal N**
8. After calculate (always show settle): **Score card** — round table (names / maal / pts / money) + Share / Save / New · Next

### Home
Logo mark (fanned cards CSS) + accordion-style soft menu tiles (Marriage / Call Break / Play / Logs) like MPC home clarity without ads.

### Play screens
Keep oval table but wrap in same crimson/coffee chrome; soft sticky score; mature buttons.

### Rules
Reuse `MCalc.settle` / `ensureSeen` / Store. Bump SW to v5. Mobile-first `#app { max-width: 440px }`.
