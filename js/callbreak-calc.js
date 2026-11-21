/** Call Break scorecard — always-visible running totals; auto-seen on entry. */
(function () {
  function scoreDeal(call, tricks) {
    const C = Number(call);
    const T = Number(tricks);
    if (!Number.isFinite(C) || !Number.isFinite(T)) return 0;
    if (T >= C) return Math.round((C + 0.1 * (T - C)) * 10) / 10;
    return -C;
  }

  function blankPlayer(name, i) {
    return { id: "p" + i, name: name || ("Player " + (i + 1)), total: 0 };
  }

  function newSession(opts) {
    const o = opts || {};
    const n = Math.max(2, Math.min(10, Number(o.players) || 4));
    return {
      id: window.MG_SAFE.uid(),
      game: "callbreak-calc",
      players: Array.from({ length: n }, (_, i) => blankPlayer((o.names || [])[i], i)),
      deals: [], // { call:[], tricks:[], scores:[], seen:[] }
      createdAt: Date.now()
    };
  }

  function addDeal(session, call, tricks) {
    const n = session.players.length;
    const c = call.slice(0, n);
    const t = tricks.slice(0, n);
    while (c.length < n) c.push(1);
    while (t.length < n) t.push(0);
    const scores = c.map((ci, i) => scoreDeal(ci, t[i]));
    const seen = scores.map((s, i) => Number(t[i]) > 0 || Number(c[i]) > 0);
    session.deals.push({ call: c, tricks: t, scores, seen });
    recompute(session);
    return session;
  }

  function updateDeal(session, dealIndex, patch) {
    const d = session.deals[dealIndex];
    if (!d) return session;
    Object.assign(d, patch);
    if (patch.call || patch.tricks) {
      d.scores = d.call.map((ci, i) => scoreDeal(ci, d.tricks[i]));
      d.seen = d.scores.map((_, i) => Number(d.tricks[i]) > 0 || Number(d.call[i]) > 0 || !!d.seen[i]);
    }
    recompute(session);
    return session;
  }

  function recompute(session) {
    session.players.forEach((p) => { p.total = 0; });
    session.deals.forEach((d) => {
      d.scores.forEach((s, i) => {
        if (session.players[i]) session.players[i].total = Math.round((session.players[i].total + s) * 10) / 10;
      });
    });
  }

  function shareText(session) {
    const head = ["Call Break scorecard", session.players.map((p) => p.name).join(" | ")];
    const totals = "Totals: " + session.players.map((p) => `${p.name} ${p.total}`).join(", ");
    const deals = session.deals.map((d, i) =>
      `Deal ${i + 1}: ` + d.scores.map((s, j) => `${session.players[j].name}=${s}`).join(", ")
    );
    return [...head, totals, ...deals].join("\n");
  }

  window.MG_CB_CALC = { scoreDeal, blankPlayer, newSession, addDeal, updateDeal, recompute, shareText };
})();
