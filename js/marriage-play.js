/**
 * Marriage table play — 21-card hands, stock/discard, suit-sorted hand,
 * floor sequences / dublees, tiplu (maal) gated until all show 3 sequences
 * or 7 dublees are on the floor.
 */
(function () {
  const Cards = window.MG_CARDS;
  const Calc = window.MG_MARRIAGE_CALC;
  const RANK_ORDER = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  // A-high chain also allows A-K-Q; treat A as 14 for high runs and 1 for A-2-3
  const RANK_NUM = {
    A: 14, K: 13, Q: 12, J: 11, "10": 10, "9": 9, "8": 8, "7": 7,
    "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
  };

  function decks(n) {
    const out = [];
    for (let i = 0; i < n; i += 1) {
      Cards.deck52().forEach((c) => {
        out.push({ rank: c.rank, suit: c.suit, id: c.id + "#" + i + "-" + out.length });
      });
    }
    return out;
  }

  function sortHand(hand) {
    return hand.slice().sort(Cards.cmpCard);
  }

  function bySuit(hand) {
    const groups = { S: [], H: [], D: [], C: [] };
    sortHand(hand).forEach((c) => {
      if (groups[c.suit]) groups[c.suit].push(c);
    });
    return groups;
  }

  function cloneCard(c) {
    return { rank: c.rank, suit: c.suit, id: c.id };
  }

  /** Pure sequences: 3+ consecutive same suit (A can be high or low). */
  function findSequences(hand) {
    const found = [];
    Cards.SUITS.forEach((suit) => {
      const cards = hand.filter((c) => c.suit === suit);
      if (cards.length < 3) return;
      const uniq = [];
      const seenRank = new Set();
      cards.forEach((c) => {
        if (!seenRank.has(c.rank)) {
          seenRank.add(c.rank);
          uniq.push(c);
        }
      });
      const nums = uniq.map((c) => ({ c, n: RANK_NUM[c.rank] })).sort((a, b) => a.n - b.n);
      // low-A run: treat A as 1 if 2,3 present
      const hasA = nums.some((x) => x.c.rank === "A");
      const has2 = nums.some((x) => x.c.rank === "2");
      const has3 = nums.some((x) => x.c.rank === "3");
      let run = [];
      const flushRun = () => {
        if (run.length >= 3) found.push(run.map((x) => x.c));
        run = [];
      };
      for (let i = 0; i < nums.length; i += 1) {
        if (!run.length || nums[i].n === run[run.length - 1].n + 1) run.push(nums[i]);
        else {
          flushRun();
          run = [nums[i]];
        }
      }
      flushRun();
      if (hasA && has2 && has3) {
        const a23 = uniq.filter((c) => c.rank === "A" || c.rank === "2" || c.rank === "3");
        if (a23.length >= 3) {
          const key = a23.map((c) => c.rank).sort().join("");
          if (!found.some((seq) => seq.map((c) => c.rank).sort().join("") === key && seq[0].suit === suit)) {
            found.push(a23.slice(0, 3));
          }
        }
      }
    });
    return found;
  }

  /** Identical-card pairs across multi-deck (same rank+suit). */
  function countDublees(cards) {
    const map = Object.create(null);
    cards.forEach((c) => {
      const k = c.rank + c.suit;
      map[k] = (map[k] || 0) + 1;
    });
    let n = 0;
    Object.keys(map).forEach((k) => {
      n += Math.floor(map[k] / 2);
    });
    return n;
  }

  function maalForHand(hand, tiplu) {
    if (!tiplu) return 0;
    const rank = tiplu.rank;
    const suit = tiplu.suit;
    const color = Cards.isRed(tiplu) ? "red" : "black";
    const idx = Cards.RANKS.indexOf(rank);
    const up = Cards.RANKS[(idx - 1 + Cards.RANKS.length) % Cards.RANKS.length];
    const down = Cards.RANKS[(idx + 1) % Cards.RANKS.length];

    let tipluN = 0;
    let popluN = 0;
    let jhipluN = 0;
    let alterN = 0;
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
    if (marriages > 0) m += marriages === 1 ? 3 : 13;
    return m;
  }

  function allHandsPlusFloor(state, seat) {
    const floor = (state.floor[seat] || []).flat();
    return (state.hands[seat] || []).concat(floor);
  }

  function recomputeMaal(state) {
    if (!state.maalRevealed || !state.tiplu) {
      state.maal = state.names.map(() => 0);
      return;
    }
    state.maal = state.names.map((_, i) => maalForHand(allHandsPlusFloor(state, i), state.tiplu));
    state.seen = state.maal.map((m) => m > 0);
  }

  function checkMaalReveal(state) {
    if (state.maalRevealed) return false;
    const allThree = state.shownSeqCount.every((n) => n >= 3);
    const dubleeTotal = state.floor.reduce((sum, piles) => {
      const flat = (piles || []).flat();
      return sum + countDublees(flat);
    }, 0);
    state.floorDubleeTotal = dubleeTotal;
    if (allThree || dubleeTotal >= 7) {
      state.maalRevealed = true;
      recomputeMaal(state);
      return true;
    }
    return false;
  }

  function newGame(opts) {
    const o = opts || {};
    const mode = o.mode === "hotseat" ? "hotseat" : "bots";
    const n = 4;
    const names = mode === "hotseat"
      ? (o.names || ["You", "Friend 2", "Friend 3", "Friend 4"])
      : ["You", "Bot A", "Bot B", "Bot C"];

    const pack = Cards.shuffle(decks(3));
    const hands = Array.from({ length: n }, () => []);
    for (let k = 0; k < n * 21; k += 1) hands[k % n].push(pack[k]);
    hands.forEach((h, i) => { hands[i] = sortHand(h); });

    let stock = pack.slice(n * 21);
    const tiplu = cloneCard(stock.pop()); // first cut — hidden until reveal
    const discard = [stock.pop()]; // open starter discard

    return {
      id: window.MG_SAFE.uid(),
      game: "marriage-play",
      mode,
      names: names.slice(0, n),
      hands,
      stock,
      discard,
      tiplu,
      maalRevealed: false,
      maal: names.map(() => 0),
      seen: names.map(() => false),
      floor: Array.from({ length: n }, () => []), // array of sequences (each sequence = card[])
      shownSeqCount: Array.from({ length: n }, () => 0),
      floorDubleeTotal: 0,
      turn: 0,
      phase: "draw", // draw | discard | settle
      drawnThisTurn: false,
      winnerIndex: 0,
      rate: Number(o.rate) || 1,
      murder: true,
      openMarriage: false,
      message: "Pull the discard or the deck",
      roomCode: (Math.random().toString(36).slice(2, 8) || "mroom").toUpperCase()
    };
  }

  function topDiscard(state) {
    const d = state.discard || [];
    return d.length ? d[d.length - 1] : null;
  }

  function drawFromStock(state, seat) {
    if (state.phase !== "draw" || state.turn !== seat) return { ok: false, reason: "Not your draw" };
    if (!state.stock.length) {
      // recycle discard under top
      const top = state.discard.pop();
      state.stock = Cards.shuffle(state.discard);
      state.discard = top ? [top] : [];
    }
    if (!state.stock.length) return { ok: false, reason: "Deck empty" };
    const c = state.stock.pop();
    state.hands[seat].push(c);
    state.hands[seat] = sortHand(state.hands[seat]);
    state.drawnThisTurn = true;
    state.phase = "discard";
    state.message = seat === 0 ? "Throw a card" : state.names[seat] + " drew";
    return { ok: true, card: c, from: "stock" };
  }

  function takeDiscard(state, seat) {
    if (state.phase !== "draw" || state.turn !== seat) return { ok: false, reason: "Not your draw" };
    const c = topDiscard(state);
    if (!c) return { ok: false, reason: "No discard" };
    state.discard.pop();
    state.hands[seat].push(c);
    state.hands[seat] = sortHand(state.hands[seat]);
    state.drawnThisTurn = true;
    state.phase = "discard";
    state.message = seat === 0 ? "Throw a card" : state.names[seat] + " took discard";
    return { ok: true, card: c, from: "discard" };
  }

  function discardCard(state, seat, cardId) {
    if (state.phase !== "discard" || state.turn !== seat) return { ok: false, reason: "Not your discard" };
    const hand = state.hands[seat];
    const idx = hand.findIndex((c) => c.id === cardId);
    if (idx < 0) return { ok: false, reason: "Card not in hand" };
    const [c] = hand.splice(idx, 1);
    state.hands[seat] = sortHand(hand);
    state.discard.push(c);
    state.drawnThisTurn = false;
    state.turn = (state.turn + 1) % state.names.length;
    state.phase = "draw";
    state.message = state.turn === 0
      ? "Your turn — pull discard or deck"
      : state.names[state.turn] + " to play";
    return { ok: true, card: c };
  }

  function laySequences(state, seat) {
    const seqs = findSequences(state.hands[seat]);
    if (seqs.length < 3) return { ok: false, reason: "Need 3 sequences", sequences: seqs };
    // Lay first 3 sequences found; remove those cards from hand
    const lay = seqs.slice(0, 3);
    const removeIds = new Set(lay.flat().map((c) => c.id));
    state.hands[seat] = sortHand(state.hands[seat].filter((c) => !removeIds.has(c.id)));
    state.floor[seat] = (state.floor[seat] || []).concat(lay);
    state.shownSeqCount[seat] = (state.floor[seat] || []).length;
    const revealed = checkMaalReveal(state);
    state.message = revealed
      ? "Maal (tiplu) revealed!"
      : state.names[seat] + " laid 3 sequences on the floor";
    return { ok: true, laid: lay, revealed };
  }

  function botPickDiscard(state, seat) {
    const hand = state.hands[seat];
    // Prefer discarding from longest suit surplus / random edge
    if (!hand.length) return null;
    const seqIds = new Set(findSequences(hand).flat().map((c) => c.id));
    const junk = hand.filter((c) => !seqIds.has(c.id));
    const pool = junk.length ? junk : hand;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function botAct(state) {
    const seat = state.turn;
    if (seat === 0 && state.mode === "bots") return { ok: false, reason: "human" };
    if (state.mode === "hotseat") return { ok: false, reason: "hotseat" };

    if (state.phase === "draw") {
      const top = topDiscard(state);
      // ~25% take discard if it helps a suit we already hold
      let take = false;
      if (top) {
        const sameSuit = state.hands[seat].filter((c) => c.suit === top.suit).length;
        take = sameSuit >= 2 && Math.random() < 0.35;
      }
      const r = take ? takeDiscard(state, seat) : drawFromStock(state, seat);
      if (!r.ok) drawFromStock(state, seat);
    }

    if (state.phase === "discard") {
      // Auto-lay if bot somehow has 3 sequences
      const seqs = findSequences(state.hands[seat]);
      if (seqs.length >= 3) laySequences(state, seat);
      const pick = botPickDiscard(state, seat);
      if (pick) discardCard(state, seat, pick.id);
    }
    return { ok: true };
  }

  function runBotsUntilHuman(state, maxSteps) {
    const steps = [];
    let guard = maxSteps || 12;
    while (guard-- > 0) {
      if (state.phase === "settle") break;
      if (state.mode !== "bots") break;
      if (state.turn === 0) break;
      const before = state.turn + ":" + state.phase;
      botAct(state);
      steps.push(before);
      if (state.turn + ":" + state.phase === before) break;
    }
    return steps;
  }

  function toCalcSession(state) {
    recomputeMaal(state);
    const s = Calc.newSession({
      players: state.names.length,
      names: state.names,
      mode: state.murder ? "murder" : "kidnap",
      rate: state.rate,
      openMarriage: state.openMarriage
    });
    s.id = state.id;
    s.winnerIndex = state.winnerIndex;
    s.phase = "play";
    s.players.forEach((p, i) => {
      p.maal = state.maal[i];
      p.seen = state.maalRevealed ? !!state.seen[i] : false;
      p.dublee = (state.shownSeqCount[i] || 0) >= 3 && countDublees((state.floor[i] || []).flat()) > 0;
      p.openHolder = state.openMarriage && i === state.winnerIndex;
    });
    return s;
  }

  function exportInvite(state) {
    return { code: state.roomCode, game: "marriage-play", state, updatedAt: Date.now() };
  }

  window.MG_MARRIAGE_PLAY = {
    newGame,
    maalForHand,
    toCalcSession,
    exportInvite,
    sortHand,
    bySuit,
    findSequences,
    countDublees,
    topDiscard,
    drawFromStock,
    takeDiscard,
    discardCard,
    laySequences,
    botAct,
    runBotsUntilHuman,
    checkMaalReveal,
    recomputeMaal
  };
})();
