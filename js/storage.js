/** Session logs + settings. */
(function () {
  const S = window.MG_SAFE;
  const KEYS = {
    settings: "mg-settings",
    logs: "mg-logs",
    cb: "mg-active-cb",
    marriage: "mg-active-marriage",
    invite: "mg-invite"
  };

  function settings() {
    return S.loadJSON(KEYS.settings, () => ({
      lastMode: "murder",
      defaultRate: 1,
      defaultCurrency: "npr",
      openMarriageDefault: false
    }));
  }

  function saveSettings( partial) {
    const cur = settings();
    Object.assign(cur, partial || {});
    S.saveJSON(KEYS.settings, cur);
    return cur;
  }

  function logs() {
    const list = S.loadJSON(KEYS.logs, () => []);
    return Array.isArray(list) ? list : [];
  }

  function logsByGame(game) {
    const g = String(game || "");
    return logs().filter((row) => String(row.game || "") === g);
  }

  function upsertLog(entry) {
    const list = logs();
    const i = list.findIndex((x) => x.id === entry.id);
    const row = Object.assign({ updatedAt: Date.now() }, entry);
    if (i >= 0) list[i] = Object.assign({}, list[i], row);
    else list.unshift(Object.assign({ createdAt: Date.now() }, row));
    S.saveJSON(KEYS.logs, list.slice(0, 40));
    return row;
  }

  function deleteLog(id) {
    S.saveJSON(KEYS.logs, logs().filter((x) => x.id !== id));
  }

  function getActive(kind) {
    return S.loadJSON(kind === "cb" ? KEYS.cb : KEYS.marriage, () => null);
  }

  function setActive(kind, state) {
    S.saveJSON(kind === "cb" ? KEYS.cb : KEYS.marriage, state);
  }

  function clearActive(kind) {
    localStorage.removeItem(kind === "cb" ? KEYS.cb : KEYS.marriage);
  }

  function setInvite(blob) {
    S.saveJSON(KEYS.invite, blob);
  }

  function getInvite() {
    return S.loadJSON(KEYS.invite, () => null);
  }

  window.MG_STORE = {
    KEYS, settings, saveSettings, logs, logsByGame, upsertLog, deleteLog,
    getActive, setActive, clearActive, setInvite, getInvite
  };
})();
