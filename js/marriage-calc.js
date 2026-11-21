/**
 * Marriage settlement calculator.
 * Maal entered per player; Murder zeros unseen; Kidnap keeps unseen maal.
 * Open Marriage: +4 hapeko on holder. Dublee finish: +5 from each opponent to winner.
 */
(function () {
  function blankPlayer(name, i) {
    return {
      id: "p" + i,
      name: name || ("Player " + (i + 1)),
      maal: 0,
      seen: false,
      dublee: false,
      openHolder: false,
      foul: false
    };
  }

  function newSession(opts) {
    const o = opts || {};
    const n = Math.max(2, Math.min(10, Number(o.players) || 4));
    const names = o.names || [];
    return {
      id: window.MG_SAFE.uid(),
      game: "marriage-calc",
      mode: o.mode || "murder", // murder | kidnap
      rate: Number(o.rate) >= 0 ? Number(o.rate) : 1,
      openMarriage: !!o.openMarriage,
      winnerIndex: 0,
      players: Array.from({ length: n }, (_, i) => blankPlayer(names[i], i)),
      rounds: [],
      createdAt: Date.now()
    };
  }

  function ensureSeen(p) {
    if (Number(p.maal) > 0 || p.dublee || p.openHolder) p.seen = true;
  }

  /**
   * Net points before rate.
   * 1) Adjust maal: open +4; foul zeros maal.
   * 2) Murder: unseen maal treated as 0 for that player.
   * 3) Maal settle: each player's net = n*M_i - sum(M)  (pairwise diff).
   * 4) Win pays: each other pays winner 3 if seen else 10; +5 each if winner dublee.
   */
  function settle(session) {
    const players = session.players.map((p) => Object.assign({}, p));
    players.forEach(ensureSeen);
    const n = players.length;
    const M = players.map((p) => {
      if (p.foul) return 0;
      let m = Number(p.maal) || 0;
      if (session.mode === "murder" && !p.seen) m = 0;
      if (session.openMarriage && p.openHolder) m += 4;
      return m;
    });
    const sum = M.reduce((a, b) => a + b, 0);
    const maalNet = M.map((m) => n * m - sum);

    const w = Math.max(0, Math.min(n - 1, Number(session.winnerIndex) || 0));
    const winPay = players.map(() => 0);
    for (let i = 0; i < n; i += 1) {
      if (i === w) continue;
      let pay = players[i].seen ? 3 : 10;
      if (players[w].dublee) pay += 5;
      winPay[i] -= pay;
      winPay[w] += pay;
    }

    const netPts = maalNet.map((m, i) => m + winPay[i]);
    const rate = Number(session.rate) || 0;
    const money = netPts.map((p) => Math.round(p * rate * 100) / 100);

    const lines = [];
    lines.push(`Mode: ${session.mode}${session.openMarriage ? " · Open Marriage (+4 hapeko)" : ""}`);
    lines.push(`Rate R = ${rate}`);
    lines.push(`Maal used: [${M.map((m, i) => `${players[i].name}=${m}`).join(", ")}]  Σ=${sum}`);
    lines.push(`Maal net (n·Mᵢ − Σ): [${maalNet.join(", ")}]`);
    lines.push(`Win pays to ${players[w].name}: seen→3 / unseen→10` + (players[w].dublee ? " + Dublee 5" : ""));
    lines.push(`Win pay vector: [${winPay.join(", ")}]`);
    lines.push(`Net points: [${netPts.join(", ")}]`);
    lines.push(`Money (= net × R): [${money.join(", ")}]`);

    return { M, sum, maalNet, winPay, netPts, money, lines, players };
  }

  function shareText(session, result) {
    const r = result || settle(session);
    const rows = r.players.map((p, i) =>
      `${p.name}: maal=${r.M[i]}  net=${r.netPts[i]}  ₹${r.money[i]}`
    );
    return [`Marriage Game — settlement`, ...r.lines, "", ...rows].join("\n");
  }

  window.MG_MARRIAGE_CALC = { blankPlayer, newSession, ensureSeen, settle, shareText };
})();
