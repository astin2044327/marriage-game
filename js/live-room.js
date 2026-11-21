/**
 * Live Marriage calculator rooms via PeerJS (P2P).
 * Viewer link: read-only, stays in sync while the host tab is open.
 * Host-transfer link: claimant becomes editor; previous host becomes viewer.
 */
(function () {
  const PEER_SRC = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  const CLIENT_KEY = "mg-client-id";
  const LIVE_KEY = "mg-live-marriage";

  let peerLoader = null;

  function clientId() {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = window.MG_SAFE.uid();
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function loadLive() {
    return window.MG_SAFE.loadJSON(LIVE_KEY, () => null);
  }

  function saveLive(meta) {
    if (!meta) {
      localStorage.removeItem(LIVE_KEY);
      return null;
    }
    window.MG_SAFE.saveJSON(LIVE_KEY, meta);
    return meta;
  }

  function absoluteHash(hashPath) {
    const base = location.href.split("#")[0];
    return base + (hashPath.charAt(0) === "#" ? hashPath : "#" + hashPath);
  }

  function normalizeGamePath(gamePath) {
    const p = String(gamePath || "calc/marriage").replace(/^#\/?/, "").replace(/\/+$/, "");
    return p || "calc/marriage";
  }

  function viewerLink(peerId, gamePath) {
    return absoluteHash("#/" + normalizeGamePath(gamePath) + "/live/" + encodeURIComponent(peerId));
  }

  function claimLink(peerId, ticket, gamePath) {
    return absoluteHash(
      "#/" +
        normalizeGamePath(gamePath) +
        "/live/" +
        encodeURIComponent(peerId) +
        "/claim/" +
        encodeURIComponent(ticket)
    );
  }

  function loadPeer() {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (peerLoader) return peerLoader;
    peerLoader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PEER_SRC;
      s.async = true;
      s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error("PeerJS missing")));
      s.onerror = () => reject(new Error("Could not load PeerJS"));
      document.head.appendChild(s);
    });
    return peerLoader;
  }

  function cloneSession(session) {
    return JSON.parse(JSON.stringify(session));
  }

  function attachHostBehavior(peer, session, handlers) {
    const h = handlers || {};
    const gamePath = normalizeGamePath(h.gamePath);
    const myId = clientId();
    let rev = 1;
    let ticket = null;
    let ticketExp = 0;
    const conns = new Set();
    let closed = false;
    let current = cloneSession(session);
    const peerId = peer.id;

    function broadcast(msg) {
      conns.forEach((conn) => {
        try {
          if (conn.open) conn.send(msg);
        } catch (_) {}
      });
    }

    function pushState() {
      rev += 1;
      broadcast({
        t: "state",
        rev,
        hostClientId: myId,
        session: current,
        at: Date.now()
      });
      if (h.onPush) h.onPush(rev);
    }

    function sendState(conn) {
      try {
        conn.send({
          t: "state",
          rev,
          hostClientId: myId,
          session: current,
          at: Date.now()
        });
      } catch (_) {}
    }

    function wireConn(conn) {
      conns.add(conn);
      conn.on("data", (msg) => {
        if (!msg || typeof msg !== "object") return;
        if (msg.t === "hello") {
          sendState(conn);
          return;
        }
        if (msg.t === "claim") {
          if (!ticket || msg.ticket !== ticket || Date.now() > ticketExp) {
            try {
              conn.send({ t: "claim_denied", reason: "expired" });
            } catch (_) {}
            return;
          }
          const nextHostId = String(msg.newHostId || "");
          if (!nextHostId) {
            try {
              conn.send({ t: "claim_denied", reason: "bad_peer" });
            } catch (_) {}
            return;
          }
          ticket = null;
          ticketExp = 0;
          broadcast({
            t: "rehost",
            newHostId: nextHostId,
            session: current,
            rev,
            at: Date.now()
          });
          try {
            conn.send({
              t: "claim_ok",
              session: current,
              rev,
              newHostId: nextHostId,
              at: Date.now()
            });
          } catch (_) {}
          if (h.onTransferred) h.onTransferred(nextHostId, current);
        }
      });
      conn.on("close", () => conns.delete(conn));
      conn.on("error", () => conns.delete(conn));
      if (conn.open) sendState(conn);
      else conn.on("open", () => sendState(conn));
    }

    peer.on("connection", wireConn);
    saveLive({ role: "host", peerId, clientId: myId, at: Date.now() });

    return {
      role: "host",
      peerId,
      clientId: myId,
      gamePath,
      viewerLink: () => viewerLink(peerId, gamePath),
      makeClaimLink() {
        ticket = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
        ticketExp = Date.now() + 15 * 60 * 1000;
        return claimLink(peerId, ticket, gamePath);
      },
      publish(nextSession) {
        if (closed) return;
        current = cloneSession(nextSession);
        pushState();
      },
      destroy() {
        closed = true;
        try {
          conns.forEach((c) => c.close());
        } catch (_) {}
        conns.clear();
        try {
          peer.destroy();
        } catch (_) {}
        const live = loadLive();
        if (live && live.peerId === peerId && live.role === "host") saveLive(null);
      }
    };
  }

  function createHost(session, handlers) {
    const h = handlers || {};
    return loadPeer().then((Peer) => new Promise((resolve, reject) => {
      const peer = new Peer({ debug: 0 });
      let opened = false;
      peer.on("error", (err) => {
        if (!opened) reject(err);
        else if (h.onError) h.onError(err);
      });
      peer.on("open", () => {
        opened = true;
        resolve(attachHostBehavior(peer, session, h));
      });
    }));
  }

  /**
   * Join a host as viewer. Optional claimTicket promotes this peer to host on success.
   * onPromoted(hostCtl) is called with a full host controller using this same peer.
   */
  function joinAsViewer(hostPeerId, handlers) {
    const h = handlers || {};
    const myId = clientId();
    let peer = null;
    let conn = null;
    let closed = false;
    let claimTicket = h.claimTicket || null;
    let promoted = false;

    function connectTo(targetId) {
      if (closed || promoted) return;
      try {
        if (conn) conn.close();
      } catch (_) {}
      conn = peer.connect(targetId, { reliable: true });
      conn.on("open", () => {
        try {
          conn.send({ t: "hello", clientId: myId });
          if (claimTicket) {
            conn.send({
              t: "claim",
              ticket: claimTicket,
              newHostId: peer.id,
              clientId: myId
            });
          }
        } catch (_) {}
        if (h.onStatus) h.onStatus("connected");
      });
      conn.on("data", (msg) => {
        if (!msg || typeof msg !== "object") return;
        if (msg.t === "state" && h.onState) h.onState(msg.session, msg);
        if (msg.t === "rehost" && msg.newHostId) {
          if (msg.newHostId === peer.id) return;
          claimTicket = null;
          if (h.onRehost) h.onRehost(msg.newHostId, msg.session);
          connectTo(msg.newHostId);
        }
        if (msg.t === "claim_ok") {
          claimTicket = null;
          promoted = true;
          try {
            if (conn) conn.close();
          } catch (_) {}
          conn = null;
          const hostCtl = attachHostBehavior(peer, msg.session || {}, h);
          saveLive({ role: "host", peerId: peer.id, clientId: myId, at: Date.now() });
          if (h.onPromoted) h.onPromoted(hostCtl, msg.session);
        }
        if (msg.t === "claim_denied" && h.onClaimDenied) h.onClaimDenied(msg.reason);
      });
      conn.on("close", () => {
        if (!closed && !promoted && h.onStatus) h.onStatus("disconnected");
      });
      conn.on("error", () => {
        if (!closed && !promoted && h.onStatus) h.onStatus("error");
      });
    }

    return loadPeer().then((Peer) => new Promise((resolve, reject) => {
      peer = new Peer({ debug: 0 });
      peer.on("error", (err) => {
        if (h.onError) h.onError(err);
        if (!peer.open) reject(err);
      });
      peer.on("open", () => {
        saveLive({
          role: claimTicket ? "claiming" : "viewer",
          peerId: hostPeerId,
          clientId: myId,
          at: Date.now()
        });
        connectTo(hostPeerId);
        resolve({
          role: "viewer",
          clientId: myId,
          peerId: peer.id,
          hostPeerId,
          destroy() {
            if (promoted) return;
            closed = true;
            try {
              if (conn) conn.close();
            } catch (_) {}
            try {
              peer.destroy();
            } catch (_) {}
          },
          reconnect(nextHostId) {
            connectTo(nextHostId);
          }
        });
      });
    }));
  }

  window.MG_LIVE = {
    clientId,
    loadLive,
    saveLive,
    viewerLink,
    claimLink,
    createHost,
    joinAsViewer,
    cloneSession
  };
})();
