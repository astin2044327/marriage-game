# Marriage Game (MPC+)

Offline Nepali card-table **PWA**: Marriage point calculator + Call Break / Marriage play.

- **No accounts, no ads, no backend** — progress stays in `localStorage`
- Closes common MPC review gaps (live Call Break board, auto-seen, Open Marriage, Dublee, decimal rates, settlement math, resume logs, share)
- **Play Call Break** vs bots or friends (hotseat + copy/paste invite JSON)
- **Play Marriage** (simplified deal → maal settle) vs bots or friends

See [DESIGN.md](./DESIGN.md) for product rules and gap table.

## Run locally

```bash
cd marriage-game
python3 -m http.server 8777
```

Open http://127.0.0.1:8777/

## Stack

Vanilla HTML / CSS / JS · hash router · service worker (`marriage-game-v1`)
