# Research: Marriage Point Calculator peers vs physical table

Sources walked (browser + rules docs), Nov 2026:
- Shrestha MPC web: https://marriage-point-calculator.shrestham.com.np/
- Nepali Games calculator: https://nepali.games/tools/marriage-points
- Rules: https://nepali.games/marriage/how-to-play , Dashain/Khelau Marriage rules
- Local audit: `/Users/ravid/ai/marriage-game` (felt tokens exist; most screens still forms)

## Competitor matrix

| App | Visual | Marriage flow | CB | Feels like cards? |
| --- | --- | --- | --- | --- |
| Shrestha MPC | Red header, white forms, ads/voice modals | Settings → Add players → Maal Point → Score/settlement | Separate CB* routes | No — spreadsheet + status chips |
| Nepali Games | Dark coffee form | Players + house rules → Start keeping score | Separate product | No — utility form |
| Our app (before redesign) | Green felt backdrop, paper panels | One-screen spreadsheet | Sticky board + play | Only Play CB has hands |

## Shrestha MPC — screen-by-screen

1. **Home** — Center Point Collection; accordion: Marriage / Call Break / Expense / Our Apps / FAQ. Language + tutorial + download modals.
2. **Game Settings (`#/setting`)** — Point rate (decimal OK) + currency; Murder vs Kidnap; Seen/Unseen win points (3/10); Dublee bonus (5); Foul (15). Notes: Dublee UI only ≥4 players; foul pot to next winner.
3. **Add Players (`#/addplayer`)** — Up to 10 name fields + camera photos + Save Group. Empty = not playing.
4. **Maal Point (`#/gamepoint`)** — Round N; winner select; per player: maal number + status **Unseen / Seen / Dublee / Foul / Hold**; dealing foul by; Calculate. Still white form, not a table.
5. **Score / settlement / rank / share / logs** — ledger pages (routes include `#/score`, `#/settlementPage`, `#/rankPage`, `#/Gamelogs`, CB* twins).

**Pain:** ads, modal spam, form aesthetic, status buried in dropdowns, settlement not spoken like a table, no cards/felt, no play.

## Physical ritual → UI moments

| Table moment | UI should feel like |
| --- | --- |
| Cloth + cards dealt | Oval felt, wood rail, face-down backs |
| First show → tiplu flipped | Tiplu chip / flipped card center |
| Seen melds face-up | Seat badge: Seen / Unseen / Dublee / Foul / Hold |
| Count maal aloud | Seat cards + large maal stepper |
| “Who finished?” | Crown / winner seat highlight |
| Murder vs Kidnap called | Mode toggle on rail, not buried |
| Rate × points → cash | Settlement “chips” + formula lines |
| Call Break bid / trick | Oval seats, trick pile center, fan hand |
| Pass phone (hotseat) | Large pass-device banner |

## Beat them (UI)

1. **Card table first** — oval felt + seats for calc *and* play; paper ledger secondary.
2. **Playing-card chrome** — cream faces, red/black pips, patterned backs, theme switcher (classic / gold / midnight).
3. **Status as seat chips** — Seen/Unseen/Dublee/Open/Foul as felt badges, not spreadsheet cells.
4. **Motion** — deal fan-in, card lift on playable, soft settle pulse on win/lose.
5. **No ad chrome** — lamp/felt atmosphere only.
6. Keep our logic wins: auto-seen, sticky CB board, Open Marriage +4, decimal rate, settlement math, resume, share JSON.
