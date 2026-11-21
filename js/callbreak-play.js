/** Call Break play engine — bots or hotseat. */
(function () {
  const C = window.MG_CARDS;
  const Calc = window.MG_CB_CALC;

  function newGame(opts) {
    const o = opts || {};
    const mode = o.mode === "hotseat" ? "hotseat" : "bots";
    const names = mode === "hotseat"
      ? (o.names || ["You", "Friend 2", "Friend 3", "Friend 4"])
      : ["You", "Bot North", "Bot East", "Bot West"];
    const hands = C.deal(4, 13);
    return {
      id: window.MG_SAFE.uid(),
      game: "callbreak-play",
      mode,
      names: names.slice(0, 4),
      hands,
      bids: [null, null, null, null],
      bidTurn: 1, // left of dealer; dealer=0 bids last
      dealer: 0,
      tricksTaken: [0, 0, 0, 0],
      trick: [],
      trickLead: null,
      leadSuit: null,
      turn: 1,
      round: 1,
      maxRounds: 5,
      totals: [0, 0, 0, 0],
      phase: "bid", // bid | play | deal-end | match-end
      log: [],
      roomCode: (Math.random().toString(36).slice(2, 8) || "mgroom").toUpperCase()
    };
  }

  function botBid(hand) {
    const spades = hand.filter((c) => c.suit === "S").length;
    const highs = hand.filter((c) => C.RANK_VAL[c.rank] >= 12).length;
    let b = Math.max(1, Math.min(8, Math.round(spades * 0.55 + highs * 0.25)));
    return b;
  }

  function placeBid(state, seat, bid) {
    if (state.phase !== "bid" || state.bidTurn !== seat) return state;
    const b = Math.max(1, Math.min(8, Number(bid) || 1));
    state.bids[seat] = b;
    state.log.push(`${state.names[seat]} calls ${b}`);
    // next bidder
    let next = (seat + 1) % 4;
    if (state.bids.every((x) => x != null)) {
      state.phase = "play";
      state.turn = (state.dealer + 1) % 4;
      state.trick = [];
      state.trickLead = state.turn;
      state.leadSuit = null;
      maybeBotPlay(state);
      return state;
    }
    state.bidTurn = next;
    maybeBotBid(state);
    return state;
  }

  function maybeBotBid(state) {
    if (state.mode !== "bots" || state.phase !== "bid") return;
    const seat = state.bidTurn;
    if (seat === 0) return; // human
    placeBid(state, seat, botBid(state.hands[seat]));
  }

  function botPick(state, seat) {
    const hand = state.hands[seat];
    const legal = C.legalCB(hand, state.leadSuit, state.trick.map((x) => x.card));
    // Prefer low spade dump / mid follow
    legal.sort((a, b) => C.RANK_VAL[a.rank] - C.RANK_VAL[b.rank]);
    return legal[0];
  }

  function playCard(state, seat, cardId) {
    if (state.phase !== "play" || state.turn !== seat) return state;
    const hand = state.hands[seat];
    const legal = C.legalCB(hand, state.leadSuit, state.trick.map((x) => x.card));
    const card = hand.find((c) => c.id === cardId);
    if (!card || !legal.some((c) => c.id === card.id)) return state;

    state.hands[seat] = hand.filter((c) => c.id !== card.id);
    if (!state.leadSuit) state.leadSuit = card.suit;
    state.trick.push({ seat, card });
    state.turn = (seat + 1) % 4;

    if (state.trick.length === 4) {
      const cards = state.trick.map((x) => x.card);
      const localWin = C.winnerIndex(cards, state.leadSuit);
      const winnerSeat = state.trick[localWin].seat;
      state.tricksTaken[winnerSeat] += 1;
      state.log.push(`${state.names[winnerSeat]} takes trick`);
      state.trick = [];
      state.leadSuit = null;
      state.trickLead = winnerSeat;
      state.turn = winnerSeat;

      const cardsLeft = state.hands.reduce((n, h) => n + h.length, 0);
      if (cardsLeft === 0) endDeal(state);
      else maybeBotPlay(state);
      return state;
    }
    maybeBotPlay(state);
    return state;
  }

  function maybeBotPlay(state) {
    if (state.mode !== "bots" || state.phase !== "play") return;
    let guard = 0;
    while (state.phase === "play" && state.turn !== 0 && guard < 8) {
      const seat = state.turn;
      const pick = botPick(state, seat);
      playCard(state, seat, pick.id);
      guard += 1;
    }
  }

  function endDeal(state) {
    const scores = state.bids.map((b, i) => Calc.scoreDeal(b, state.tricksTaken[i]));
    scores.forEach((s, i) => {
      state.totals[i] = Math.round((state.totals[i] + s) * 10) / 10;
    });
    state.lastDealScores = scores;
    state.phase = state.round >= state.maxRounds ? "match-end" : "deal-end";
    state.log.push("Deal over: " + scores.map((s, i) => `${state.names[i]}=${s}`).join(", "));
  }

  function nextDeal(state) {
    if (state.phase === "match-end") return state;
    state.dealer = (state.dealer + 1) % 4;
    state.hands = C.deal(4, 13);
    state.bids = [null, null, null, null];
    state.bidTurn = (state.dealer + 1) % 4;
    state.tricksTaken = [0, 0, 0, 0];
    state.trick = [];
    state.leadSuit = null;
    state.round += 1;
    state.phase = "bid";
    maybeBotBid(state);
    return state;
  }

  function exportInvite(state) {
    return {
      code: state.roomCode,
      game: "callbreak-play",
      state,
      updatedAt: Date.now()
    };
  }

  window.MG_CB_PLAY = {
    newGame, placeBid, playCard, maybeBotBid, maybeBotPlay, nextDeal, exportInvite, botBid
  };
})();
