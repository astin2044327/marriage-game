/**
 * Marriage settlement calculator + multi-round match.
 * Better: doubles that round only. Auto-Better arms the *next* round when
 * player-count matches and individual/table maal thresholds are hit.
 * Foul: maal + seen/unseen foul pts; flat foul pts this round or next (default next).
 * Default status for active players: Seen. 10 character faces, randomized.
 */
(function () {
  const FACE_COUNT = 10;

  /** Point rate is in the selected currency (money = points × rate). */
  const CURRENCIES = [
    { id: "usd", label: "US Dollar", symbol: "$", code: "USD" },
    { id: "eur", label: "Euro", symbol: "€", code: "EUR" },
    { id: "inr", label: "Indian Rupee", symbol: "₹", code: "INR" },
    { id: "cad", label: "Canadian Dollar", symbol: "C$", code: "CAD" },
    { id: "npr", label: "Nepali Rupee", symbol: "रू", code: "NPR" },
    { id: "rs", label: "Rupees", symbol: "Rs", code: "Rs" }
  ];

  function currencyOf(id) {
    const key = String(id || "npr").toLowerCase();
    return CURRENCIES.find((c) => c.id === key) || CURRENCIES.find((c) => c.id === "npr");
  }

  function formatMoney(amount, currencyId, opts) {
    const o = opts || {};
    const cur = currencyOf(currencyId);
    const n = Math.round((Number(amount) || 0) * 100) / 100;
    const sign = n > 0 ? "+" : "";
    const body = `${sign}${n}`;
    if (o.codeOnly) return `${body} ${cur.code}`;
    return `${cur.symbol}${body}`;
  }

  const CHARACTERS = [
    { id: 0, name: "Raja", glyph: "♔" },
    { id: 1, name: "Rani", glyph: "♕" },
    { id: 2, name: "Sipahi", glyph: "♞" },
    { id: 3, name: "Hathi", glyph: "♝" },
    { id: 4, name: "Unt", glyph: "▲" },
    { id: 5, name: "Baagh", glyph: "◆" },
    { id: 6, name: "Surya", glyph: "☀" },
    { id: 7, name: "Chandra", glyph: "☾" },
    { id: 8, name: "Pahad", glyph: "▲" },
    { id: 9, name: "Nadi", glyph: "∽" }
  ];

  function shuffleFaces(n) {
    const pool = Array.from({ length: FACE_COUNT }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, Math.max(0, Math.min(FACE_COUNT, n)));
  }

  function randomFace(used) {
    const taken = used || new Set();
    const free = [];
    for (let i = 0; i < FACE_COUNT; i += 1) {
      if (!taken.has(i)) free.push(i);
    }
    if (!free.length) return Math.floor(Math.random() * FACE_COUNT);
    return free[Math.floor(Math.random() * free.length)];
  }

  function characterOf(face) {
    const i = ((Number(face) || 0) % FACE_COUNT + FACE_COUNT) % FACE_COUNT;
    return CHARACTERS[i];
  }

  function blankPlayer(name, i, face) {
    return {
      id: "p" + i + "-" + Math.random().toString(36).slice(2, 6),
      name: name || ("Player " + (i + 1)),
      face: face != null ? Number(face) % FACE_COUNT : i % FACE_COUNT,
      maal: 0,
      seen: true,
      dublee: false,
      openHolder: false,
      foul: false,
      hold: false
    };
  }

  /** Defaults scale with table size — 5 players → 25 individual / 50 table. */
  function suggestedBetterRule(playerCount) {
    const n = Math.max(2, Math.min(10, Number(playerCount) || 5));
    return {
      enabled: false,
      playerCount: n,
      individualMaal: 5 * n,
      totalMaal: 10 * n
    };
  }

  function defaultBetterRule() {
    return suggestedBetterRule(5);
  }

  function defaultFoulRule() {
    return {
      foulNextRound: true,
      unseenPts: 10,
      seenPts: 3,
      foulPts: 15
    };
  }

  function newSession(opts) {
    const o = opts || {};
    const n = Math.max(2, Math.min(10, Number(o.players) || 4));
    const names = o.names || [];
    const faces = o.faces || [];
    const picked = faces.length >= n ? faces : shuffleFaces(n);
    return {
      id: window.MG_SAFE.uid(),
      game: "marriage-calc",
      phase: o.phase || "setup",
      mode: o.mode || "murder",
      rate: Number(o.rate) >= 0 ? Number(o.rate) : 1,
      openMarriage: !!o.openMarriage,
      currency: currencyOf(o.currency).id,
      better: false,
      pendingBetter: false,
      pendingFoulPts: Array(n).fill(0),
      betterRule: Object.assign(defaultBetterRule(), o.betterRule || {}, {
        playerCount: (o.betterRule && o.betterRule.playerCount) || n
      }),
      foulRule: Object.assign(defaultFoulRule(), o.foulRule || {}),
      winnerIndex: 0,
      players: Array.from({ length: n }, (_, i) => {
        const p = blankPlayer(names[i], i, picked[i]);
        if (faces[i] != null) p.face = Number(faces[i]) % FACE_COUNT;
        return p;
      }),
      rounds: [],
      createdAt: Date.now()
    };
  }

  function ensureSeen(p) {
    if (p.hold || p.foul) return;
    if (Number(p.maal) > 0 || p.dublee || p.openHolder) p.seen = true;
  }

  function resetDraft(session) {
    const armBetter = !!session.pendingBetter;
    session.players.forEach((p) => {
      p.maal = 0;
      p.seen = true;
      p.dublee = false;
      p.openHolder = false;
      p.foul = false;
      p.hold = false;
    });
    session.winnerIndex = 0;
    session.better = armBetter;
    session.pendingBetter = false;
  }

  function roundTriggersBetter(session, cells) {
    const rule = session.betterRule || defaultBetterRule();
    if (!rule.enabled) return false;
    const need = Number(rule.playerCount) || 0;
    const activeCount = (cells || []).filter((c) => !c.satOut && !c.hold).length;
    if (need > 0 && activeCount !== need) return false;
    const ind = Number(rule.individualMaal) || 0;
    const tot = Number(rule.totalMaal) || 0;
    let sum = 0;
    let max = 0;
    (cells || []).forEach((c) => {
      if (c.satOut || c.hold) return;
      const m = Number(c.maalEntered != null ? c.maalEntered : c.maal) || 0;
      sum += m;
      if (m > max) max = m;
    });
    if (ind > 0 && max >= ind) return true;
    if (tot > 0 && sum >= tot) return true;
    return false;
  }

  function settle(session) {
    const all = session.players.map((p) => Object.assign({}, p));
    all.forEach(ensureSeen);

    const activeIdx = [];
    all.forEach((p, i) => {
      if (!p.hold) activeIdx.push(i);
    });

    const M = all.map(() => 0);
    const maalNet = all.map(() => 0);
    const winPay = all.map(() => 0);
    const foulPay = all.map(() => 0);
    const netPts = all.map(() => 0);
    const money = all.map(() => 0);
    const lines = [];
    const rate = Number(session.rate) || 0;
    const better = !!session.better;
    const foulRule = Object.assign(defaultFoulRule(), session.foulRule || {});
    const pendingIn = Array.isArray(session.pendingFoulPts)
      ? session.pendingFoulPts.slice()
      : all.map(() => 0);
    const pendingOut = all.map(() => 0);

    if (activeIdx.length < 2) {
      lines.push("Need at least 2 active players (not on Hold).");
      return {
        M, sum: 0, maalNet, winPay, foulPay, netPts, money, lines,
        players: all, better, activeIdx, pendingFoulPts: pendingOut
      };
    }

    const active = activeIdx.map((i) => all[i]);
    const n = active.length;
    const Mact = active.map((p) => {
      if (p.foul) return 0;
      let m = Number(p.maal) || 0;
      if (session.mode === "murder" && !p.seen) m = 0;
      if (session.openMarriage && p.openHolder) m += 4;
      return m;
    });
    const sum = Mact.reduce((a, b) => a + b, 0);
    const maalNetAct = Mact.map((m) => n * m - sum);

    let wLocal = activeIdx.indexOf(Number(session.winnerIndex));
    if (wLocal < 0) wLocal = 0;
    const wGlobal = activeIdx[wLocal];
    const winPayAct = active.map(() => 0);
    const foulPayAct = active.map(() => 0);

    // Deferred foul 15 (or custom) from previous round → pay winner this round
    activeIdx.forEach((gi, li) => {
      const pend = Number(pendingIn[gi]) || 0;
      if (!pend) return;
      foulPayAct[li] -= pend;
      foulPayAct[wLocal] += pend;
      lines.push(`Pending foul ${pend} · ${all[gi].name} → ${all[wGlobal].name}`);
    });

    for (let i = 0; i < n; i += 1) {
      if (i === wLocal) continue;
      if (active[i].foul) continue;
      let pay = active[i].seen ? 3 : 10;
      if (active[wLocal].dublee) pay += 5;
      winPayAct[i] -= pay;
      winPayAct[wLocal] += pay;
    }

    // Foul package: pay maal + seen/unseen foul; flat foul pts this or next round
    activeIdx.forEach((gi, li) => {
      const p = active[li];
      if (!p.foul) return;
      const maalPay = Number(p.maal) || 0;
      const flagPay = p.seen
        ? (Number(foulRule.seenPts) || 3)
        : (Number(foulRule.unseenPts) || 10);
      const flat = Number(foulRule.foulPts) || 15;
      let now = maalPay + flagPay;
      if (!foulRule.foulNextRound) now += flat;
      else pendingOut[gi] = flat;
      foulPayAct[li] -= now;
      foulPayAct[wLocal] += now;
      lines.push(
        `Foul ${p.name}: maal ${maalPay} + ${p.seen ? "seen" : "unseen"} ${flagPay}` +
          (foulRule.foulNextRound ? ` · ${flat} next round` : ` · ${flat} this round`)
      );
    });

    const netAct = maalNetAct.map((m, i) => m + winPayAct[i] + foulPayAct[i]);
    let moneyAct = netAct.map((p) => Math.round(p * rate * 100) / 100);
    let netFinal = netAct.slice();
    if (better) {
      netFinal = netAct.map((p) => p * 2);
      moneyAct = moneyAct.map((m) => Math.round(m * 2 * 100) / 100);
    }

    activeIdx.forEach((gi, li) => {
      M[gi] = Mact[li];
      maalNet[gi] = maalNetAct[li];
      winPay[gi] = winPayAct[li];
      foulPay[gi] = foulPayAct[li];
      netPts[gi] = netFinal[li];
      money[gi] = moneyAct[li];
    });

    lines.unshift(`Mode: ${session.mode}${session.openMarriage ? " · Open Marriage (+4)" : ""}${better ? " · Better ×2" : ""}`);
    lines.push(`Rate R = ${rate}`);
    lines.push(`Active: ${active.map((p) => p.name).join(", ")}`);
    lines.push(`Maal used: [${active.map((p, i) => `${p.name}=${Mact[i]}`).join(", ")}]  Σ=${sum}`);
    lines.push(`Net points${better ? " (×2 Better)" : ""}: [${netFinal.join(", ")}]`);
    lines.push(`Money: [${moneyAct.join(", ")}]`);

    return {
      M, sum, maalNet, winPay, foulPay, netPts, money, lines,
      players: all, better, activeIdx, winnerLocal: wLocal,
      pendingFoulPts: pendingOut
    };
  }

  function totals(session) {
    const n = session.players.length;
    const pts = Array(n).fill(0);
    const money = Array(n).fill(0);
    (session.rounds || []).forEach((round) => {
      for (let i = 0; i < n; i += 1) {
        const cell = round.cells && round.cells[i];
        if (!cell) continue;
        pts[i] += Number(cell.netPts) || 0;
        money[i] += Number(cell.money) || 0;
      }
    });
    return {
      pts,
      money: money.map((m) => Math.round(m * 100) / 100)
    };
  }

  function commitRound(session) {
    const result = settle(session);
    const roundNum = (session.rounds || []).length + 1;
    const cells = session.players.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      face: p.face,
      maal: result.M[i],
      maalEntered: Number(p.maal) || 0,
      netPts: result.netPts[i],
      money: result.money[i],
      seen: !!p.seen,
      dublee: !!p.dublee,
      foul: !!p.foul,
      hold: !!p.hold,
      openHolder: !!p.openHolder,
      satOut: !!p.hold,
      foulPay: result.foulPay ? result.foulPay[i] : 0
    }));
    const round = {
      id: window.MG_SAFE.uid(),
      roundNum,
      better: !!session.better,
      winnerIndex: Number(session.winnerIndex) || 0,
      winnerName: session.players[session.winnerIndex]
        ? session.players[session.winnerIndex].name
        : "",
      mode: session.mode,
      rate: session.rate,
      currency: session.currency || "npr",
      openMarriage: !!session.openMarriage,
      sum: result.sum,
      cells,
      lines: result.lines.slice(),
      createdAt: Date.now()
    };
    if (!session.rounds) session.rounds = [];
    session.rounds.push(round);
    session.phase = "play";
    session.pendingBetter = roundTriggersBetter(session, cells);
    session.pendingFoulPts = (result.pendingFoulPts || []).slice();
    while (session.pendingFoulPts.length < session.players.length) session.pendingFoulPts.push(0);
    resetDraft(session);
    return {
      round,
      result,
      totals: totals(session),
      nextIsBetter: !!session.better,
      pendingFoulPts: session.pendingFoulPts.slice()
    };
  }

  function editLastRound(session) {
    if (!session.rounds || !session.rounds.length) return null;
    const round = session.rounds.pop();
    session.pendingBetter = false;
    session.pendingFoulPts = session.players.map(() => 0);
    session.better = !!round.better;
    session.mode = round.mode || session.mode;
    session.rate = Number(round.rate) >= 0 ? Number(round.rate) : session.rate;
    session.openMarriage = !!round.openMarriage;
    session.winnerIndex = Math.max(0, Math.min(session.players.length - 1, Number(round.winnerIndex) || 0));
    session.players.forEach((p, i) => {
      const c = (round.cells && round.cells[i]) || {};
      p.maal = Number(c.maalEntered != null ? c.maalEntered : c.maal) || 0;
      p.seen = c.seen != null ? !!c.seen : true;
      p.dublee = !!c.dublee;
      p.foul = !!c.foul;
      p.hold = !!c.hold || !!c.satOut;
      p.openHolder = !!c.openHolder;
      if (c.name) p.name = c.name;
      if (c.face != null) p.face = Number(c.face) % FACE_COUNT;
    });
    session.phase = "play";
    return round;
  }

  function addPlayer(session, name) {
    const i = session.players.length;
    if (i >= 10) return null;
    const used = new Set(session.players.map((p) => Number(p.face) || 0));
    const p = blankPlayer(name || ("Player " + (i + 1)), i, randomFace(used));
    session.players.push(p);
    if (!Array.isArray(session.pendingFoulPts)) session.pendingFoulPts = [];
    session.pendingFoulPts.push(0);
    (session.rounds || []).forEach((round) => {
      if (!round.cells) round.cells = [];
      while (round.cells.length < session.players.length - 1) {
        round.cells.push({
          playerId: "",
          name: "—",
          maal: 0,
          netPts: 0,
          money: 0,
          satOut: true
        });
      }
      round.cells.push({
        playerId: p.id,
        name: p.name,
        face: p.face,
        maal: 0,
        netPts: 0,
        money: 0,
        satOut: true,
        hold: true
      });
    });
    return p;
  }

  function startMatch(session) {
    session.phase = "play";
    session.rulesLocked = true;
    if (!session.rounds) session.rounds = [];
    session.pendingBetter = false;
    session.pendingFoulPts = session.players.map(() => 0);
    if (session.betterRule && session.betterRule.enabled) {
      session.betterRule.playerCount = Number(session.betterRule.playerCount) || session.players.length;
    }
    resetDraft(session);
  }

  function cycleFace(p) {
    p.face = (Number(p.face) || 0) + 1;
    if (p.face >= FACE_COUNT) p.face = 0;
    return p.face;
  }

  function shareText(session, result) {
    const r = result || settle(session);
    const tot = totals(session);
    const rows = session.players.map((p, i) =>
      `${p.name}: draft net=${r.netPts[i]}  draft ${formatMoney(r.money[i], session.currency)}  · match ${formatMoney(tot.money[i], session.currency)}`
    );
    const roundLines = (session.rounds || []).map((round) => {
      const cells = (round.cells || [])
        .map((c) => `${c.name}:${c.netPts}${round.better ? "×2" : ""}`)
        .join(" ");
      return `R${round.roundNum}${round.better ? " Better" : ""} → ${cells}`;
    });
    const rule = session.betterRule || defaultBetterRule();
    const foul = Object.assign(defaultFoulRule(), session.foulRule || {});
    return [
      "Marriage Game — match",
      ...r.lines,
      rule.enabled
        ? `Auto-Better: ${rule.playerCount}p · individual≥${rule.individualMaal} or table≥${rule.totalMaal}`
        : "Auto-Better: off",
      `Foul ${foul.foulPts}pts: ${foul.foulNextRound ? "next round" : "this round"} · unseen ${foul.unseenPts} · seen ${foul.seenPts}`,
      "",
      "Rounds:",
      ...roundLines,
      "",
      "Match totals:",
      ...session.players.map((p, i) => `${p.name}: pts=${tot.pts[i]}  ${formatMoney(tot.money[i], session.currency)}`),
      "",
      "Current draft:",
      ...rows
    ].join("\n");
  }

  window.MG_MARRIAGE_CALC = {
    FACE_COUNT,
    CURRENCIES,
    currencyOf,
    formatMoney,
    CHARACTERS,
    characterOf,
    blankPlayer,
    suggestedBetterRule,
    defaultBetterRule,
    defaultFoulRule,
    newSession,
    ensureSeen,
    settle,
    totals,
    commitRound,
    editLastRound,
    addPlayer,
    startMatch,
    resetDraft,
    cycleFace,
    randomFace,
    roundTriggersBetter,
    shareText
  };
})();
