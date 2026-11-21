/** Marriage Game — hash router + screens. */
(function () {
  const esc = (s) => window.MG_SAFE.esc(s);
  const Store = window.MG_STORE;
  const Cards = window.MG_CARDS;
  const MCalc = window.MG_MARRIAGE_CALC;
  const CBCalc = window.MG_CB_CALC;
  const CBPlay = window.MG_CB_PLAY;
  const MPlay = window.MG_MARRIAGE_PLAY;

  const root = document.getElementById("app");
  let toastTimer = null;

  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch (_) {
      toast("Copy failed — select manually");
    }
  }

  function topbar(active) {
    const link = (href, label, key) =>
      `<a href="${href}" class="${active === key ? "on" : ""}">${label}</a>`;
    return `<header class="topbar">
      <a class="brand" href="#/">Marriage Game</a>
      <nav class="nav">
        ${link("#/calc/marriage", "MPC", "mpc")}
        ${link("#/calc/callbreak", "CB scores", "cbc")}
        ${link("#/play/cb", "Play CB", "pcb")}
        ${link("#/play/marriage", "Play Marriage", "pm")}
        ${link("#/logs", "Logs", "logs")}
      </nav>
    </header>`;
  }

  function home() {
    return `${topbar("home")}
    <section class="panel">
      <p class="eyebrow">Offline · no account</p>
      <h1>Marriage point calculator — and then play.</h1>
      <p class="lede">Close the gaps: always-on Call Break scorecard, auto-seen, Open Marriage, Dublee, decimal rates, settlement math, resume logs, share scores. Play Call Break or simplified Marriage vs bots or friends (hotseat + copy/paste invite).</p>
    </section>
    <div class="home-grid">
      <a class="home-card" href="#/calc/marriage"><strong>Marriage calculator</strong><span>2–10 players · Kidnap/Murder · Open Marriage · Dublee · show the math</span></a>
      <a class="home-card" href="#/calc/callbreak"><strong>Call Break scorecard</strong><span>Running board always visible · auto-seen · mid-game edits</span></a>
      <a class="home-card" href="#/play/cb"><strong>Play Call Break</strong><span>Vs computer or hotseat friends · room code invite</span></a>
      <a class="home-card" href="#/play/marriage"><strong>Play Marriage</strong><span>Simplified deal · maal settle · bots or friends</span></a>
      <a class="home-card" href="#/logs"><strong>Game logs</strong><span>Resume old sessions · share · delete</span></a>
      <a class="home-card" href="#/invite"><strong>Join invite</strong><span>Paste a friend’s JSON room blob</span></a>
    </div>`;
  }

  /* ---------- Marriage calculator ---------- */
  function marriageCalcScreen() {
    let session = Store.getActive("marriage");
    if (!session || session.game !== "marriage-calc") {
      const st = Store.settings();
      session = MCalc.newSession({
        players: 4,
        mode: st.lastMode || "murder",
        rate: st.defaultRate,
        openMarriage: st.openMarriageDefault
      });
      Store.setActive("marriage", session);
    }

    function paint() {
      Store.setActive("marriage", session);
      const result = MCalc.settle(session);
      root.innerHTML = `${topbar("mpc")}
      <a class="crumb" href="#/">← Home</a>
      <section class="panel">
        <h1>Marriage calculator</h1>
        <p class="lede">Enter maal. Seen flips on when points/Dublee/Open are set. Settlement shows every step.</p>
        <div class="row">
          <div class="field"><label>Players</label>
            <select id="nplayers">${[2,3,4,5,6,7,8,9,10].map((n) =>
              `<option value="${n}" ${session.players.length === n ? "selected" : ""}>${n}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Mode</label>
            <select id="mode">
              <option value="murder" ${session.mode === "murder" ? "selected" : ""}>Murder (unseen maal = 0)</option>
              <option value="kidnap" ${session.mode === "kidnap" ? "selected" : ""}>Kidnap (unseen maal counts)</option>
            </select>
          </div>
          <div class="field"><label>Point rate</label>
            <input id="rate" type="number" step="0.1" min="0" value="${esc(session.rate)}" />
          </div>
          <label class="field" style="flex-direction:row;align-items:center;gap:8px;margin-top:18px">
            <input id="openm" type="checkbox" ${session.openMarriage ? "checked" : ""} /> Open Marriage (+4 hapeko)
          </label>
        </div>
      </section>
      <section class="panel">
        <div class="row spread">
          <h2>Players</h2>
          <button type="button" class="btn ghost" id="add-edit" style="color:inherit;border-color:#333;box-shadow:var(--shadow);background:var(--lamp)">Edit names</button>
        </div>
        <div class="table-wrap"><table class="board">
          <thead><tr><th class="name">Name</th><th>Maal</th><th>Seen</th><th>Dublee</th><th>Open</th><th>Foul</th><th>Winner</th></tr></thead>
          <tbody>
            ${session.players.map((p, i) => `<tr>
              <td class="name">${esc(p.name)}</td>
              <td><input data-i="${i}" class="maal" type="number" step="1" value="${esc(p.maal)}" style="width:70px" /></td>
              <td><input data-i="${i}" class="seen" type="checkbox" ${p.seen ? "checked" : ""} /></td>
              <td><input data-i="${i}" class="dublee" type="checkbox" ${p.dublee ? "checked" : ""} /></td>
              <td><input data-i="${i}" class="openh" type="checkbox" ${p.openHolder ? "checked" : ""} ${session.openMarriage ? "" : "disabled"} /></td>
              <td><input data-i="${i}" class="foul" type="checkbox" ${p.foul ? "checked" : ""} /></td>
              <td><input name="winner" data-i="${i}" type="radio" ${session.winnerIndex === i ? "checked" : ""} /></td>
            </tr>`).join("")}
          </tbody>
        </table></div>
        <div class="row">
          <button type="button" class="btn primary" id="save-log">Save to logs</button>
          <button type="button" class="btn" id="share">Share settlement</button>
          <button type="button" class="btn danger" id="reset">New sheet</button>
        </div>
      </section>
      <section class="panel">
        <h2>Settlement math</h2>
        <div class="math">${esc(result.lines.join("\n"))}</div>
        <div class="table-wrap" style="margin-top:12px"><table class="board">
          <thead><tr><th class="name">Player</th><th>Maal used</th><th>Net pts</th><th>Money</th></tr></thead>
          <tbody>${result.players.map((p, i) => `<tr>
            <td class="name">${esc(p.name)}</td>
            <td>${result.M[i]}</td>
            <td class="${result.netPts[i] >= 0 ? "win" : "lose"}">${result.netPts[i]}</td>
            <td class="${result.money[i] >= 0 ? "win" : "lose"}">${result.money[i]}</td>
          </tr>`).join("")}</tbody>
        </table></div>
      </section>`;

      const syncPlayer = (i) => {
        const p = session.players[i];
        MCalc.ensureSeen(p);
      };

      root.querySelector("#nplayers").onchange = (e) => {
        const n = Number(e.target.value);
        const names = session.players.map((p) => p.name);
        while (names.length < n) names.push("Player " + (names.length + 1));
        session.players = names.slice(0, n).map((name, i) =>
          Object.assign(MCalc.blankPlayer(name, i), session.players[i] || {})
        );
        session.players.forEach((p, i) => { p.name = names[i]; });
        if (session.winnerIndex >= n) session.winnerIndex = 0;
        paint();
      };
      root.querySelector("#mode").onchange = (e) => {
        session.mode = e.target.value;
        Store.saveSettings({ lastMode: session.mode });
        paint();
      };
      root.querySelector("#rate").onchange = (e) => {
        session.rate = Number(e.target.value) || 0;
        Store.saveSettings({ defaultRate: session.rate });
        paint();
      };
      root.querySelector("#openm").onchange = (e) => {
        session.openMarriage = e.target.checked;
        Store.saveSettings({ openMarriageDefault: session.openMarriage });
        paint();
      };
      root.querySelectorAll(".maal").forEach((inp) => {
        inp.onchange = () => {
          const i = Number(inp.dataset.i);
          session.players[i].maal = Number(inp.value) || 0;
          syncPlayer(i);
          paint();
        };
      });
      ["seen", "dublee", "openh", "foul"].forEach((cls) => {
        root.querySelectorAll("." + cls).forEach((inp) => {
          inp.onchange = () => {
            const i = Number(inp.dataset.i);
            const map = { seen: "seen", dublee: "dublee", openh: "openHolder", foul: "foul" };
            session.players[i][map[cls]] = inp.checked;
            if (cls !== "seen") syncPlayer(i);
            paint();
          };
        });
      });
      root.querySelectorAll('input[name="winner"]').forEach((inp) => {
        inp.onchange = () => {
          session.winnerIndex = Number(inp.dataset.i);
          paint();
        };
      });
      root.querySelector("#share").onclick = () => copyText(MCalc.shareText(session, result));
      root.querySelector("#save-log").onclick = () => {
        Store.upsertLog({
          id: session.id,
          game: "marriage-calc",
          title: "Marriage · " + session.players.map((p) => p.name).join(", "),
          payload: session
        });
        toast("Saved to logs");
      };
      root.querySelector("#reset").onclick = () => {
        session = MCalc.newSession({
          players: session.players.length,
          names: session.players.map((p) => p.name),
          mode: session.mode,
          rate: session.rate,
          openMarriage: session.openMarriage
        });
        paint();
      };
      root.querySelector("#add-edit").onclick = () => {
        session.players.forEach((p, i) => {
          const name = prompt("Name for seat " + (i + 1), p.name);
          if (name) p.name = name.trim() || p.name;
        });
        paint();
      };
    }
    paint();
  }

  /* ---------- Call Break calculator ---------- */
  function cbCalcScreen() {
    let session = Store.getActive("cb");
    if (!session || session.game !== "callbreak-calc") {
      session = CBCalc.newSession({ players: 4 });
      Store.setActive("cb", session);
    }

    function paint() {
      Store.setActive("cb", session);
      CBCalc.recompute(session);
      root.innerHTML = `${topbar("cbc")}
      <a class="crumb" href="#/">← Home</a>
      <div class="sticky-score">
        <div class="title">Call Break · live scorecard</div>
        <div class="scores">${session.players.map((p) =>
          `<span><strong>${esc(p.name)}</strong> ${p.total}</span>`).join("")}</div>
      </div>
      <section class="panel">
        <div class="row spread">
          <h1>Score entry</h1>
          <div class="row">
            <div class="field"><label>Players</label>
              <select id="n">${[2,3,4,5,6].map((n) =>
                `<option value="${n}" ${session.players.length === n ? "selected" : ""}>${n}</option>`).join("")}</select>
            </div>
            <button type="button" class="btn" id="edit-names">Edit names</button>
          </div>
        </div>
        <p class="lede">Seen flips on when call/tricks are entered. Board stays on screen while you play.</p>
        <div class="table-wrap"><table class="board">
          <thead><tr><th>Deal</th>${session.players.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr></thead>
          <tbody>
            ${session.deals.map((d, di) => `<tr>
              <td>#${di + 1}</td>
              ${d.scores.map((s, i) => `<td class="${s >= 0 ? "win" : "lose"}">${s}${d.seen[i] ? ' <span class="pill ok">seen</span>' : ""}</td>`).join("")}
            </tr>`).join("") || `<tr><td colspan="${session.players.length + 1}">No deals yet</td></tr>`}
            <tr>
              <td><strong>Total</strong></td>
              ${session.players.map((p) => `<td><strong class="${p.total >= 0 ? "win" : "lose"}">${p.total}</strong></td>`).join("")}
            </tr>
          </tbody>
        </table></div>
      </section>
      <section class="panel">
        <h2>Add deal</h2>
        <div class="table-wrap"><table class="board">
          <thead><tr><th class="name">Player</th><th>Call</th><th>Tricks</th></tr></thead>
          <tbody>${session.players.map((p, i) => `<tr>
            <td class="name">${esc(p.name)}</td>
            <td><input class="call" data-i="${i}" type="number" min="1" max="13" value="3" style="width:70px" /></td>
            <td><input class="tricks" data-i="${i}" type="number" min="0" max="13" value="3" style="width:70px" /></td>
          </tr>`).join("")}</tbody>
        </table></div>
        <div class="row">
          <button type="button" class="btn primary" id="add">Add deal</button>
          <button type="button" class="btn" id="share">Share</button>
          <button type="button" class="btn" id="save">Save log</button>
          <button type="button" class="btn danger" id="reset">Reset</button>
        </div>
      </section>`;

      root.querySelector("#n").onchange = (e) => {
        const n = Number(e.target.value);
        const names = session.players.map((p) => p.name);
        while (names.length < n) names.push("Player " + (names.length + 1));
        session = CBCalc.newSession({ players: n, names: names.slice(0, n) });
        paint();
      };
      root.querySelector("#edit-names").onclick = () => {
        session.players.forEach((p, i) => {
          const name = prompt("Name", p.name);
          if (name) p.name = name.trim() || p.name;
        });
        paint();
      };
      root.querySelector("#add").onclick = () => {
        const call = [...root.querySelectorAll(".call")].map((el) => Number(el.value) || 1);
        const tricks = [...root.querySelectorAll(".tricks")].map((el) => Number(el.value) || 0);
        CBCalc.addDeal(session, call, tricks);
        paint();
      };
      root.querySelector("#share").onclick = () => copyText(CBCalc.shareText(session));
      root.querySelector("#save").onclick = () => {
        Store.upsertLog({
          id: session.id,
          game: "callbreak-calc",
          title: "Call Break · " + session.players.map((p) => p.name).join(", "),
          payload: session
        });
        toast("Saved");
      };
      root.querySelector("#reset").onclick = () => {
        session = CBCalc.newSession({ players: session.players.length, names: session.players.map((p) => p.name) });
        paint();
      };
    }
    paint();
  }

  /* ---------- Call Break play ---------- */
  function cbPlayScreen() {
    let state = null;
    const saved = Store.getActive("cb");
    if (saved && saved.game === "callbreak-play") state = saved;

    function persist() {
      Store.setActive("cb", state);
    }

    function startChooser() {
      root.innerHTML = `${topbar("pcb")}
      <a class="crumb" href="#/">← Home</a>
      <section class="panel">
        <h1>Play Call Break</h1>
        <p class="lede">Four players · spades trump · five deals. Scoreboard stays visible. Friends = hotseat (pass the device) or copy/paste invite JSON.</p>
        <div class="row">
          <button type="button" class="btn primary" id="bots">Vs computer</button>
          <button type="button" class="btn" id="hotseat">With friends (hotseat)</button>
        </div>
      </section>`;
      root.querySelector("#bots").onclick = () => {
        state = CBPlay.newGame({ mode: "bots" });
        CBPlay.maybeBotBid(state);
        persist();
        paint();
      };
      root.querySelector("#hotseat").onclick = () => {
        state = CBPlay.newGame({ mode: "hotseat" });
        persist();
        paint();
      };
    }

    function paint() {
      if (!state) return startChooser();
      persist();
      const sticky = `<div class="sticky-score">
        <div class="title">Round ${state.round}/${state.maxRounds} · ${esc(state.phase)} · room ${esc(state.roomCode)}</div>
        <div class="scores">${state.names.map((n, i) =>
          `<span><strong>${esc(n)}</strong> Σ${state.totals[i]} · bid ${state.bids[i] == null ? "—" : state.bids[i]} · tricks ${state.tricksTaken[i]}</span>`).join("")}</div>
      </div>`;

      if (state.phase === "bid") {
        const seat = state.bidTurn;
        root.innerHTML = `${topbar("pcb")}${sticky}
        ${state.mode === "hotseat" ? `<div class="pass-device">Pass device to ${esc(state.names[seat])}</div>` : ""}
        <section class="panel">
          <h1>Bidding — ${esc(state.names[seat])}</h1>
          <p class="lede">Call 1–8 tricks. Spades are always trump.</p>
          <div class="hand">${state.hands[seat].map((c) => Cards.html(c, { small: true })).join("")}</div>
          <div class="row" id="bids">${[1,2,3,4,5,6,7,8].map((b) =>
            `<button type="button" class="btn" data-b="${b}">${b}</button>`).join("")}</div>
          <div class="row" style="margin-top:12px">
            <button type="button" class="btn" id="invite">Copy invite JSON</button>
            <button type="button" class="btn danger" id="quit">Quit</button>
          </div>
        </section>`;
        root.querySelectorAll("#bids .btn").forEach((btn) => {
          btn.onclick = () => {
            CBPlay.placeBid(state, seat, Number(btn.dataset.b));
            paint();
          };
        });
      } else if (state.phase === "play") {
        const seat = state.turn;
        const legal = Cards.legalCB(state.hands[seat], state.leadSuit, state.trick.map((x) => x.card)).map((c) => c.id);
        root.innerHTML = `${topbar("pcb")}${sticky}
        ${state.mode === "hotseat" ? `<div class="pass-device">Pass device to ${esc(state.names[seat])}</div>` : ""}
        <section class="panel">
          <h1>${esc(state.names[seat])} to play</h1>
          <div class="trick">${state.trick.map((t) =>
            `<div class="seat"><div class="label">${esc(state.names[t.seat])}</div>${Cards.html(t.card, { small: true })}</div>`).join("") || "<span style='opacity:.7'>Lead any card</span>"}</div>
          <div class="hand">${state.hands[seat].map((c) =>
            Cards.html(c, { playable: legal.includes(c.id), dim: !legal.includes(c.id), dataId: true })).join("")}</div>
          <div class="row">
            <button type="button" class="btn" id="invite">Copy invite JSON</button>
            <button type="button" class="btn danger" id="quit">Quit</button>
          </div>
        </section>`;
        root.querySelectorAll(".card.playable").forEach((btn) => {
          btn.onclick = () => {
            CBPlay.playCard(state, seat, btn.getAttribute("data-id"));
            paint();
          };
        });
      } else {
        root.innerHTML = `${topbar("pcb")}${sticky}
        <section class="panel">
          <h1>${state.phase === "match-end" ? "Match over" : "Deal over"}</h1>
          <p class="lede">Last deal scores: ${(state.lastDealScores || []).map((s, i) =>
            `${esc(state.names[i])}=${s}`).join(", ")}</p>
          <div class="row">
            ${state.phase === "deal-end" ? `<button type="button" class="btn primary" id="next">Next deal</button>` : ""}
            <button type="button" class="btn" id="save">Save log</button>
            <button type="button" class="btn" id="invite">Copy invite JSON</button>
            <button type="button" class="btn danger" id="quit">Home</button>
          </div>
        </section>`;
        const next = root.querySelector("#next");
        if (next) next.onclick = () => { CBPlay.nextDeal(state); paint(); };
        root.querySelector("#save").onclick = () => {
          Store.upsertLog({
            id: state.id,
            game: "callbreak-play",
            title: `CB play · R${state.round}`,
            payload: state
          });
          toast("Saved");
        };
      }

      const inv = root.querySelector("#invite");
      if (inv) inv.onclick = () => {
        const blob = CBPlay.exportInvite(state);
        Store.setInvite(blob);
        copyText(JSON.stringify(blob));
      };
      const quit = root.querySelector("#quit");
      if (quit) quit.onclick = () => {
        Store.clearActive("cb");
        state = null;
        location.hash = "#/";
      };
    }
    paint();
  }

  /* ---------- Marriage play ---------- */
  function marriagePlayScreen() {
    let state = null;
    const saved = Store.getActive("marriage");
    if (saved && saved.game === "marriage-play") state = saved;

    function start() {
      root.innerHTML = `${topbar("pm")}
      <a class="crumb" href="#/">← Home</a>
      <section class="panel">
        <h1>Play Marriage (simplified)</h1>
        <p class="lede">Teachable deal: flip a tiplu, estimate maal from each hand, settle with the full calculator rules. Not a full casino engine — great for practice + friends hotseat.</p>
        <div class="row">
          <button type="button" class="btn primary" id="bots">Vs computer</button>
          <button type="button" class="btn" id="hotseat">With friends</button>
        </div>
      </section>`;
      root.querySelector("#bots").onclick = () => {
        state = MPlay.newGame({ mode: "bots" });
        Store.setActive("marriage", state);
        paint();
      };
      root.querySelector("#hotseat").onclick = () => {
        state = MPlay.newGame({ mode: "hotseat" });
        Store.setActive("marriage", state);
        paint();
      };
    }

    function paint() {
      if (!state) return start();
      Store.setActive("marriage", state);
      const tiplu = state.tiplu;
      root.innerHTML = `${topbar("pm")}
      <a class="crumb" href="#/">← Home</a>
      <section class="panel">
        <h1>Tiplu · ${esc(Cards.label(tiplu))}</h1>
        <p class="lede">Maal is estimated from each 13-card hand for practice. Pick a winner, tweak flags, settle.</p>
        <div class="row">
          <label><input type="checkbox" id="murder" ${state.murder ? "checked" : ""} /> Murder mode</label>
          <label><input type="checkbox" id="openm" ${state.openMarriage ? "checked" : ""} /> Open Marriage</label>
          <div class="field"><label>Rate</label><input id="rate" type="number" step="0.1" value="${esc(state.rate)}" style="width:80px" /></div>
        </div>
      </section>
      <section class="panel">
        <div class="table-wrap"><table class="board">
          <thead><tr><th class="name">Player</th><th>Hand</th><th>Maal≈</th><th>Winner</th></tr></thead>
          <tbody>${state.names.map((n, i) => `<tr>
            <td class="name">${esc(n)}</td>
            <td><div class="hand">${state.hands[i].slice(0, 8).map((c) => Cards.html(c, { small: true })).join("")}<span>…</span></div></td>
            <td><input class="maal" data-i="${i}" type="number" value="${esc(state.maal[i])}" style="width:70px" /></td>
            <td><input type="radio" name="w" data-i="${i}" ${state.winnerIndex === i ? "checked" : ""} /></td>
          </tr>`).join("")}</tbody>
        </table></div>
        <div class="row">
          <button type="button" class="btn primary" id="settle">Settle</button>
          <button type="button" class="btn" id="invite">Copy invite</button>
          <button type="button" class="btn danger" id="quit">Quit</button>
        </div>
        <div id="out"></div>
      </section>`;

      root.querySelector("#murder").onchange = (e) => { state.murder = e.target.checked; };
      root.querySelector("#openm").onchange = (e) => { state.openMarriage = e.target.checked; };
      root.querySelector("#rate").onchange = (e) => { state.rate = Number(e.target.value) || 0; };
      root.querySelectorAll(".maal").forEach((inp) => {
        inp.onchange = () => { state.maal[Number(inp.dataset.i)] = Number(inp.value) || 0; };
      });
      root.querySelectorAll('input[name="w"]').forEach((inp) => {
        inp.onchange = () => { state.winnerIndex = Number(inp.dataset.i); };
      });
      root.querySelector("#settle").onclick = () => {
        const calc = MPlay.toCalcSession(state);
        const r = MCalc.settle(calc);
        Store.upsertLog({ id: state.id, game: "marriage-play", title: "Marriage play settle", payload: { state, result: r } });
        root.querySelector("#out").innerHTML = `<div class="math">${esc(r.lines.join("\n"))}</div>
          <table class="board"><thead><tr><th>Player</th><th>Net</th><th>Money</th></tr></thead>
          <tbody>${r.players.map((p, i) => `<tr><td>${esc(p.name)}</td><td class="${r.netPts[i] >= 0 ? "win" : "lose"}">${r.netPts[i]}</td><td>${r.money[i]}</td></tr>`).join("")}</tbody></table>`;
      };
      root.querySelector("#invite").onclick = () => copyText(JSON.stringify(MPlay.exportInvite(state)));
      root.querySelector("#quit").onclick = () => {
        Store.clearActive("marriage");
        state = null;
        location.hash = "#/";
      };
    }
    paint();
  }

  function logsScreen() {
    const list = Store.logs();
    root.innerHTML = `${topbar("logs")}
    <a class="crumb" href="#/">← Home</a>
    <section class="panel">
      <h1>Logs</h1>
      <p class="lede">Resume a saved calculator or play session from this device.</p>
      ${list.length ? `<div class="table-wrap"><table class="board">
        <thead><tr><th class="name">Title</th><th>Game</th><th></th></tr></thead>
        <tbody>${list.map((row) => `<tr>
          <td class="name">${esc(row.title || row.id)}</td>
          <td>${esc(row.game)}</td>
          <td class="row">
            <button type="button" class="btn" data-resume="${esc(row.id)}">Resume</button>
            <button type="button" class="btn" data-share="${esc(row.id)}">Share</button>
            <button type="button" class="btn danger" data-del="${esc(row.id)}">Delete</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : `<p>No logs yet.</p>`}
    </section>`;

    root.querySelectorAll("[data-resume]").forEach((btn) => {
      btn.onclick = () => {
        const row = list.find((x) => x.id === btn.getAttribute("data-resume"));
        if (!row) return;
        if (String(row.game).includes("callbreak")) {
          Store.setActive("cb", row.payload);
          location.hash = row.game === "callbreak-play" ? "#/play/cb" : "#/calc/callbreak";
        } else {
          Store.setActive("marriage", row.payload.state || row.payload);
          location.hash = row.game === "marriage-play" ? "#/play/marriage" : "#/calc/marriage";
        }
      };
    });
    root.querySelectorAll("[data-share]").forEach((btn) => {
      btn.onclick = () => {
        const row = list.find((x) => x.id === btn.getAttribute("data-share"));
        if (row) copyText(JSON.stringify(row, null, 2));
      };
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = () => {
        Store.deleteLog(btn.getAttribute("data-del"));
        logsScreen();
      };
    });
  }

  function inviteScreen() {
    root.innerHTML = `${topbar("invite")}
    <a class="crumb" href="#/">← Home</a>
    <section class="panel">
      <h1>Join invite</h1>
      <p class="lede">Paste a room JSON from a friend (same-session sync only — no server).</p>
      <div class="field"><label>Invite JSON</label><textarea id="blob" placeholder='{"code":"ABC123","game":"callbreak-play",...}'></textarea></div>
      <button type="button" class="btn primary" id="go">Load</button>
    </section>`;
    root.querySelector("#go").onclick = () => {
      try {
        const blob = JSON.parse(root.querySelector("#blob").value);
        if (!blob || !blob.state) throw new Error("bad");
        if (String(blob.game).includes("callbreak")) {
          Store.setActive("cb", blob.state);
          location.hash = "#/play/cb";
        } else {
          Store.setActive("marriage", blob.state);
          location.hash = "#/play/marriage";
        }
      } catch (_) {
        toast("Invalid invite JSON");
      }
    };
  }

  function route() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const parts = hash.split("/").filter(Boolean);
    if (!parts.length) return void (root.innerHTML = home());
    if (parts[0] === "calc" && parts[1] === "marriage") return marriageCalcScreen();
    if (parts[0] === "calc" && parts[1] === "callbreak") return cbCalcScreen();
    if (parts[0] === "play" && parts[1] === "cb") return cbPlayScreen();
    if (parts[0] === "play" && parts[1] === "marriage") return marriagePlayScreen();
    if (parts[0] === "logs") return logsScreen();
    if (parts[0] === "invite") return inviteScreen();
    root.innerHTML = home();
  }

  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
