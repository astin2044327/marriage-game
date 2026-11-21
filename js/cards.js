/** Card helpers for Call Break / simplified Marriage. */
(function () {
  const SUITS = ["S", "H", "D", "C"];
  const SUIT_SYM = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const RANK_VAL = { A: 14, K: 13, Q: 12, J: 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2 };

  function card(rank, suit) {
    return { rank, suit, id: rank + suit };
  }

  function deck52() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push(card(r, s));
    return d;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function deal(nPlayers, nEach) {
    const d = shuffle(deck52());
    const hands = Array.from({ length: nPlayers }, () => []);
    let i = 0;
    for (let k = 0; k < nPlayers * nEach; k += 1) {
      hands[i % nPlayers].push(d[k]);
      i += 1;
    }
    hands.forEach((h) => h.sort(cmpCard));
    return hands;
  }

  function cmpCard(a, b) {
    if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    return RANK_VAL[b.rank] - RANK_VAL[a.rank];
  }

  function isRed(c) {
    return c.suit === "H" || c.suit === "D";
  }

  function label(c) {
    return c.rank + SUIT_SYM[c.suit];
  }

  function themeClass(theme) {
    if (!theme || theme === "classic") return "theme-classic";
    if (theme === "gold") return "theme-gold";
    if (theme === "midnight") return "theme-midnight";
    return "";
  }

  /**
   * Face-up card (or face-down if opts.back).
   * opts: playable, dim, small, large, fan, fanIndex, back, theme, dataId, disabled, dealIn
   */
  function html(c, opts) {
    const o = opts || {};
    if (o.back) return htmlBack(o);
    const cls = [
      "card",
      isRed(c) ? "red" : "black",
      o.playable ? "playable" : "",
      o.dim ? "dim" : "",
      o.small ? "small" : "",
      o.large ? "large" : "",
      o.fan ? "fan" : "",
      o.dealIn ? "deal-in" : "",
      themeClass(o.theme)
    ].filter(Boolean).join(" ");
    const data = o.dataId ? ` data-id="${c.id}"` : "";
    const fanStyle = o.fanIndex != null ? ` style="--i:${o.fanIndex}"` : "";
    const sym = SUIT_SYM[c.suit];
    const aria = ` aria-label="${c.rank} ${sym}"`;
    return (
      `<button type="button" class="${cls}"${data}${fanStyle}${aria} ${o.disabled ? "disabled" : ""}>` +
      `<span class="corner" aria-hidden="true"><span class="rank">${c.rank}</span><span class="suit">${sym}</span></span>` +
      `<span class="pip" aria-hidden="true">${sym}</span>` +
      `<span class="corner br" aria-hidden="true"><span class="rank">${c.rank}</span><span class="suit">${sym}</span></span>` +
      `</button>`
    );
  }

  /** Face-down patterned reverse for opponent fans / deck. */
  function htmlBack(opts) {
    const o = opts || {};
    const cls = [
      "card",
      "back",
      o.small ? "small" : "",
      o.large ? "large" : "",
      o.fan ? "fan" : "",
      o.dealIn ? "deal-in" : "",
      themeClass(o.theme)
    ].filter(Boolean).join(" ");
    const fanStyle = o.fanIndex != null ? ` style="--i:${o.fanIndex}"` : "";
    const data = o.dataId ? ` data-id="${o.dataId}"` : "";
    return `<span class="${cls}"${data}${fanStyle} aria-hidden="true"></span>`;
  }

  function backFan(n, opts) {
    const o = opts || {};
    const count = Math.max(0, Math.min(Number(n) || 0, 16));
    return Array.from({ length: count }, (_, i) =>
      htmlBack(Object.assign({}, o, { fan: true, fanIndex: i }))
    ).join("");
  }

  /** Call Break: higher card wins; spades always trump. */
  function winnerIndex(trick, leadSuit) {
    let best = 0;
    let bestCard = trick[0];
    for (let i = 1; i < trick.length; i += 1) {
      const c = trick[i];
      const b = bestCard;
      const cTrump = c.suit === "S";
      const bTrump = b.suit === "S";
      if (cTrump && !bTrump) { best = i; bestCard = c; continue; }
      if (!cTrump && bTrump) continue;
      if (cTrump && bTrump) {
        if (RANK_VAL[c.rank] > RANK_VAL[b.rank]) { best = i; bestCard = c; }
        continue;
      }
      if (c.suit === leadSuit && b.suit === leadSuit) {
        if (RANK_VAL[c.rank] > RANK_VAL[b.rank]) { best = i; bestCard = c; }
      } else if (c.suit === leadSuit && b.suit !== leadSuit) {
        best = i; bestCard = c;
      }
    }
    return best;
  }

  function legalCB(hand, leadSuit, trick) {
    if (!leadSuit) return hand.slice();
    const follow = hand.filter((c) => c.suit === leadSuit);
    if (follow.length) {
      const bestLed = trick.filter((c) => c.suit === leadSuit)
        .sort((a, b) => RANK_VAL[b.rank] - RANK_VAL[a.rank])[0];
      const beaters = follow.filter((c) => RANK_VAL[c.rank] > RANK_VAL[bestLed.rank]);
      // Soft rule: if can beat led suit, prefer those (table house rule simplified: allow any follow)
      return follow;
    }
    const spades = hand.filter((c) => c.suit === "S");
    return spades.length ? spades : hand.slice();
  }

  window.MG_CARDS = {
    SUITS, SUIT_SYM, RANKS, RANK_VAL, card, deck52, shuffle, deal, cmpCard,
    isRed, label, html, htmlBack, backFan, winnerIndex, legalCB
  };
})();
