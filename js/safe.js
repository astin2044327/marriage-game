/** Esc + safe localStorage helpers. */
(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJSON(key, blank) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return typeof blank === "function" ? blank() : structuredClone(blank);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return typeof blank === "function" ? blank() : structuredClone(blank);
      }
      return parsed;
    } catch (_) {
      return typeof blank === "function" ? blank() : structuredClone(blank);
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function uid() {
    return "mg-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  window.MG_SAFE = { esc, loadJSON, saveJSON, uid };
})();
