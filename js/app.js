/** Marriage Game — hash router + screens. */
(function () {
  const esc = (s) => window.MG_SAFE.esc(s);
  const Store = window.MG_STORE;
  const Cards = window.MG_CARDS;
  const MCalc = window.MG_MARRIAGE_CALC;
  const CBCalc = window.MG_CB_CALC;
  const CBPlay = window.MG_CB_PLAY;
  const MPlay = window.MG_MARRIAGE_PLAY;
  const Live = window.MG_LIVE;

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

  function appBar(opts) {
    const o = opts || {};
    const homeLink = o.showHome
      ? `<a class="app-bar-home crumb" href="#/">Home</a>`
      : `<span></span>`;
    return `<header class="app-bar mpc-header">
      <a class="app-bar-brand" href="#/">Marriage Game</a>
      ${homeLink}
    </header>`;
  }

  /** Crimson app bar with Home — used by calc/play/logs/invite. */
  function topbar(_active) {
    return appBar({ showHome: true });
  }

  function home() {
    return `${appBar()}
    <section class="home-hero screen-pad">
      <div class="logo-fan" aria-hidden="true"><span></span><span></span><span></span></div>
      <h1 class="tool-title">Marriage Game</h1>
      <p class="tool-sub">Offline · no ads · real settle math</p>
      <nav class="menu-tiles" aria-label="Main menu">
        <a class="menu-tile" href="#/calc/marriage"><strong>Marriage calculator</strong><span>Standing · maal · Murder/Kidnap · settle</span></a>
        <a class="menu-tile" href="#/calc/callbreak"><strong>Call Break scores</strong><span>Live totals · next hand · rounds</span></a>
        <a class="menu-tile" href="#/play/cb"><strong>Play CB</strong><span>Bots or hotseat · pass the device</span></a>
        <a class="menu-tile" href="#/play/marriage"><strong>Play Marriage</strong><span>21 cards · pull discard/deck · sequences</span></a>
        <a class="menu-tile" href="#/logs"><strong>Logs</strong><span>Resume saved sheets</span></a>
        <a class="menu-tile" href="#/invite"><strong>Invite</strong><span>Paste room JSON · join hotseat</span></a>
      </nav>
    </section>`;
  }

  /* ---------- Marriage calculator ---------- */
  function marriageStatusOf(p) {
    if (p.foul) return p.seen ? "foul_seen" : "foul_unseen";
    if (p.hold) return "hold";
    if (p.dublee) return "dublee";
    if (p.seen) return "seen";
    return "unseen";
  }

  function marriageApplyStatus(p, status) {
    p.foul = false;
    p.dublee = false;
    p.hold = false;
    if (status === "foul_seen") {
      p.foul = true;
      p.seen = true;
    } else if (status === "foul_unseen" || status === "foul") {
      p.foul = true;
      p.seen = false;
    } else if (status === "dublee") {
      p.seen = true;
      p.dublee = true;
    } else if (status === "seen") {
      p.seen = true;
    } else if (status === "hold") {
      p.seen = false;
      p.hold = true;
    } else {
      p.seen = false;
    }
  }

  function marriageModeSub(session) {
    if (session.mode === "kidnap") return "Kidnap: unseen maal still counts";
    return "Murder: unseen maal is zeroed";
  }

  function marriageMigrate(session) {
    if (!session.rounds) session.rounds = [];
    if (!session.phase) session.phase = session.rounds.length ? "play" : "setup";
    if (typeof session.better !== "boolean") session.better = false;
    if (typeof session.pendingBetter !== "boolean") session.pendingBetter = false;
    if (!session.betterRule) session.betterRule = MCalc.defaultBetterRule();
    if (session.betterRule.playerCount == null) {
      session.betterRule.playerCount = session.players.length;
    }
    if (!session.foulRule) session.foulRule = MCalc.defaultFoulRule();
    if (typeof session.rulesLocked !== "boolean") {
      session.rulesLocked = session.phase === "play" || !!(session.rounds && session.rounds.length);
    }
    if (!session.currency) session.currency = (Store.settings().defaultCurrency) || "npr";
    session.currency = MCalc.currencyOf(session.currency).id;
    if (!Array.isArray(session.pendingFoulPts)) {
      session.pendingFoulPts = session.players.map(() => 0);
    }
    while (session.pendingFoulPts.length < session.players.length) session.pendingFoulPts.push(0);
    session.players.forEach((p, i) => {
      if (!p.id) p.id = "p" + i;
      if (typeof p.hold !== "boolean") p.hold = false;
      if (p.face == null) p.face = i % (MCalc.FACE_COUNT || 10);
      else p.face = Number(p.face) % (MCalc.FACE_COUNT || 10);
    });
    return session;
  }

  function marriageAvatarImg(face, size, className, title) {
    const Av = window.MG_Avatar;
    if (Av && typeof Av.imgHtml === "function") {
      return Av.imgHtml(face, size, className || "", title || "");
    }
    const ch = MCalc.characterOf(face);
    return `<span class="avatar-fallback face-${Number(face) || 0}" title="${esc(title || ch.name)}">${esc(ch.glyph)}</span>`;
  }

  function marriageSeenMark(seen) {
    if (seen) {
      return `<span class="scores-mark seen" title="Seen" aria-label="Seen"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 5c-5.2 0-9.5 3.4-11 7 1.5 3.6 5.8 7 11 7s9.5-3.4 11-7c-1.5-3.6-5.8-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-3.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z"/></svg></span>`;
    }
    return `<span class="scores-mark unseen" title="Unseen" aria-label="Unseen"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M2.1 3.5 3.5 2.1l18.4 18.4-1.4 1.4-3.2-3.2A12.6 12.6 0 0 1 12 19c-5.2 0-9.5-3.4-11-7a13.4 13.4 0 0 1 4.6-5.3L2.1 3.5zM12 7a5 5 0 0 1 4.9 4.1l-1.6-1.6A3.2 3.2 0 0 0 12 8.8c-.4 0-.8.1-1.1.2L9.2 7.3A4.8 4.8 0 0 1 12 7zm9.9 5c-.4 1-1.1 2-2 2.9l-1.5-1.5c.5-.4.9-.9 1.2-1.4-1.5-3.6-5.8-7-11-7-.7 0-1.4.1-2 .2L5.4 4c2-0.7 4.2-1 6.6-1 5.2 0 9.5 3.4 11 7z"/></svg></span>`;
  }

  function marriageFaceBtn(p, i) {
    const face = Number(p.face) || 0;
    const ch = MCalc.characterOf(face);
    return `<button type="button" class="char-icon face-${face}" data-face="${i}" title="${esc(ch.name)} — tap to change" aria-label="Change character for ${esc(p.name)} (${esc(ch.name)})">
      ${marriageAvatarImg(face, 40, "char-avatar", ch.name)}
    </button>`;
  }

  function marriageSeatHtml(p, i, session) {
    const isWin = session.winnerIndex === i;
    const status = marriageStatusOf(p);
    const statusOpts = [
      ["seen", "Seen"],
      ["unseen", "Unseen"],
      ["dublee", "Dublee"],
      ["foul_seen", "Foul seen"],
      ["foul_unseen", "Foul unseen"],
      ["hold", "Hold"]
    ].map(([v, lab]) => `<option value="${v}" ${status === v ? "selected" : ""}>${lab}</option>`).join("");
    const openToggle = session.openMarriage
      ? `<label class="open-check"><input type="checkbox" class="open-holder" data-i="${i}" ${p.openHolder ? "checked" : ""} /> Open</label>`
      : "";
    const winCtl = isWin
      ? `<span class="winner-badge" aria-current="true">Winner</span>`
      : `<button type="button" class="seat-winner-btn soft-btn outline" data-winner="${i}">Set winner</button>`;
    return `<div class="player-row seat seat-${i}${isWin ? " winner" : ""}${p.hold ? " is-hold" : ""}" data-i="${i}">
      <div class="player-row-head">
        ${marriageFaceBtn(p, i)}
        <input class="seat-name" data-i="${i}" type="text" value="${esc(p.name)}" aria-label="Player ${i + 1} name" />
        ${winCtl}
      </div>
      <div class="player-row-body">
        <div class="maal-stepper" aria-label="Maal">
          <button type="button" class="maal-dec" data-i="${i}" aria-label="Decrease maal">−</button>
          <input data-i="${i}" class="maal" type="number" step="1" value="${esc(p.maal)}" aria-label="Maal" ${p.hold ? "disabled" : ""} />
          <button type="button" class="maal-inc" data-i="${i}" aria-label="Increase maal">+</button>
        </div>
        <select class="status-select seat-status" data-i="${i}" aria-label="Status">${statusOpts}</select>
        ${openToggle}
      </div>
    </div>`;
  }

  /** Match standing = cumulative totals across committed rounds. */
  function marriageStandingHtml(session, tot) {
    const last = (session.rounds || [])[(session.rounds || []).length - 1];
    const order = session.players
      .map((p, i) => ({ p, i, money: tot.money[i] || 0, pts: tot.pts[i] || 0 }))
      .sort((a, b) => b.money - a.money || b.pts - a.pts || a.i - b.i);
    const leader = order[0];
    return `<ol class="standing">
      ${order.map((row, rank) => {
        const face = Number(row.p.face) || 0;
        const ch = MCalc.characterOf(face);
        const isLead = leader && row.i === leader.i && ((session.rounds || []).length > 0);
        const wonLast = last && Number(last.winnerIndex) === row.i;
        const lastCell = last && last.cells && last.cells[row.i];
        const lastMaal = lastCell && !lastCell.satOut
          ? (lastCell.maalEntered != null ? lastCell.maalEntered : lastCell.maal)
          : null;
        const pts = row.pts;
        const money = row.money;
        const dir = pts > 0 || money > 0 ? "up" : pts < 0 || money < 0 ? "down" : "";
        const ptsLabel = `${pts > 0 ? "+" : ""}${pts}`;
        const rsLabel = MCalc.formatMoney(money, session.currency);
        const under = last
          ? `<span class="standing-under">${wonLast ? '<span class="crown" title="Won last round">♛</span> ' : ""}maal ${lastMaal == null ? "—" : lastMaal}</span>`
          : "";
        return `<li class="standing-row${dir ? " " + dir : ""}${isLead ? " winner" : ""}">
          <span class="standing-rank">${rank + 1}</span>
          <span class="standing-avatar face-${face}" aria-hidden="true" title="${esc(ch.name)}">${marriageAvatarImg(face, 28, "standing-avatar-img", ch.name)}</span>
          <span class="standing-who">
            <span class="standing-name">${esc(row.p.name)}${isLead ? ' <span class="crown" title="Leading">♛</span>' : ""}</span>
            ${under}
          </span>
          <span class="standing-pts${dir ? " " + dir : ""}">${ptsLabel}</span>
          <span class="standing-rs">${rsLabel}</span>
        </li>`;
      }).join("")}
    </ol>`;
  }

  function marriageBetterRuleHtml(session, opts) {
    const o = opts || {};
    const n = session.players.length;
    const rule = session.betterRule || MCalc.suggestedBetterRule(n);
    const ruleN = Number(rule.playerCount) || n;
    const compact = !!o.compact;
    const suggest = MCalc.suggestedBetterRule(ruleN);
    return `<section class="tool-panel better-rule-panel" aria-label="Better point rule">
      <p class="section-label">Better point rule</p>
      <div class="field"><label for="player-count">Players at table</label>
        <input id="player-count" type="number" min="2" max="10" step="1" value="${esc(n)}" ${compact ? "disabled" : ""} />
      </div>
      <label class="soft-check">
        <input id="better-rule-on" type="checkbox" ${rule.enabled ? "checked" : ""} />
        Use custom Better rule (next round ×2)
      </label>
      ${compact
        ? `<p class="field-hint">${rule.enabled
          ? `On only if <strong>${esc(ruleN)} players</strong> play: individual ≥${esc(rule.individualMaal)} or table ≥${esc(rule.totalMaal)} → next deal Better.`
          : "Off — turn on in setup or below."}</p>`
        : `<p class="field-hint">Only fires when <strong>player count matches</strong> and a threshold is hit. Example: <strong>${suggest.playerCount}p</strong> → individual <strong>${suggest.individualMaal}</strong> or table <strong>${suggest.totalMaal}</strong> → next round ×2.</p>`}
      <div class="better-rule-fields"${rule.enabled ? "" : " hidden"}>
        <div class="field"><label for="better-players">Rule player count</label>
          <input id="better-players" type="number" min="2" max="10" step="1" value="${esc(ruleN)}" />
        </div>
        <div class="field"><label for="better-ind">Individual maal</label>
          <input id="better-ind" type="number" min="1" step="1" value="${esc(rule.individualMaal)}" />
        </div>
        <div class="field"><label for="better-tot">Table maal total</label>
          <input id="better-tot" type="number" min="1" step="1" value="${esc(rule.totalMaal)}" />
        </div>
        ${compact ? "" : `<button type="button" class="soft-btn outline" id="better-fill-defaults">Use ${ruleN}-player defaults (${suggest.individualMaal}/${suggest.totalMaal})</button>`}
      </div>
    </section>`;
  }

  function marriageFoulRuleHtml(session, opts) {
    const o = opts || {};
    const rule = session.foulRule || MCalc.defaultFoulRule();
    return `<section class="tool-panel foul-rule-panel" aria-label="Foul point rule">
      <p class="section-label">Foul point rule</p>
      <label class="soft-check">
        <input id="foul-next-round" type="checkbox" ${rule.foulNextRound ? "checked" : ""} />
        Foul ${esc(rule.foulPts)} pts applies to <strong>next</strong> round
      </label>
      <p class="field-hint">Set before kickoff. In play, pick <strong>Foul seen</strong> or <strong>Foul unseen</strong> on each seat. Pays maal + foul pts; flat foul goes next round when checked (default).</p>
      <div class="better-rule-fields">
        <div class="field"><label for="foul-unseen">Foul unseen pts</label>
          <input id="foul-unseen" type="number" min="0" step="1" value="${esc(rule.unseenPts)}" />
        </div>
        <div class="field"><label for="foul-seen">Foul seen pts</label>
          <input id="foul-seen" type="number" min="0" step="1" value="${esc(rule.seenPts)}" />
        </div>
        <div class="field"><label for="foul-flat">Flat foul pts</label>
          <input id="foul-flat" type="number" min="0" step="1" value="${esc(rule.foulPts)}" />
        </div>
      </div>
    </section>`;
  }

  function shareDockHtml(opts) {
    const o = opts || {};
    const viewUrl = o.viewUrl || "";
    const hostUrl = o.hostUrl || "";
    const hosting = !!o.hosting;
    const readOnly = !!o.readOnly;
    if (readOnly) {
      return `<section class="tool-panel share-dock" aria-label="Share">
        <p class="section-label">Live scorecard</p>
        <p class="field-hint">You are watching · host controls the sheet.</p>
        <button type="button" class="soft-btn" id="share-text">Copy score text</button>
      </section>`;
    }
    return `<section class="tool-panel share-dock" aria-label="Share">
      <p class="section-label">Share / host this scorecard</p>
      <p class="field-hint">Host live, then copy a link and text it. View = read only · Host = can edit.</p>
      <div class="share-link-row">
        <label class="share-link-label" for="view-link">View link</label>
        <input class="share-link-input" id="view-link" readonly value="${esc(viewUrl)}" placeholder="Tap Host live first" />
        <button type="button" class="soft-btn primary" id="copy-view-link">Copy view</button>
      </div>
      <div class="share-link-row">
        <label class="share-link-label" for="host-link">Host link</label>
        <input class="share-link-input" id="host-link" readonly value="${esc(hostUrl)}" placeholder="Tap Host live first" />
        <button type="button" class="soft-btn outline" id="copy-host-link">Copy host</button>
      </div>
      <div class="share-dock-actions">
        <button type="button" class="soft-btn primary" id="host-live">${hosting ? "Refresh live links" : "Host live"}</button>
        <button type="button" class="soft-btn" id="share-text">Copy score text</button>
      </div>
    </section>`;
  }

  function marriageGateHtml(session) {
    const n = (session.rounds || []).length;
    const names = session.players.map((p) => p.name).join(", ");
    const modeLabel = session.mode === "kidnap" ? "Kidnap" : "Murder";
    return `${appBar({ showHome: true })}
    <div class="screen-pad">
      <header class="tool-header">
        <h1 class="tool-title">Marriage Points</h1>
        <p class="tool-sub">Pick up where you left off, or start clean. Starting new saves the current match to logs.</p>
      </header>
      <section class="tool-panel gate-card" aria-label="Resume or new">
        <p class="gate-meta">${esc(modeLabel)} · ${n} round${n === 1 ? "" : "s"}</p>
        <p class="gate-names">${esc(names)}</p>
        <div class="cta-stack">
          <button type="button" class="soft-btn primary" id="gate-continue">Continue previous game</button>
          <button type="button" class="soft-btn outline" id="gate-new">Start new from scratch</button>
        </div>
      </section>
    </div>`;
  }

  function marriageLogTitle(session) {
    const n = (session.rounds || []).length;
    const names = (session.players || []).map((p) => p.name).join(", ");
    return `Marriage · ${names || "table"} · ${n}r`;
  }

  function marriageWorthArchiving(session) {
    if (!session || session.game !== "marriage-calc") return false;
    return !!(session.rounds && session.rounds.length > 0);
  }

  function archiveMarriageSession(session) {
    if (!marriageWorthArchiving(session)) return null;
    return Store.upsertLog({
      id: session.id,
      game: "marriage-calc",
      title: marriageLogTitle(session),
      payload: Live.cloneSession(session)
    });
  }

  function marriageLiveBannerHtml(info) {
    if (!info || !info.role) return "";
    if (info.role === "host") {
      return `<div class="live-banner host" role="status">Live host · keep this tab open${info.status ? " · " + esc(info.status) : ""}</div>`;
    }
    if (info.role === "viewer") {
      return `<div class="live-banner viewer" role="status">Watching live · read only${info.status ? " · " + esc(info.status) : ""}</div>`;
    }
    if (info.role === "review") {
      return `<div class="live-banner review" role="status">
        <span>Reviewing saved match · read only</span>
        <button type="button" class="soft-btn outline" id="exit-review">Back to calculator</button>
      </div>`;
    }
    if (info.role === "claiming") {
      return `<div class="live-banner host" role="status">Claiming host…${info.status ? " · " + esc(info.status) : ""}</div>`;
    }
    return "";
  }

  function marriageLogsPanelHtml(activeId, opts) {
    const o = opts || {};
    const list = Store.logsByGame("marriage-calc");
    if (!list.length) {
      return `<section class="tool-panel calc-logs" aria-label="Match logs">
        <p class="section-label">Match logs</p>
        <p class="field-hint">When you start a new match, the previous one is saved here.</p>
      </section>`;
    }
    const rows = list.slice(0, 15).map((row) => {
      const when = row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "";
      const n = row.payload && row.payload.rounds ? row.payload.rounds.length : 0;
      return `<article class="calc-log-row${row.id === activeId ? " is-active" : ""}">
        <div class="calc-log-main">
          <strong>${esc(row.title || row.id)}</strong>
          <span class="calc-log-meta">${esc(when)}${n ? ` · ${n} rounds` : ""}</span>
        </div>
        <div class="calc-log-actions">
          <button type="button" class="soft-btn outline" data-log-review="${esc(row.id)}">Review</button>
          ${o.canEdit ? `<button type="button" class="soft-btn" data-log-resume="${esc(row.id)}">Resume</button>` : ""}
          ${o.canEdit ? `<button type="button" class="soft-btn danger" data-log-del="${esc(row.id)}">Delete</button>` : ""}
        </div>
      </article>`;
    }).join("");
    return `<section class="tool-panel calc-logs" aria-label="Match logs">
      <p class="section-label">Match logs</p>
      <div class="calc-log-list">${rows}</div>
    </section>`;
  }

  function marriageRoundsTableHtml(session) {
    const rounds = session.rounds || [];
    if (!rounds.length) {
      return `<section class="score-card" aria-label="Rounds">
        <h2 class="score-card-head">Rounds <span class="score-sum">none yet</span></h2>
        <p class="tool-sub" style="padding:0 12px 12px;margin:0">Add a round below — each game stays on its own line.</p>
      </section>`;
    }
    const head = `<tr><th>#</th>${session.players.map((p) => {
      const face = Number(p.face) || 0;
      const ch = MCalc.characterOf(face);
      return `<th class="name"><span class="col-player">${marriageAvatarImg(face, 22, "col-avatar", ch.name)}<span class="col-name">${esc(p.name)}</span></span></th>`;
    }).join("")}</tr>`;
    const body = rounds.map((round, ri) => {
      const isLast = ri === rounds.length - 1;
      const cells = session.players.map((_, i) => {
        const c = (round.cells && round.cells[i]) || { netPts: 0, money: 0, satOut: true, maal: 0, seen: true };
        const pts = Number(c.netPts) || 0;
        const dir = pts > 0 ? "up" : pts < 0 ? "down" : "";
        const won = Number(round.winnerIndex) === i && !c.satOut;
        const maalShow = c.satOut ? "—" : (c.maalEntered != null ? c.maalEntered : c.maal);
        const ptsLab = c.satOut ? "—" : `${pts > 0 ? "+" : ""}${pts}`;
        const mark = c.satOut
          ? `<span class="scores-mark hold" title="Hold">—</span>`
          : `${marriageSeenMark(!!c.seen)}${won ? '<span class="crown" title="Winner">♛</span>' : ""}`;
        return `<td class="round-cell ${dir}${won ? " is-winner-cell" : ""}${c.satOut ? " is-hold-cell" : ""}">
          <div class="cell-marks">${mark}</div>
          <div class="cell-pts">${ptsLab}</div>
          <div class="cell-maal">maal ${maalShow}</div>
        </td>`;
      }).join("");
      const badge = round.better ? `<span class="round-badge better">Better ×2</span>` : "";
      return `<tr class="${isLast ? "is-last-round" : ""}">
        <td class="round-num-cell">
          <span class="round-num">${round.roundNum}</span>${badge}
          ${isLast ? `<button type="button" class="soft-btn outline edit-last-btn" id="edit-last-inline" title="Edit last round">Edit</button>` : ""}
        </td>
        ${cells}
      </tr>`;
    }).join("");
    const tot = MCalc.totals(session);
    const totalRow = `<tr class="totals-row">
      <th>Total</th>
      ${session.players.map((_, i) => {
        const pts = tot.pts[i] || 0;
        const dir = pts > 0 ? "up" : pts < 0 ? "down" : "";
        return `<th class="${dir}"><div class="cell-pts">${pts > 0 ? "+" : ""}${pts}</div><div class="cell-maal">${MCalc.formatMoney(tot.money[i], session.currency)}</div></th>`;
      }).join("")}
    </tr>`;
    return `<section class="score-card" id="rounds-card" aria-label="Rounds">
      <h2 class="score-card-head">Rounds <span class="score-sum">${rounds.length}</span></h2>
      <div class="score-card-body table-wrap">
        <table class="score-table rounds-table">
          <thead>${head}</thead>
          <tbody>${body}${totalRow}</tbody>
        </table>
      </div>
      <div class="score-card-actions">
        <button type="button" class="soft-btn outline" id="edit-last">Edit last round</button>
      </div>
    </section>`;
  }

  function marriageDraftCardHtml(session, result) {
    const nextNum = (session.rounds || []).length + 1;
    const rows = result.players.map((p, i) => {
      const money = result.money[i];
      const pts = result.netPts[i];
      const mCls = money > 0 ? "up" : money < 0 ? "down" : "";
      const pCls = pts > 0 ? "up" : pts < 0 ? "down" : "";
      return `<tr>
        <td>${esc(p.name)}${p.hold ? " <em class=\"muted\">hold</em>" : ""}</td>
        <td>${result.M[i]}</td>
        <td class="${pCls}">${pts > 0 ? "+" : ""}${pts}</td>
        <td class="${mCls}">${MCalc.formatMoney(money, session.currency)}</td>
      </tr>`;
    }).join("");
    const cur = MCalc.currencyOf(session.currency);
    return `<section class="score-card" id="score-card" aria-label="This round draft">
      <h2 class="score-card-head">Round ${nextNum} draft ${session.better ? "<span class=\"round-badge better\">Better ×2</span>" : ""}
        <span class="score-sum">· maal ${result.sum} · ${esc(cur.code)}</span></h2>
      <div class="score-card-body">
        <table class="score-table">
          <thead><tr><th>Player</th><th>Maal</th><th>Pts</th><th>${esc(cur.code)}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }

  function marriageSetupHtml(session) {
    const rows = session.players.map((p, i) => `
      <li class="roster-row">
        ${marriageFaceBtn(p, i)}
        <input class="seat-name" data-i="${i}" type="text" value="${esc(p.name)}" aria-label="Player ${i + 1}" />
        <button type="button" class="soft-btn danger" data-remove="${i}" ${session.players.length <= 2 ? "disabled" : ""}>Remove</button>
      </li>`).join("");
    return `${appBar({ showHome: true })}
    <div class="screen-pad">
      <header class="tool-header">
        <h1 class="tool-title">Who is at the table</h1>
        <p class="tool-sub">Set mode, currency, players, and house rules here — they stay for the whole match after you start.</p>
      </header>
      <section class="tool-panel controls-panel" aria-label="Match setup">
        <p class="section-label">Before you start</p>
        <div class="field"><label for="mode">Mode</label>
          <select id="mode">
            <option value="murder" ${session.mode === "murder" ? "selected" : ""}>Murder</option>
            <option value="kidnap" ${session.mode === "kidnap" ? "selected" : ""}>Kidnap</option>
          </select>
        </div>
        <div class="field"><label for="rate">Rate</label>
          <input id="rate" type="number" step="0.1" min="0" value="${esc(session.rate)}" />
        </div>
        <div class="field"><label for="currency">Currency</label>
          <select id="currency">
            ${MCalc.CURRENCIES.map((c) =>
              `<option value="${esc(c.id)}" ${session.currency === c.id ? "selected" : ""}>${esc(c.label)} (${esc(c.symbol)})</option>`
            ).join("")}
          </select>
        </div>
        <label class="soft-check">
          <input id="openm" type="checkbox" ${session.openMarriage ? "checked" : ""} /> Open Marriage (+4)
        </label>
      </section>
      ${marriageBetterRuleHtml(session)}
      ${marriageFoulRuleHtml(session)}
      <section class="tool-panel">
        <p class="section-label">Players</p>
        <ul class="roster-list">${rows}</ul>
        <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
          <input id="new-name" type="text" placeholder="New player's name" class="roster-add-input" />
          <button type="button" class="soft-btn" id="add-player" ${session.players.length >= 10 ? "disabled" : ""}>Add player</button>
        </div>
      </section>
      <div class="cta-bar">
        <button type="button" class="soft-btn primary" id="start-match">Start keeping score</button>
      </div>
    </div>`;
  }

  function marriageCalcScreen(opts) {
    const o = opts || {};
    let access = o.access || "edit"; // edit | view | review
    let liveRole = o.liveRole || null; // host | viewer | claiming | review | null
    let liveStatus = o.liveStatus || "";
    let hostCtl = null;
    let viewerCtl = null;
    let publishTimer = null;
    let destroyed = false;
    let cachedViewLink = "";
    let cachedHostLink = "";

    let session;
    let fresh = false;
    let passedGate = true;

    if (o.livePeerId) {
      const existing = Store.getActive("marriage");
      if (existing && existing.game === "marriage-calc" && marriageWorthArchiving(existing)) {
        archiveMarriageSession(existing);
      }
      session = o.session
        ? marriageMigrate(Live.cloneSession(o.session))
        : MCalc.newSession({ players: 2, names: ["Waiting…", "…"], phase: "play" });
      passedGate = true;
    } else if (o.session) {
      session = marriageMigrate(Live.cloneSession(o.session));
      if (access === "edit") Store.setActive("marriage", session);
    } else {
      session = Store.getActive("marriage");
      if (!session || session.game !== "marriage-calc") {
        const st = Store.settings();
        session = MCalc.newSession({
          players: 4,
          mode: st.lastMode || "murder",
          rate: st.defaultRate,
          currency: st.defaultCurrency || "npr",
          openMarriage: st.openMarriageDefault,
          phase: "setup"
        });
        Store.setActive("marriage", session);
        fresh = true;
      }
      marriageMigrate(session);
      const hasPrior =
        !fresh &&
        access === "edit" &&
        !o.skipGate &&
        ((session.rounds && session.rounds.length > 0) || session.phase === "play");
      passedGate = !hasPrior;
    }

    const canEdit = () => access === "edit";

    function freshSession(keepRoster) {
      const st = Store.settings();
      const base = {
        mode: keepRoster ? session.mode : (st.lastMode || "murder"),
        rate: keepRoster ? session.rate : st.defaultRate,
        currency: keepRoster ? session.currency : (st.defaultCurrency || "npr"),
        openMarriage: keepRoster ? session.openMarriage : st.openMarriageDefault,
        betterRule: keepRoster
          ? Object.assign({}, session.betterRule || MCalc.defaultBetterRule())
          : MCalc.defaultBetterRule(),
        foulRule: keepRoster
          ? Object.assign({}, session.foulRule || MCalc.defaultFoulRule())
          : MCalc.defaultFoulRule(),
        phase: "setup"
      };
      if (keepRoster) {
        base.players = session.players.length;
        base.names = session.players.map((p) => p.name);
        base.faces = session.players.map((p) => p.face);
      } else {
        base.players = 4;
      }
      return MCalc.newSession(base);
    }

    function teardownLive(opts) {
      const o2 = opts || {};
      if (!o2.keepScreen) destroyed = true;
      clearTimeout(publishTimer);
      try {
        if (hostCtl) hostCtl.destroy();
      } catch (_) {}
      try {
        if (viewerCtl) viewerCtl.destroy();
      } catch (_) {}
      hostCtl = null;
      viewerCtl = null;
    }

    function schedulePublish() {
      if (!hostCtl || !canEdit()) return;
      clearTimeout(publishTimer);
      publishTimer = setTimeout(() => {
        try {
          hostCtl.publish(session);
          liveStatus = "synced";
        } catch (_) {
          liveStatus = "push failed";
        }
      }, 300);
    }

    function persistLocal() {
      if (access === "review") return;
      Store.setActive("marriage", session);
      if (canEdit() && marriageWorthArchiving(session)) {
        archiveMarriageSession(session);
      }
      schedulePublish();
    }

    function bindFaces() {
      if (!canEdit()) return;
      root.querySelectorAll("[data-face]").forEach((btn) => {
        btn.onclick = () => {
          const i = Number(btn.dataset.face);
          if (!session.players[i]) return;
          MCalc.cycleFace(session.players[i]);
          paint();
        };
      });
    }

    function resizeRoster(count) {
      const n = Math.max(2, Math.min(10, Number(count) || session.players.length));
      while (session.players.length < n) {
        MCalc.addPlayer(session, "Player " + (session.players.length + 1));
      }
      while (session.players.length > n) {
        session.players.pop();
        if (Array.isArray(session.pendingFoulPts)) session.pendingFoulPts.pop();
      }
      if (session.winnerIndex >= session.players.length) session.winnerIndex = 0;
      return n;
    }

    /** Soft field edits must NOT call paint() — a full re-render on change/blur
     * destroys the button mid-click (e.g. Start keeping score needs two taps). */
    function flushSetupFromDom() {
      const mode = root.querySelector("#mode");
      if (mode) session.mode = mode.value;
      const rate = root.querySelector("#rate");
      if (rate) session.rate = Number(rate.value) || 0;
      const currency = root.querySelector("#currency");
      if (currency) session.currency = MCalc.currencyOf(currency.value).id;
      const openm = root.querySelector("#openm");
      if (openm) {
        session.openMarriage = openm.checked;
        if (!session.openMarriage) session.players.forEach((p) => { p.openHolder = false; });
      }
      root.querySelectorAll(".seat-name").forEach((inp) => {
        const i = Number(inp.dataset.i);
        if (!session.players[i]) return;
        session.players[i].name = inp.value.trim() || session.players[i].name;
      });
      if (!session.betterRule) session.betterRule = MCalc.suggestedBetterRule(session.players.length);
      if (!session.foulRule) session.foulRule = MCalc.defaultFoulRule();
      const on = root.querySelector("#better-rule-on");
      if (on) session.betterRule.enabled = on.checked;
      const bp = root.querySelector("#better-players");
      if (bp) {
        session.betterRule.playerCount = Math.max(2, Math.min(10, Number(bp.value) || session.players.length));
      }
      const ind = root.querySelector("#better-ind");
      if (ind) session.betterRule.individualMaal = Math.max(1, Number(ind.value) || 25);
      const tot = root.querySelector("#better-tot");
      if (tot) session.betterRule.totalMaal = Math.max(1, Number(tot.value) || 50);
      const foulNext = root.querySelector("#foul-next-round");
      if (foulNext) session.foulRule.foulNextRound = foulNext.checked;
      const foulUnseen = root.querySelector("#foul-unseen");
      if (foulUnseen) session.foulRule.unseenPts = Math.max(0, Number(foulUnseen.value) || 10);
      const foulSeen = root.querySelector("#foul-seen");
      if (foulSeen) session.foulRule.seenPts = Math.max(0, Number(foulSeen.value) || 3);
      const foulFlat = root.querySelector("#foul-flat");
      if (foulFlat) session.foulRule.foulPts = Math.max(0, Number(foulFlat.value) || 15);
    }

    function bindBetterRule() {
      if (!canEdit()) return;
      if (!session.betterRule) session.betterRule = MCalc.suggestedBetterRule(session.players.length);
      if (!session.foulRule) session.foulRule = MCalc.defaultFoulRule();
      const on = root.querySelector("#better-rule-on");
      if (on) {
        on.onchange = (e) => {
          session.betterRule.enabled = e.target.checked;
          if (session.betterRule.enabled && !session.betterRule._customized) {
            const s = MCalc.suggestedBetterRule(session.players.length);
            session.betterRule.playerCount = s.playerCount;
            session.betterRule.individualMaal = s.individualMaal;
            session.betterRule.totalMaal = s.totalMaal;
          }
          // Structure changes (threshold fields appear/hide) — must repaint.
          paint();
        };
      }
      const pc = root.querySelector("#player-count");
      if (pc) {
        pc.onchange = (e) => {
          const n = resizeRoster(e.target.value);
          session.betterRule.playerCount = n;
          if (session.betterRule.enabled && !session.betterRule._customized) {
            const s = MCalc.suggestedBetterRule(n);
            session.betterRule.individualMaal = s.individualMaal;
            session.betterRule.totalMaal = s.totalMaal;
          }
          paint();
        };
      }
      const bp = root.querySelector("#better-players");
      if (bp) {
        bp.onchange = (e) => {
          const n = Math.max(2, Math.min(10, Number(e.target.value) || session.players.length));
          session.betterRule.playerCount = n;
          session.betterRule._customized = true;
        };
      }
      const ind = root.querySelector("#better-ind");
      if (ind) {
        ind.onchange = (e) => {
          session.betterRule.individualMaal = Math.max(1, Number(e.target.value) || 25);
          session.betterRule._customized = true;
        };
      }
      const tot = root.querySelector("#better-tot");
      if (tot) {
        tot.onchange = (e) => {
          session.betterRule.totalMaal = Math.max(1, Number(e.target.value) || 50);
          session.betterRule._customized = true;
        };
      }
      const fill = root.querySelector("#better-fill-defaults");
      if (fill) {
        fill.onclick = () => {
          const n = Number(session.betterRule.playerCount) || session.players.length;
          const s = MCalc.suggestedBetterRule(n);
          session.betterRule.playerCount = s.playerCount;
          session.betterRule.individualMaal = s.individualMaal;
          session.betterRule.totalMaal = s.totalMaal;
          session.betterRule._customized = false;
          session.betterRule.enabled = true;
          paint();
        };
      }
      const foulNext = root.querySelector("#foul-next-round");
      if (foulNext) {
        foulNext.onchange = (e) => {
          session.foulRule.foulNextRound = e.target.checked;
        };
      }
      const foulUnseen = root.querySelector("#foul-unseen");
      if (foulUnseen) {
        foulUnseen.onchange = (e) => {
          session.foulRule.unseenPts = Math.max(0, Number(e.target.value) || 10);
        };
      }
      const foulSeen = root.querySelector("#foul-seen");
      if (foulSeen) {
        foulSeen.onchange = (e) => {
          session.foulRule.seenPts = Math.max(0, Number(e.target.value) || 3);
        };
      }
      const foulFlat = root.querySelector("#foul-flat");
      if (foulFlat) {
        foulFlat.onchange = (e) => {
          session.foulRule.foulPts = Math.max(0, Number(e.target.value) || 15);
        };
      }
    }

    function bindCommonSettings(opts) {
      if (!canEdit()) return;
      const soft = !!(opts && opts.soft);
      const mode = root.querySelector("#mode");
      if (mode) {
        mode.onchange = (e) => {
          session.mode = e.target.value;
          Store.saveSettings({ lastMode: session.mode });
          if (!soft) paint();
        };
      }
      const rate = root.querySelector("#rate");
      if (rate) {
        rate.onchange = (e) => {
          session.rate = Number(e.target.value) || 0;
          Store.saveSettings({ defaultRate: session.rate });
          if (!soft) paint();
        };
      }
      const currency = root.querySelector("#currency");
      if (currency) {
        currency.onchange = (e) => {
          session.currency = MCalc.currencyOf(e.target.value).id;
          Store.saveSettings({ defaultCurrency: session.currency });
          if (!soft) paint();
        };
      }
      const openm = root.querySelector("#openm");
      if (openm) {
        openm.onchange = (e) => {
          session.openMarriage = e.target.checked;
          if (!session.openMarriage) session.players.forEach((p) => { p.openHolder = false; });
          Store.saveSettings({ openMarriageDefault: session.openMarriage });
          if (!soft) paint();
        };
      }
      bindBetterRule();
    }

    function bindLogsPanel() {
      root.querySelectorAll("[data-log-review]").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-log-review");
          const row = Store.logsByGame("marriage-calc").find((x) => x.id === id);
          if (!row || !row.payload) return toast("Log missing");
          teardownLive();
          location.hash = "#/calc/marriage/review/" + encodeURIComponent(id);
        };
      });
      root.querySelectorAll("[data-log-resume]").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-log-resume");
          const row = Store.logsByGame("marriage-calc").find((x) => x.id === id);
          if (!row || !row.payload) return toast("Log missing");
          if (canEdit() && marriageWorthArchiving(session) && session.id !== row.id) {
            archiveMarriageSession(session);
          }
          teardownLive();
          Store.setActive("marriage", Live.cloneSession(row.payload));
          location.hash = "#/calc/marriage";
          toast("Resumed from logs");
        };
      });
      root.querySelectorAll("[data-log-del]").forEach((btn) => {
        btn.onclick = () => {
          Store.deleteLog(btn.getAttribute("data-log-del"));
          toast("Log deleted");
          paint();
        };
      });
    }

    async function startHosting() {
      try {
        liveRole = "host";
        liveStatus = "starting…";
        paint();
        hostCtl = await Live.createHost(session, {
          gamePath: "calc/marriage",
          onTransferred(newHostId) {
            const snap = Live.cloneSession(session);
            try {
              if (hostCtl) hostCtl.destroy();
            } catch (_) {}
            hostCtl = null;
            cachedViewLink = "";
            cachedHostLink = "";
            access = "view";
            liveRole = "viewer";
            liveStatus = "reconnecting…";
            startWatching(newHostId, snap);
            toast("Host moved — you are read only");
          },
          onError() {
            liveStatus = "error";
            toast("Live share connection error");
            paint();
          }
        });
        cachedViewLink = hostCtl.viewerLink();
        cachedHostLink = hostCtl.makeClaimLink();
        liveStatus = "live";
        schedulePublish();
        paint();
        return hostCtl;
      } catch (err) {
        liveRole = null;
        liveStatus = "";
        toast("Could not start live share — check network");
        paint();
        return null;
      }
    }

    function bindShareDock(shareTextFn) {
      const hostLive = root.querySelector("#host-live");
      if (hostLive) {
        hostLive.onclick = async () => {
          const ctl = hostCtl || await startHosting();
          if (!ctl) return;
          cachedViewLink = ctl.viewerLink();
          cachedHostLink = ctl.makeClaimLink();
          paint();
          toast("Links ready — copy & text them");
        };
      }
      const copyView = root.querySelector("#copy-view-link");
      if (copyView) {
        copyView.onclick = async () => {
          const ctl = hostCtl || await startHosting();
          if (!ctl) return;
          cachedViewLink = ctl.viewerLink();
          cachedHostLink = cachedHostLink || ctl.makeClaimLink();
          await copyText(cachedViewLink);
          toast("View link copied — text it");
          paint();
        };
      }
      const copyHost = root.querySelector("#copy-host-link");
      if (copyHost) {
        copyHost.onclick = async () => {
          const ctl = hostCtl || await startHosting();
          if (!ctl) return;
          cachedViewLink = ctl.viewerLink();
          cachedHostLink = ctl.makeClaimLink();
          await copyText(cachedHostLink);
          toast("Host link copied — send only to next scorer");
          paint();
        };
      }
      const shareText = root.querySelector("#share-text");
      if (shareText) {
        shareText.onclick = () => shareTextFn();
      }
    }

    async function startWatching(peerId, seedSession, claimTicket) {
      try {
        if (seedSession) {
          session = marriageMigrate(Live.cloneSession(seedSession));
        }
        liveRole = claimTicket ? "claiming" : "viewer";
        access = claimTicket ? "view" : "view";
        liveStatus = "connecting…";
        paint();
        viewerCtl = await Live.joinAsViewer(peerId, {
          claimTicket: claimTicket || null,
          onStatus(st) {
            liveStatus = st;
            paint();
          },
          onState(next) {
            if (destroyed) return;
            session = marriageMigrate(Live.cloneSession(next));
            if (access !== "review") Store.setActive("marriage", session);
            liveStatus = "synced";
            paint();
          },
          onRehost(newHostId, next) {
            if (next) session = marriageMigrate(Live.cloneSession(next));
            liveStatus = "following new host…";
            paint();
          },
          onPromoted(ctl, next) {
            viewerCtl = null;
            hostCtl = ctl;
            if (next) session = marriageMigrate(Live.cloneSession(next));
            access = "edit";
            liveRole = "host";
            liveStatus = "you are host";
            Store.setActive("marriage", session);
            passedGate = true;
            schedulePublish();
            toast("You are the host now");
            // Keep this screen instance (and peer) alive — don't trigger hashchange teardown.
            try {
              history.replaceState(null, "", location.pathname + location.search + "#/calc/marriage");
            } catch (_) {}
            paint();
          },
          onClaimDenied() {
            liveRole = "viewer";
            liveStatus = "claim failed";
            toast("Host link expired or already used");
            paint();
          },
          onError() {
            liveStatus = "error";
            paint();
          }
        });
      } catch (err) {
        liveStatus = "unavailable";
        toast("Could not join live room — host may be offline");
        paint();
      }
    }

    function paint() {
      if (destroyed) return;
      if (access !== "review") Store.setActive("marriage", session);
      marriageMigrate(session);

      if (!passedGate && canEdit()) {
        root.innerHTML = marriageGateHtml(session) + marriageLogsPanelHtml(session.id, { canEdit: true });
        bindLogsPanel();
        root.querySelector("#gate-continue").onclick = () => {
          passedGate = true;
          paint();
        };
        root.querySelector("#gate-new").onclick = () => {
          archiveMarriageSession(session);
          teardownLive({ keepScreen: true });
          session = freshSession(false);
          session.rulesLocked = false;
          session.phase = "setup";
          passedGate = true;
          liveRole = null;
          liveStatus = "";
          Store.setActive("marriage", session);
          toast("Previous match saved — set rules for the new game");
          paint();
        };
        return;
      }

      const readOnly = !canEdit();
      const ro = readOnly ? "disabled" : "";
      const liveInfo = liveRole
        ? { role: liveRole === "claiming" ? "claiming" : liveRole, status: liveStatus }
        : (access === "review" ? { role: "review" } : null);

      if (session.phase === "setup" && canEdit()) {
        root.innerHTML = marriageSetupHtml(session) + marriageLogsPanelHtml(session.id, { canEdit: true });
        // Warm avatar cache at play sizes so Start → scorecard feels instant.
        if (window.MG_Avatar && typeof window.MG_Avatar.dataUrl === "function") {
          session.players.forEach((p) => {
            window.MG_Avatar.dataUrl(p.face, 28);
            window.MG_Avatar.dataUrl(p.face, 40);
          });
        }
        bindCommonSettings({ soft: true });
        bindFaces();
        bindLogsPanel();
        // Soft sync only — painting here would swallow the next CTA click after blur.
        root.querySelectorAll(".seat-name").forEach((inp) => {
          inp.onchange = () => {
            const i = Number(inp.dataset.i);
            session.players[i].name = inp.value.trim() || session.players[i].name;
          };
        });
        root.querySelectorAll("[data-remove]").forEach((btn) => {
          btn.onclick = () => {
            const i = Number(btn.dataset.remove);
            if (session.players.length <= 2) return;
            session.players.splice(i, 1);
            paint();
          };
        });
        root.querySelector("#add-player").onclick = () => {
          flushSetupFromDom();
          const inp = root.querySelector("#new-name");
          const name = (inp && inp.value.trim()) || "";
          MCalc.addPlayer(session, name);
          paint();
        };
        root.querySelector("#start-match").onclick = () => {
          flushSetupFromDom();
          MCalc.startMatch(session);
          session.rulesLocked = true;
          Store.saveSettings({
            lastMode: session.mode,
            defaultRate: session.rate,
            defaultCurrency: session.currency,
            openMarriageDefault: session.openMarriage
          });
          persistLocal();
          toast("Rules locked · Round 1 — enter maal");
          paint();
        };
        return;
      }

      const result = MCalc.settle(session);
      const tot = MCalc.totals(session);
      const nextNum = (session.rounds || []).length + 1;
      const modeLabel = session.mode === "kidnap" ? "Kidnap" : "Murder";
      const rule = session.betterRule || MCalc.defaultBetterRule();
      const ruleHint = rule.enabled
        ? ` · Auto-Better ≥${rule.individualMaal}/${rule.totalMaal}`
        : "";

      const dock = shareDockHtml({
        viewUrl: cachedViewLink,
        hostUrl: cachedHostLink,
        hosting: !!hostCtl,
        readOnly
      });

      root.innerHTML = `${appBar({ showHome: true })}
      ${marriageLiveBannerHtml(liveInfo)}
      <div class="screen-pad${readOnly ? " is-readonly" : ""}">
        <header class="tool-header">
          <h1 class="tool-title">Marriage Points</h1>
          <p class="tool-sub">${esc(modeLabel)} · ${esc(marriageModeSub(session))} · R ${esc(session.rate)} ${esc(MCalc.currencyOf(session.currency).code)} · Round ${nextNum}${session.better ? " · Better ×2" : ""}${esc(ruleHint)}</p>
        </header>

        <section class="standings" aria-label="Match totals">
          <p class="section-label">Match totals · ${esc(MCalc.currencyOf(session.currency).label)}</p>
          ${marriageStandingHtml(session, tot)}
        </section>

        ${marriageRoundsTableHtml(session)}

        <section class="tool-panel controls-panel compact-round-opts" aria-label="This round options">
          <label class="soft-check better-check" title="Doubles this round's points only">
            <input id="better" type="checkbox" ${session.better ? "checked" : ""} ${ro} /> Better (×2 this round)
          </label>
        </section>

        <section class="tool-panel round-entry" aria-label="This round">
          <div class="row spread" style="margin-bottom:10px;align-items:center">
            <h2 class="tool-subhead" style="margin:0">This deal · Round ${nextNum}${session.better ? " · Better" : ""}</h2>
            ${canEdit() ? `<button type="button" class="soft-btn" id="add-player-live" ${session.players.length >= 10 ? "disabled" : ""}>+ Player</button>` : ""}
          </div>
          <div class="player-rows">
            ${session.players.map((p, i) => marriageSeatHtml(p, i, session)).join("")}
          </div>
        </section>

        ${marriageDraftCardHtml(session, result)}

        ${canEdit() ? `<div class="score-card-actions row" style="margin:12px 0;gap:8px;flex-wrap:wrap">
          <button type="button" class="soft-btn" id="save-log">Save log</button>
          <button type="button" class="soft-btn danger" id="reset">New match</button>
        </div>` : ""}

        ${marriageLogsPanelHtml(session.id, { canEdit: canEdit() })}

        ${dock}

        ${canEdit() ? `<div class="cta-bar">
          <button type="button" class="soft-btn primary" id="add-round">
            Add round ${nextNum}${session.better ? " · Better ×2" : ""} · maal ${result.sum}
          </button>
        </div>` : `<div class="cta-bar"><span class="cta-meta">Watching live scorecard</span></div>`}
      </div>`;

      if (access === "review") {
        const exit = root.querySelector("#exit-review");
        if (exit) {
          exit.onclick = () => {
            teardownLive();
            location.hash = "#/calc/marriage";
          };
        }
      }

      if (readOnly) {
        root.querySelectorAll(
          ".round-entry input, .round-entry select, .round-entry button, .controls-panel input, .controls-panel select, .better-rule-panel input, .better-rule-panel button, .foul-rule-panel input, .edit-last-btn, #edit-last, #add-round, #add-player-live, #reset, #save-log, [data-winner], [data-face]"
        ).forEach((el) => {
          el.disabled = true;
        });
        bindShareDock(() => copyText(MCalc.shareText(session, result)));
        bindLogsPanel();
        return;
      }

      const syncPlayer = (i) => {
        const p = session.players[i];
        if (p.hold || p.foul) {
          if (p.hold) p.seen = false;
          return;
        }
        MCalc.ensureSeen(p);
      };

      bindCommonSettings({ soft: true });
      bindFaces();
      bindLogsPanel();

      const better = root.querySelector("#better");
      if (better) {
        better.onchange = (e) => {
          session.better = e.target.checked;
          refreshDraftOnly();
        };
      }

      const addLive = root.querySelector("#add-player-live");
      if (addLive) {
        addLive.onclick = () => {
          flushPlayEntryFromDom();
          const name = window.prompt("New player name", "Player " + (session.players.length + 1));
          if (name === null) return;
          MCalc.addPlayer(session, name.trim() || undefined);
          toast("Added with 0 for past rounds · Seen");
          paint();
        };
      }

      function flushPlayEntryFromDom() {
        // Mode / currency / rate / open marriage stay from setup — not edited mid-match.
        root.querySelectorAll(".seat-name").forEach((inp) => {
          const i = Number(inp.dataset.i);
          if (!session.players[i]) return;
          const name = inp.value.trim() || session.players[i].name;
          session.players[i].name = name;
          (session.rounds || []).forEach((round) => {
            if (round.cells && round.cells[i]) round.cells[i].name = name;
          });
        });
        root.querySelectorAll(".maal").forEach((inp) => {
          const i = Number(inp.dataset.i);
          if (!session.players[i]) return;
          session.players[i].maal = Number(inp.value) || 0;
          syncPlayer(i);
        });
        const betterEl = root.querySelector("#better");
        if (betterEl) session.better = betterEl.checked;
      }

      function refreshDraftOnly() {
        const result = MCalc.settle(session);
        const oldDraft = root.querySelector("#score-card");
        if (oldDraft) {
          const tmp = document.createElement("div");
          tmp.innerHTML = marriageDraftCardHtml(session, result);
          const next = tmp.firstElementChild;
          if (next) oldDraft.replaceWith(next);
        }
        const addRoundBtn = root.querySelector("#add-round");
        if (addRoundBtn) {
          const nextNum = (session.rounds || []).length + 1;
          addRoundBtn.textContent =
            `Add round ${nextNum}${session.better ? " · Better ×2" : ""} · maal ${result.sum}`;
        }
      }

      root.querySelectorAll(".seat-name").forEach((inp) => {
        inp.onchange = () => {
          const i = Number(inp.dataset.i);
          const name = inp.value.trim() || session.players[i].name;
          session.players[i].name = name;
          (session.rounds || []).forEach((round) => {
            if (round.cells && round.cells[i]) round.cells[i].name = name;
          });
        };
      });
      root.querySelectorAll(".maal").forEach((inp) => {
        inp.onchange = () => {
          const i = Number(inp.dataset.i);
          session.players[i].maal = Number(inp.value) || 0;
          syncPlayer(i);
          refreshDraftOnly();
        };
      });
      root.querySelectorAll(".maal-inc").forEach((btn) => {
        btn.onclick = () => {
          const i = Number(btn.dataset.i);
          if (session.players[i].hold) return;
          session.players[i].maal = (Number(session.players[i].maal) || 0) + 1;
          const inp = root.querySelector(`.maal[data-i="${i}"]`);
          if (inp) inp.value = String(session.players[i].maal);
          syncPlayer(i);
          refreshDraftOnly();
        };
      });
      root.querySelectorAll(".maal-dec").forEach((btn) => {
        btn.onclick = () => {
          const i = Number(btn.dataset.i);
          if (session.players[i].hold) return;
          session.players[i].maal = Math.max(0, (Number(session.players[i].maal) || 0) - 1);
          const inp = root.querySelector(`.maal[data-i="${i}"]`);
          if (inp) inp.value = String(session.players[i].maal);
          syncPlayer(i);
          refreshDraftOnly();
        };
      });
      root.querySelectorAll(".status-select").forEach((sel) => {
        sel.onchange = () => {
          const i = Number(sel.dataset.i);
          marriageApplyStatus(session.players[i], sel.value);
          syncPlayer(i);
          paint();
        };
      });
      root.querySelectorAll(".open-holder").forEach((inp) => {
        inp.onchange = () => {
          const i = Number(inp.dataset.i);
          if (inp.checked) {
            session.players.forEach((p, j) => { p.openHolder = j === i; });
          } else {
            session.players[i].openHolder = false;
          }
          syncPlayer(i);
          paint();
        };
      });
      root.querySelectorAll("[data-winner]").forEach((btn) => {
        btn.onclick = () => {
          session.winnerIndex = Number(btn.dataset.winner);
          paint();
        };
      });

      const addRound = root.querySelector("#add-round");
      if (addRound) {
        addRound.onclick = () => {
          flushPlayEntryFromDom();
          const active = session.players.filter((p) => !p.hold);
          if (active.length < 2) {
            toast("Need 2+ players not on Hold");
            return;
          }
          if (session.players[session.winnerIndex] && session.players[session.winnerIndex].hold) {
            toast("Winner can't be on Hold");
            return;
          }
          const committed = MCalc.commitRound(session);
          persistLocal();
          toast(committed.nextIsBetter
            ? "Round saved · next round is Better ×2"
            : "Round saved");
          paint();
          const card = root.querySelector("#rounds-card");
          if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        };
      }

      const editLast = () => {
        if (!(session.rounds && session.rounds.length)) {
          toast("No round to edit");
          return;
        }
        const pulled = MCalc.editLastRound(session);
        persistLocal();
        toast(pulled ? `Editing round ${pulled.roundNum}` : "Nothing to edit");
        paint();
        const entry = root.querySelector(".round-entry");
        if (entry) entry.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      const editBtn = root.querySelector("#edit-last");
      if (editBtn) editBtn.onclick = editLast;
      const editInline = root.querySelector("#edit-last-inline");
      if (editInline) editInline.onclick = editLast;

      bindShareDock(() => copyText(MCalc.shareText(session, result)));

      const saveLog = root.querySelector("#save-log");
      if (saveLog) {
        saveLog.onclick = () => {
          archiveMarriageSession(session) || Store.upsertLog({
            id: session.id,
            game: "marriage-calc",
            title: marriageLogTitle(session),
            payload: Live.cloneSession(session)
          });
          toast("Saved to match logs");
          paint();
        };
      }
      const reset = root.querySelector("#reset");
      if (reset) {
        reset.onclick = () => {
          archiveMarriageSession(session);
          teardownLive({ keepScreen: true });
          liveRole = null;
          liveStatus = "";
          session = freshSession(true);
          session.rulesLocked = false;
          session.phase = "setup";
          Store.setActive("marriage", session);
          toast("New match — set rules before start");
          paint();
        };
      }

      persistLocal();
    }

    // Boot live modes from route opts
    if (o.livePeerId && (o.access === "view" || o.claimTicket)) {
      passedGate = true;
      startWatching(o.livePeerId, o.session || session, o.claimTicket || null);
      return () => teardownLive();
    }

    paint();
    return () => teardownLive();
  }

  /* ---------- Call Break calculator ---------- */
  function cbCalcScreen(opts) {
    const o = opts || {};
    let access = o.access || "edit";
    let liveRole = o.liveRole || null;
    let liveStatus = "";
    let hostCtl = null;
    let viewerCtl = null;
    let publishTimer = null;
    let destroyed = false;
    let cachedViewLink = "";
    let cachedHostLink = "";

    let session;
    if (o.livePeerId) {
      const existing = Store.getActive("cb");
      if (existing && existing.game === "callbreak-calc") {
        Store.upsertLog({
          id: existing.id,
          game: "callbreak-calc",
          title: "Call Break · " + (existing.players || []).map((p) => p.name).join(", "),
          payload: Live.cloneSession(existing)
        });
      }
      session = o.session
        ? Live.cloneSession(o.session)
        : CBCalc.newSession({ players: 4, names: ["Waiting…", "…", "…", "…"] });
    } else if (o.session) {
      session = Live.cloneSession(o.session);
    } else {
      session = Store.getActive("cb");
      if (!session || session.game !== "callbreak-calc") {
        session = CBCalc.newSession({ players: 4 });
        Store.setActive("cb", session);
      }
    }

    const canEdit = () => access === "edit";

    function teardownLive(keep) {
      if (!keep) destroyed = true;
      clearTimeout(publishTimer);
      try { if (hostCtl) hostCtl.destroy(); } catch (_) {}
      try { if (viewerCtl) viewerCtl.destroy(); } catch (_) {}
      hostCtl = null;
      viewerCtl = null;
    }

    function schedulePublish() {
      if (!hostCtl || !canEdit()) return;
      clearTimeout(publishTimer);
      publishTimer = setTimeout(() => {
        try { hostCtl.publish(session); } catch (_) {}
      }, 300);
    }

    async function startHosting() {
      try {
        liveRole = "host";
        liveStatus = "starting…";
        paint();
        hostCtl = await Live.createHost(session, {
          gamePath: "calc/callbreak",
          onTransferred(newHostId) {
            const snap = Live.cloneSession(session);
            try { if (hostCtl) hostCtl.destroy(); } catch (_) {}
            hostCtl = null;
            cachedViewLink = "";
            cachedHostLink = "";
            access = "view";
            liveRole = "viewer";
            startWatching(newHostId, snap);
            toast("Host moved — you are read only");
          }
        });
        cachedViewLink = hostCtl.viewerLink();
        cachedHostLink = hostCtl.makeClaimLink();
        liveStatus = "live";
        schedulePublish();
        paint();
        return hostCtl;
      } catch (_) {
        liveRole = null;
        toast("Could not start live share");
        paint();
        return null;
      }
    }

    async function startWatching(peerId, seed, claimTicket) {
      if (seed) session = Live.cloneSession(seed);
      liveRole = claimTicket ? "claiming" : "viewer";
      access = "view";
      liveStatus = "connecting…";
      paint();
      try {
        viewerCtl = await Live.joinAsViewer(peerId, {
          claimTicket: claimTicket || null,
          gamePath: "calc/callbreak",
          onStatus(st) { liveStatus = st; paint(); },
          onState(next) {
            if (destroyed) return;
            session = Live.cloneSession(next);
            Store.setActive("cb", session);
            liveStatus = "synced";
            paint();
          },
          onPromoted(ctl, next) {
            viewerCtl = null;
            hostCtl = ctl;
            if (next) session = Live.cloneSession(next);
            access = "edit";
            liveRole = "host";
            liveStatus = "you are host";
            cachedViewLink = ctl.viewerLink();
            cachedHostLink = ctl.makeClaimLink();
            Store.setActive("cb", session);
            try {
              history.replaceState(null, "", location.pathname + location.search + "#/calc/callbreak");
            } catch (_) {}
            toast("You are the host now");
            paint();
          },
          onClaimDenied() {
            liveRole = "viewer";
            toast("Host link expired");
            paint();
          }
        });
      } catch (_) {
        liveStatus = "unavailable";
        toast("Host may be offline");
        paint();
      }
    }

    function bindShareDock() {
      const hostLive = root.querySelector("#host-live");
      if (hostLive) {
        hostLive.onclick = async () => {
          const ctl = hostCtl || await startHosting();
          if (!ctl) return;
          cachedViewLink = ctl.viewerLink();
          cachedHostLink = ctl.makeClaimLink();
          paint();
          toast("Links ready — copy & text them");
        };
      }
      const copyView = root.querySelector("#copy-view-link");
      if (copyView) {
        copyView.onclick = async () => {
          const ctl = hostCtl || await startHosting();
          if (!ctl) return;
          cachedViewLink = ctl.viewerLink();
          cachedHostLink = cachedHostLink || ctl.makeClaimLink();
          await copyText(cachedViewLink);
          toast("View link copied — text it");
          paint();
        };
      }
      const copyHost = root.querySelector("#copy-host-link");
      if (copyHost) {
        copyHost.onclick = async () => {
          const ctl = hostCtl || await startHosting();
          if (!ctl) return;
          cachedViewLink = ctl.viewerLink();
          cachedHostLink = ctl.makeClaimLink();
          await copyText(cachedHostLink);
          toast("Host link copied — send only to next scorer");
          paint();
        };
      }
      const shareText = root.querySelector("#share-text");
      if (shareText) shareText.onclick = () => copyText(CBCalc.shareText(session));
    }

    function paint() {
      if (destroyed) return;
      if (access !== "review") Store.setActive("cb", session);
      CBCalc.recompute(session);
      schedulePublish();
      const n = session.players.length;
      const dealNum = session.deals.length + 1;
      const readOnly = !canEdit();
      const ranked = session.players
        .map((p, i) => ({ p, i, total: Number(p.total) || 0 }))
        .sort((a, b) => b.total - a.total || a.i - b.i);
      const standingRows = ranked.map((row, rank) => {
        const initial = esc((row.p.name || "?").trim().charAt(0).toUpperCase() || "?");
        const ptsCls = row.total > 0 ? "up" : row.total < 0 ? "down" : "";
        const pts = row.total > 0 ? `+${row.total}` : String(row.total);
        return `<li class="standing-row${ptsCls ? " " + ptsCls : ""}">
          <span class="standing-rank">${rank + 1}</span>
          <span class="standing-avatar" aria-hidden="true">${initial}</span>
          <span class="standing-name">
            <input class="seat-name" data-i="${row.i}" type="text" value="${esc(row.p.name)}" aria-label="Player ${row.i + 1} name" ${readOnly ? "disabled" : ""} />
          </span>
          <span class="standing-pts${ptsCls ? " " + ptsCls : ""}">${pts}</span>
          <span class="standing-rs"></span>
        </li>`;
      }).join("");
      const roundsBody = session.deals.length
        ? `<table class="score-table rounds-table">
            <thead><tr><th>#</th>${session.players.map((p) => `<th>${esc(p.name)}</th>`).join("")}</tr></thead>
            <tbody>${session.deals.map((d, di) => `<tr>
              <td>${di + 1}</td>
              ${d.scores.map((s) => `<td class="${s >= 0 ? "up" : "down"}">${s}</td>`).join("")}
            </tr>`).join("")}
            <tr class="rounds-total">
              <td>Σ</td>
              ${session.players.map((p) => {
                const t = Number(p.total) || 0;
                return `<td class="${t > 0 ? "up" : t < 0 ? "down" : ""}">${t}</td>`;
              }).join("")}
            </tr>
            </tbody>
          </table>`
        : `<p class="lede">No deals yet — enter calls &amp; tricks below.</p>`;

      const liveInfo = liveRole
        ? { role: liveRole === "claiming" ? "claiming" : liveRole, status: liveStatus }
        : null;

      root.innerHTML = `${topbar("cbc")}
      ${marriageLiveBannerHtml(liveInfo)}
      <div class="screen-pad${readOnly ? " is-readonly" : ""}">
      <header class="tool-header">
        <h1 class="tool-title">Call Break Scorecard</h1>
        <p class="tool-sub">Deal ${dealNum} · ${session.deals.length} scored</p>
      </header>
      <section class="standings" aria-label="Standing">
        <ol class="standing">${standingRows}</ol>
      </section>
      <section class="tool-panel deal-entry" aria-label="Deal entry">
        <div class="row spread">
          <div class="field"><label for="n">Players</label>
            <select id="n" ${readOnly ? "disabled" : ""}>${[2, 3, 4, 5, 6].map((x) =>
              `<option value="${x}" ${n === x ? "selected" : ""}>${x}</option>`).join("")}</select>
          </div>
          <h2 class="tool-subhead">Next hand #${dealNum}</h2>
        </div>
        <div class="player-rows">
          ${session.players.map((p, i) => `<div class="player-row seat deal-row" data-i="${i}">
            <div class="player-row-head"><span class="standing-name">${esc(p.name)}</span></div>
            <div class="player-row-body">
              <label class="field">Call <input class="call" data-i="${i}" type="number" min="1" max="13" value="3" ${readOnly ? "disabled" : ""} /></label>
              <label class="field">Tricks <input class="tricks" data-i="${i}" type="number" min="0" max="13" value="3" ${readOnly ? "disabled" : ""} /></label>
            </div>
          </div>`).join("")}
        </div>
      </section>
      <section class="score-card" aria-label="Round history">
        <h2 class="score-card-head">Rounds <span class="score-sum">${session.deals.length} deals</span></h2>
        ${roundsBody}
        ${canEdit() ? `<div class="score-card-actions">
          <button type="button" class="soft-btn" id="save">Save log</button>
          <button type="button" class="soft-btn danger" id="reset">Reset</button>
        </div>` : ""}
      </section>

      ${shareDockHtml({
        viewUrl: cachedViewLink,
        hostUrl: cachedHostLink,
        hosting: !!hostCtl,
        readOnly
      })}

      <div class="cta-bar">
        ${canEdit()
          ? `<button type="button" class="soft-btn primary" id="add">Add deal · #${dealNum}</button>`
          : `<span class="cta-meta">Watching live scorecard</span>`}
      </div>
      </div>`;

      bindShareDock();

      if (readOnly) return;

      root.querySelector("#n").onchange = (e) => {
        const count = Number(e.target.value);
        const names = session.players.map((p) => p.name);
        while (names.length < count) names.push("Player " + (names.length + 1));
        session = CBCalc.newSession({ players: count, names: names.slice(0, count) });
        paint();
      };
      root.querySelectorAll(".seat-name").forEach((inp) => {
        inp.onchange = () => {
          const i = Number(inp.dataset.i);
          session.players[i].name = inp.value.trim() || session.players[i].name;
          paint();
        };
      });
      root.querySelector("#add").onclick = () => {
        const call = [...root.querySelectorAll(".call")].map((el) => Number(el.value) || 1);
        const tricks = [...root.querySelectorAll(".tricks")].map((el) => Number(el.value) || 0);
        CBCalc.addDeal(session, call, tricks);
        paint();
      };
      const save = root.querySelector("#save");
      if (save) {
        save.onclick = () => {
          Store.upsertLog({
            id: session.id,
            game: "callbreak-calc",
            title: "Call Break · " + session.players.map((p) => p.name).join(", "),
            payload: session
          });
          toast("Saved");
        };
      }
      const reset = root.querySelector("#reset");
      if (reset) {
        reset.onclick = () => {
          teardownLive(true);
          cachedViewLink = "";
          cachedHostLink = "";
          liveRole = null;
          session = CBCalc.newSession({ players: session.players.length, names: session.players.map((p) => p.name) });
          paint();
        };
      }
    }

    if (o.livePeerId) {
      startWatching(o.livePeerId, o.session || session, o.claimTicket || null);
      return () => teardownLive(false);
    }
    paint();
    return () => teardownLive(false);
  }

  /* ---------- Call Break play ---------- */
  function cbPlayScreen() {
    let state = null;
    const saved = Store.getActive("cb");
    if (saved && saved.game === "callbreak-play") state = saved;
    const POS = ["bottom", "left", "top", "right"];

    function persist() {
      Store.setActive("cb", state);
    }

    function startChooser() {
      root.innerHTML = `${topbar("pcb")}
      <div class="screen-pad">
      <section class="score-card sheet">
        <h1 class="tool-title">Play Call Break</h1>
        <p class="tool-sub">Four players · spades trump · five deals</p>
        <p class="lede">Sit at the oval — soft scoreboard stays up. Hotseat friends pass the device, or copy invite JSON.</p>
        <div class="score-card-actions">
          <button type="button" class="soft-btn primary" id="bots">Vs computer</button>
          <button type="button" class="soft-btn" id="hotseat">With friends (hotseat)</button>
        </div>
      </section>
      </div>`;
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

    function actorSeat() {
      if (state.phase === "bid") return state.bidTurn;
      if (state.phase === "play") return state.turn;
      return 0;
    }

    function posFor(seat) {
      const anchor = state.mode === "hotseat" ? actorSeat() : 0;
      return POS[(seat - anchor + 4) % 4];
    }

    function initial(name) {
      return esc(String(name || "?").trim().charAt(0).toUpperCase() || "?");
    }

    function stickyScore() {
      return `<div class="sticky-score score-card">
        <div class="title">Call Break · Round ${state.round}/${state.maxRounds} · ${esc(state.phase)} · ${esc(state.roomCode)}</div>
        <div class="scores">${state.names.map((n, i) =>
          `<span><strong>${esc(n)}</strong> Σ${state.totals[i]} · bid ${state.bids[i] == null ? "—" : state.bids[i]} · tricks ${state.tricksTaken[i]}</span>`
        ).join("")}</div>
      </div>`;
    }

    function railExtra() {
      if (state.phase === "bid") {
        return `<div class="rail-bids" id="bids">${[1, 2, 3, 4, 5, 6, 7, 8].map((b) =>
          `<button type="button" class="soft-btn bid-pill" data-b="${b}">${b}</button>`
        ).join("")}</div>`;
      }
      if (state.phase === "deal-end" || state.phase === "match-end") {
        return `<span>${state.phase === "match-end" ? "Match over" : "Deal over"}</span>`;
      }
      return `<span>${esc(state.names[state.turn])} to play · spades trump</span>`;
    }

    function trickPitHtml() {
      if (state.phase !== "play" && state.phase !== "bid") {
        return `<div class="trick-pit"><span class="pit-hint">${state.phase === "match-end" ? "Match complete" : "Deal scored"}</span></div>`;
      }
      if (!state.trick.length) {
        return `<div class="trick-pit"><span class="pit-hint">${state.phase === "play" ? "Lead any card" : "Bidding"}</span></div>`;
      }
      return `<div class="trick-pit">${state.trick.map((t) =>
        `<div class="pit-play seat-${posFor(t.seat)}">
          <div class="label">${esc(state.names[t.seat])}</div>
          ${Cards.html(t.card, { small: true })}
        </div>`
      ).join("")}</div>`;
    }

    function seatHtml(i, faceUpIds) {
      const pos = posFor(i);
      const isActor = i === actorSeat();
      const isYouView = pos === "bottom";
      const active = (state.phase === "bid" || state.phase === "play") && isActor;
      const hand = state.hands[i] || [];
      let cardsHtml = "";
      if (isYouView && (state.phase === "bid" || state.phase === "play")) {
        cardsHtml = `<div class="hand fan">${hand.map((c, fi) =>
          Cards.html(c, {
            fan: true,
            fanIndex: fi,
            playable: !!(faceUpIds && faceUpIds.has(c.id)),
            dim: !!(faceUpIds && !faceUpIds.has(c.id)),
            dataId: !!(faceUpIds && faceUpIds.has(c.id)),
            small: true
          })
        ).join("")}</div>`;
      } else if (hand.length) {
        const show = Math.min(hand.length, 7);
        cardsHtml = `<div class="hand fan backs">${Cards.backFan(show, { small: true })}</div>`;
      }
      const winCls = state.phase === "match-end" && state.totals[i] === Math.max(...state.totals) ? " winner" : "";
      return `<div class="seat ${pos}${active ? " active" : ""}${winCls}" data-seat="${i}">
        <div class="avatar">${initial(state.names[i])}</div>
        <div class="name">${esc(state.names[i])}</div>
        <div class="bid-tricks">
          <span class="chip chip-hold">bid ${state.bids[i] == null ? "—" : state.bids[i]}</span>
          <span class="chip chip-seen on">t ${state.tricksTaken[i]}</span>
          <span class="chip">Σ${state.totals[i]}</span>
        </div>
        ${cardsHtml}
      </div>`;
    }

    function tableHtml(faceUpIds) {
      /* DOM order top → right → bottom → left matches CSS nth-child + named classes */
      const order = [0, 1, 2, 3]
        .map((i) => ({ i, pos: posFor(i) }))
        .sort((a, b) => ["top", "right", "bottom", "left"].indexOf(a.pos) - ["top", "right", "bottom", "left"].indexOf(b.pos));
      return `<div class="table-oval" data-seats="4">
        ${order.map(({ i }) => seatHtml(i, faceUpIds)).join("")}
        ${trickPitHtml()}
      </div>`;
    }

    function footerActions(extraBtns) {
      return `<div class="row play-actions score-card-actions">
        ${extraBtns || ""}
        <button type="button" class="soft-btn" id="invite">Copy invite JSON</button>
        <button type="button" class="soft-btn danger" id="quit">${state.phase === "match-end" ? "Home" : "Quit"}</button>
      </div>`;
    }

    function bindCommon() {
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

    function paint() {
      if (!state) return startChooser();
      persist();
      const seat = actorSeat();
      const pass = state.mode === "hotseat" && (state.phase === "bid" || state.phase === "play")
        ? `<div class="pass-device soft">Pass device to ${esc(state.names[seat])}</div>` : "";

      if (state.phase === "bid") {
        root.innerHTML = `${topbar("pcb")}
        <div class="screen-pad">
        ${stickyScore()}
        ${pass}
        <div class="rail-bar tool-panel">
          <span>Bidding · ${esc(state.names[seat])}</span>
          <span>Call 1–8 · spades trump</span>
          ${railExtra()}
        </div>
        ${tableHtml(null)}
        ${footerActions()}
        </div>`;
        root.querySelectorAll("#bids .soft-btn, .rail-bids .soft-btn").forEach((btn) => {
          btn.onclick = () => {
            CBPlay.placeBid(state, seat, Number(btn.dataset.b));
            paint();
          };
        });
      } else if (state.phase === "play") {
        const legal = Cards.legalCB(state.hands[seat], state.leadSuit, state.trick.map((x) => x.card));
        const legalIds = new Set(legal.map((c) => c.id));
        root.innerHTML = `${topbar("pcb")}
        <div class="screen-pad">
        ${stickyScore()}
        ${pass}
        <div class="rail-bar tool-panel">
          <span>${esc(state.names[seat])} to play</span>
          <span>Room ${esc(state.roomCode)}</span>
          ${railExtra()}
        </div>
        ${tableHtml(legalIds)}
        ${footerActions()}
        </div>`;
        root.querySelectorAll(".card.playable").forEach((btn) => {
          btn.onclick = () => {
            CBPlay.playCard(state, seat, btn.getAttribute("data-id"));
            paint();
          };
        });
      } else {
        const scores = state.lastDealScores || [];
        root.innerHTML = `${topbar("pcb")}
        <div class="screen-pad">
        ${stickyScore()}
        <div class="rail-bar tool-panel">
          <span>${state.phase === "match-end" ? "Match over" : "Deal over"}</span>
          <span>Round ${state.round}/${state.maxRounds}</span>
        </div>
        ${tableHtml(null)}
        <section class="score-card settle-tray">
          <h2 class="score-card-head">${state.phase === "match-end" ? "Match totals" : "Deal scores"}</h2>
          <div class="math">${esc((scores.map((s, i) => `${state.names[i]}=${s}`).join(" · ")) || "—")}</div>
          <div class="money-chips">${state.names.map((n, i) =>
            `<div class="money-chip ${state.totals[i] >= 0 ? "win" : "lose"}"><span class="who">${esc(n)}</span><span class="money-amt">Σ${state.totals[i]}</span></div>`
          ).join("")}</div>
        </section>
        ${footerActions(
          (state.phase === "deal-end" ? `<button type="button" class="soft-btn primary" id="next">Next deal</button>` : "") +
          `<button type="button" class="soft-btn" id="save">Save log</button>`
        )}
        </div>`;
        const next = root.querySelector("#next");
        if (next) next.onclick = () => { CBPlay.nextDeal(state); paint(); };
        const save = root.querySelector("#save");
        if (save) save.onclick = () => {
          Store.upsertLog({
            id: state.id,
            game: "callbreak-play",
            title: `CB play · R${state.round}`,
            payload: state
          });
          toast("Saved");
        };
      }
      bindCommon();
    }
    paint();
  }

  /* ---------- Marriage play ---------- */
  function marriagePlayScreen() {
    let state = null;
    const saved = Store.getActive("marriage");
    if (saved && saved.game === "marriage-play" && Array.isArray(saved.stock)) state = saved;
    let lastSettle = null;
    let botTimer = null;

    function clearBotTimer() {
      if (botTimer) {
        clearTimeout(botTimer);
        botTimer = null;
      }
    }

    function start() {
      clearBotTimer();
      root.innerHTML = `${topbar("pm")}
      <div class="screen-pad">
      <section class="score-card sheet">
        <h1 class="tool-title">Play Marriage</h1>
        <p class="tool-sub">21 cards · pull discard or deck</p>
        <p class="lede">Only your hand is face-up. Opponents throw to the discard. Lay 3 sequences (or 7 dublees on the floor) before the first-cut maal opens.</p>
        <div class="score-card-actions">
          <button type="button" class="soft-btn primary" id="bots">Vs computer</button>
          <button type="button" class="soft-btn" id="hotseat">With friends</button>
        </div>
      </section>
      </div>`;
      root.querySelector("#bots").onclick = () => {
        state = MPlay.newGame({ mode: "bots" });
        lastSettle = null;
        Store.setActive("marriage", state);
        paint();
      };
      root.querySelector("#hotseat").onclick = () => {
        state = MPlay.newGame({ mode: "hotseat" });
        lastSettle = null;
        Store.setActive("marriage", state);
        paint();
      };
    }

    function initial(name) {
      return esc(String(name || "?").trim().charAt(0).toUpperCase() || "?");
    }

    function viewSeat() {
      if (state.mode === "hotseat") return state.turn;
      return 0;
    }

    function seatHtml(i) {
      const pos = ["bottom", "left", "top", "right"][i % 4];
      const hand = state.hands[i] || [];
      const active = state.turn === i;
      const floor = state.floor[i] || [];
      const seqN = state.shownSeqCount[i] || 0;
      const isYou = i === viewSeat();
      const backs = !isYou;
      return `<div class="seat ${pos}${active ? " active" : ""}${seqN >= 3 ? " has-show" : ""}" data-seat="${i}">
        <div class="avatar">${initial(state.names[i])}</div>
        <div class="name">${esc(state.names[i])}${active ? " · turn" : ""}</div>
        <div class="hand fan seat-hand">${backs
          ? Cards.backFan(Math.min(8, hand.length), { small: true }) +
            (hand.length > 8 ? `<span class="more">${hand.length}</span>` : `<span class="more">${hand.length}</span>`)
          : ""}</div>
        <div class="seat-floor-meta">${seqN ? `${seqN} seq` : "—"}</div>
        ${floor.length ? `<div class="seat-floor-mini">${floor.slice(0, 2).map((seq) =>
          `<span class="floor-chip">${seq.length}</span>`
        ).join("")}</div>` : ""}
      </div>`;
    }

    function myHandHtml() {
      const seat = viewSeat();
      const hand = state.hands[seat] || [];
      const groups = MPlay.bySuit(hand);
      const canDiscard = state.phase === "discard" && state.turn === seat;
      const suitOrder = ["S", "H", "D", "C"];
      return `<div class="my-hand" aria-label="Your 21 cards">
        <div class="my-hand-meta">
          <span>${hand.length} cards · sorted by suit</span>
          ${canDiscard ? `<span class="hint-pull">Tap a card to throw</span>` : ""}
        </div>
        <div class="suit-rows">
          ${suitOrder.map((suit) => {
            const cards = groups[suit] || [];
            if (!cards.length) return "";
            return `<div class="suit-row" data-suit="${suit}">
              <span class="suit-tag">${Cards.SUIT_SYM[suit]}</span>
              <div class="hand suit-fan">${cards.map((c, fi) =>
                Cards.html(c, {
                  small: true,
                  fan: true,
                  fanIndex: fi,
                  dataId: true,
                  playable: canDiscard,
                  disabled: !canDiscard
                })
              ).join("")}</div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
    }

    function floorHtml() {
      const piles = [];
      state.names.forEach((name, i) => {
        (state.floor[i] || []).forEach((seq, si) => {
          piles.push(`<div class="floor-seq" data-owner="${i}">
            <span class="floor-who">${esc(name)}</span>
            <div class="hand floor-fan">${seq.map((c, fi) =>
              Cards.html(c, { small: true, fan: true, fanIndex: fi })
            ).join("")}</div>
          </div>`);
        });
      });
      if (!piles.length) {
        return `<div class="floor-empty">Floor empty — lay 3 sequences when you have them</div>`;
      }
      return `<div class="floor-board">${piles.join("")}</div>`;
    }

    function centerPitHtml() {
      const top = MPlay.topDiscard(state);
      const canDraw = state.phase === "draw" && state.turn === viewSeat();
      const tipluBlock = state.maalRevealed
        ? `<div class="tiplu-open">
            <span class="pit-label">Maal · tiplu</span>
            ${Cards.html(state.tiplu, { large: true })}
            <span class="pit-sub">${esc(Cards.label(state.tiplu))}</span>
          </div>`
        : `<div class="tiplu-hidden" title="Hidden until everyone shows 3 sequences or 7 dublees on the floor">
            <span class="pit-label">First cut</span>
            ${Cards.htmlBack({ large: true })}
            <span class="pit-sub">Hidden</span>
          </div>`;
      return `<div class="marriage-pit">
        <div class="pile-stack stock-pile ${canDraw ? "pullable" : ""}" id="stock-pile" data-pull="stock" role="button" aria-label="Pull from deck">
          ${Cards.htmlBack({ large: true })}
          <span class="pile-count">${(state.stock || []).length}</span>
          ${canDraw ? `<span class="pull-hint">Pull deck</span>` : ""}
        </div>
        <div class="pile-stack discard-pile ${canDraw && top ? "pullable" : ""}" id="discard-pile" data-pull="discard" role="button" aria-label="Pull discarded card">
          ${top ? Cards.html(top, { large: true, dataId: true }) : Cards.htmlBack({ large: true })}
          ${canDraw && top ? `<span class="pull-hint">Pull discard</span>` : ""}
        </div>
        ${tipluBlock}
      </div>`;
    }

    function scheduleBots() {
      clearBotTimer();
      if (!state || state.mode !== "bots") return;
      if (state.turn === 0) return;
      botTimer = setTimeout(() => {
        MPlay.runBotsUntilHuman(state, 8);
        Store.setActive("marriage", state);
        paint();
      }, 650);
    }

    function bindPullGestures() {
      const seat = viewSeat();
      const canDraw = state.phase === "draw" && state.turn === seat;

      function doPull(kind) {
        if (!canDraw) return;
        const r = kind === "discard" ? MPlay.takeDiscard(state, seat) : MPlay.drawFromStock(state, seat);
        if (!r.ok) {
          toast(r.reason || "Can't pull");
          return;
        }
        toast(kind === "discard" ? "Took discard" : "Drew from deck");
        Store.setActive("marriage", state);
        paint();
      }

      ["stock-pile", "discard-pile"].forEach((id) => {
        const el = root.querySelector("#" + id);
        if (!el) return;
        el.onclick = () => doPull(el.getAttribute("data-pull"));

        let startY = null;
        el.addEventListener("touchstart", (e) => {
          if (!canDraw) return;
          const t = e.changedTouches[0];
          startY = t.clientY;
          el.classList.add("pulling");
        }, { passive: true });
        el.addEventListener("touchmove", (e) => {
          if (startY == null || !canDraw) return;
          const t = e.changedTouches[0];
          const dy = startY - t.clientY;
          const pull = Math.max(0, Math.min(56, dy));
          el.style.transform = `translateY(${-pull}px)`;
        }, { passive: true });
        el.addEventListener("touchend", (e) => {
          el.classList.remove("pulling");
          el.style.transform = "";
          if (startY == null || !canDraw) return;
          const t = e.changedTouches[0];
          const dy = startY - t.clientY;
          startY = null;
          if (dy > 36) doPull(el.getAttribute("data-pull"));
        });
      });
    }

    function paint() {
      if (!state) return start();
      // Migrate older sessions without stock
      if (!Array.isArray(state.stock)) {
        state = null;
        return start();
      }
      Store.setActive("marriage", state);
      const seat = viewSeat();
      const mySeqs = MPlay.findSequences(state.hands[seat] || []);
      const canLay = mySeqs.length >= 3;
      const order = [2, 3, 0, 1];
      const dubleeN = state.floorDubleeTotal || 0;

      root.innerHTML = `${topbar("pm")}
      <div class="screen-pad marriage-play-screen">
      <div class="sticky-score score-card">
        <div class="title">Marriage · ${esc(state.roomCode)}</div>
        <div class="scores">
          ${state.names.map((n, i) =>
            `<span class="${state.turn === i ? "is-turn" : ""}"><strong>${esc(n)}</strong>${
              state.maalRevealed ? ` · maal ${esc(state.maal[i])}` : ""
            }${(state.shownSeqCount[i] || 0) >= 3 ? " · shown" : ""}</span>`
          ).join("")}
        </div>
        <p class="turn-banner">${esc(state.message || "")} · floor dublees ${dubleeN}/7</p>
      </div>

      <div class="table-oval marriage-oval" data-seats="4">
        ${order.map((i) => seatHtml(i)).join("")}
        ${centerPitHtml()}
      </div>

      <section class="floor-panel score-card" aria-label="Floor sequences">
        <h2 class="score-card-head">Floor <span class="score-sum">${dubleeN} dublee</span></h2>
        ${floorHtml()}
      </section>

      ${myHandHtml()}

      <div class="row play-actions score-card-actions">
        ${canLay ? `<button type="button" class="soft-btn primary" id="lay-seq">Show 3 sequences</button>` : ""}
        ${state.maalRevealed ? `<button type="button" class="soft-btn primary" id="settle">Settle maal</button>` : `<button type="button" class="soft-btn outline" id="settle" disabled title="Maal still hidden">Settle</button>`}
        <button type="button" class="soft-btn" id="invite">Copy invite</button>
        <button type="button" class="soft-btn danger" id="quit">Quit</button>
      </div>
      <section class="score-card settle-tray" id="out">${lastSettle || ""}</section>
      </div>`;

      bindPullGestures();

      root.querySelectorAll(".my-hand .card.playable").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-id");
          const r = MPlay.discardCard(state, seat, id);
          if (!r.ok) {
            toast(r.reason || "Can't throw");
            return;
          }
          Store.setActive("marriage", state);
          paint();
          scheduleBots();
        };
      });

      const lay = root.querySelector("#lay-seq");
      if (lay) {
        lay.onclick = () => {
          const r = MPlay.laySequences(state, seat);
          if (!r.ok) {
            toast(r.reason || "Need 3 sequences");
            return;
          }
          toast(r.revealed ? "Tiplu / maal opened" : "Sequences on the floor");
          Store.setActive("marriage", state);
          paint();
        };
      }

      const settle = root.querySelector("#settle");
      if (settle && !settle.disabled) {
        settle.onclick = () => {
          MPlay.recomputeMaal(state);
          // Highest maal wins by default if not set
          let best = 0;
          state.maal.forEach((m, i) => { if (m > state.maal[best]) best = i; });
          state.winnerIndex = best;
          const calc = MPlay.toCalcSession(state);
          const r = MCalc.settle(calc);
          Store.upsertLog({
            id: state.id,
            game: "marriage-play",
            title: "Marriage play settle",
            payload: { state, result: r }
          });
          lastSettle = `<h2 class="score-card-head">Settlement</h2>
            <div class="math">${esc(r.lines.join("\n"))}</div>
            <div class="money-chips">${r.players.map((p, i) =>
              `<div class="money-chip ${r.money[i] >= 0 ? "win" : "lose"}"><span class="who">${esc(p.name)}</span><span class="money-amt">${r.money[i] >= 0 ? "+" : ""}${r.money[i]}</span><span class="money-pts">${r.netPts[i]} pts</span></div>`
            ).join("")}</div>`;
          state.phase = "settle";
          paint();
        };
      }

      root.querySelector("#invite").onclick = () => copyText(JSON.stringify(MPlay.exportInvite(state)));
      root.querySelector("#quit").onclick = () => {
        clearBotTimer();
        Store.clearActive("marriage");
        state = null;
        lastSettle = null;
        location.hash = "#/";
      };

      scheduleBots();
    }
    paint();
  }

  function logsScreen() {
    const list = Store.logs();
    root.innerHTML = `${topbar("logs")}
    <div class="screen-pad">
    <section class="score-card sheet settle-tray score-slips">
      <h1 class="score-card-head tool-title">Score slips</h1>
      <p class="tool-sub">Resume a saved calculator or play session from this device.</p>
      ${list.length ? list.map((row) => `<article class="score-slip score-card">
        <header class="score-card-head">${esc(row.title || row.id)}</header>
        <p class="slip-meta tool-sub">${esc(row.game)}</p>
        <div class="score-card-actions">
          <button type="button" class="soft-btn" data-resume="${esc(row.id)}">Resume</button>
          <button type="button" class="soft-btn" data-share="${esc(row.id)}">Share</button>
          <button type="button" class="soft-btn danger" data-del="${esc(row.id)}">Delete</button>
        </div>
      </article>`).join("") : `<p class="lede">No slips yet — save from a calculator or play session.</p>`}
    </section>
    </div>`;

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
    <div class="screen-pad">
    <section class="score-card sheet">
      <h1 class="score-card-head tool-title">Join invite</h1>
      <p class="tool-sub">Same-session sync only — no server</p>
      <p class="lede">Paste a room JSON from a friend.</p>
      <div class="field"><label>Invite JSON</label><textarea id="blob" placeholder='{"code":"ABC123","game":"callbreak-play",...}'></textarea></div>
      <div class="score-card-actions">
        <button type="button" class="soft-btn primary" id="go">Load</button>
      </div>
    </section>
    </div>`;
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

  let screenCleanup = null;

  function route() {
    if (typeof screenCleanup === "function") {
      try {
        screenCleanup();
      } catch (_) {}
      screenCleanup = null;
    }
    const hash = location.hash.replace(/^#/, "") || "/";
    const parts = hash.split("/").filter(Boolean);
    if (!parts.length) {
      root.innerHTML = home();
      return;
    }
    if (parts[0] === "calc" && parts[1] === "marriage") {
      // #/calc/marriage/live/:peerId[/claim/:ticket]
      if (parts[2] === "live" && parts[3]) {
        const peerId = decodeURIComponent(parts[3]);
        const claimTicket = parts[4] === "claim" && parts[5]
          ? decodeURIComponent(parts[5])
          : null;
        screenCleanup = marriageCalcScreen({
          access: "view",
          liveRole: claimTicket ? "claiming" : "viewer",
          livePeerId: peerId,
          claimTicket,
          skipGate: true
        }) || null;
        return;
      }
      // #/calc/marriage/review/:logId
      if (parts[2] === "review" && parts[3]) {
        const logId = decodeURIComponent(parts[3]);
        const row = Store.logsByGame("marriage-calc").find((x) => x.id === logId);
        if (!row || !row.payload) {
          toast("Saved match not found");
          location.hash = "#/calc/marriage";
          return;
        }
        screenCleanup = marriageCalcScreen({
          access: "review",
          liveRole: "review",
          session: row.payload,
          skipGate: true
        }) || null;
        return;
      }
      screenCleanup = marriageCalcScreen() || null;
      return;
    }
    if (parts[0] === "calc" && parts[1] === "callbreak") {
      if (parts[2] === "live" && parts[3]) {
        const peerId = decodeURIComponent(parts[3]);
        const claimTicket = parts[4] === "claim" && parts[5]
          ? decodeURIComponent(parts[5])
          : null;
        screenCleanup = cbCalcScreen({
          access: "view",
          liveRole: claimTicket ? "claiming" : "viewer",
          livePeerId: peerId,
          claimTicket
        }) || null;
        return;
      }
      screenCleanup = cbCalcScreen() || null;
      return;
    }
    if (parts[0] === "play" && parts[1] === "cb") return cbPlayScreen();
    if (parts[0] === "play" && parts[1] === "marriage") return marriagePlayScreen();
    if (parts[0] === "logs") return logsScreen();
    if (parts[0] === "invite") return inviteScreen();
    root.innerHTML = home();
  }

  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update().catch(() => {});
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }).catch(() => {});
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  }
})();
