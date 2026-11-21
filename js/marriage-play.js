/**
 * Simplified Marriage play: deal hands, pick tiplu, count maal-ish cards,
 * then settle with MG_MARRIAGE_CALC. Bots auto-pick; hotseat passes device.
 */
(function () {
  const Cards = window.MG_CARDS;
  const Calc = window.MG_MARRIAGE_CALC;

  function maalForHand(hand, tiplu) {
    if (!tiplu) return 0;
    const rank = tiplu.rank;
    const suit = tiplu.suit;
    const color = Cards.isRed(tiplu) ? "red" : "black";
    const idx = Cards.RANKS.indexOf(rank);
    // RANKS are A-high descending: one rank above = previous index (wrap A↔2)
    const up = Cards.RANKS[(idx - 1 + Cards.RANKS.length) % Cards.RANKS.length];
    const down = Cards.RANKS[(idx + 1) % Cards.RANKS.length];

    let tipluN = 0, popluN = 0, jhipluN = 0, alterN = 0;
    hand.forEach((c) => {
      if (c.rank === rank && c.suit === suit) tipluN += 1;
      else if (c.rank === up && c.suit === suit) popluN += 1;
      else if (c.rank === down && c.suit === suit) jhipluN += 1;
      else if (c.rank === rank) {
        const sameColor = Cards.isRed(c) === (color === "red");
        if (sameColor && c.suit !== suit) alterN += 1;
      }
    });

    const pts = (n, one, two, three) => (n <= 0 ? 0 : n === 1 ? one : n === 2 ? two : three);
    let m = pts(tipluN, 3, 7, 7) + pts(popluN, 2, 5, 10) + pts(jhipluN, 2, 5, 10) + pts(alterN, 5, 15, 25);
    const marriages = Math.min(tipluN, popluN, jhipluN);
    if (marriages > 0) {
      // replace component with marriage bonus (10 / 30)
      m += marriages === 1 ? 3 : 13; // approximate uplift vs 3+2+2
    }
    return m;
  }

  function newGame(opts) {
    const o = opts || {};
    const mode = o.mode === "hotseat" ? "hotseat" : "bots";
    const n = 4;
    const names = mode === "hotseat"
      ? (o.names || ["You", "Friend 2", "Friend 3", "Friend 4"])
      : ["You", "Bot A", "Bot B", "Bot C"];
    const hands = Cards.deal(n, 13);
    const tiplu = Cards.shuffle(Cards.deck52())[0];
    const maal = hands.map((h) => maalForHand(h, tiplu));
    return {
      id: window.MG_SAFE.uid(),
      game: "marriage-play",
      mode,
      names: names.slice(0, n),
      hands,
      tiplu,
      maal,
      seen: maal.map((m) => m > 0),
      winnerIndex: 0,
      rate: Number(o.rate) || 1,
      murder: true,
      openMarriage: false,
      phase: "review", // review hand → settle
      roomCode: (Math.random().toString(36).slice(2, 8) || "mroom").toUpperCase()
    };
  }

  function toCalcSession(state) {
    const s = Calc.newSession({
      players: state.names.length,
      names: state.names,
      mode: state.murder ? "murder" : "kidnap",
      rate: state.rate,
      openMarriage: state.openMarriage
    });
    s.id = state.id;
    s.winnerIndex = state.winnerIndex;
    s.players.forEach((p, i) => {
      p.maal = state.maal[i];
      p.seen = !!state.seen[i];
      p.dublee = false;
      p.openHolder = state.openMarriage && i === state.winnerIndex;
    });
    return s;
  }

  function exportInvite(state) {
    return { code: state.roomCode, game: "marriage-play", state, updatedAt: Date.now() };
  }

  window.MG_MARRIAGE_PLAY = { newGame, maalForHand, toCalcSession, exportInvite };
})();
