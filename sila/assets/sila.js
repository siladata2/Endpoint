/* =========================================================
   SILA API — shared front-end helpers
   Used by every page (public site + admin panel).
   ========================================================= */
(function () {
  "use strict";

  var SILA = {};

  SILA.BASE = window.location.origin;

  /* ---------- tiny helpers ---------- */
  SILA.esc = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  SILA.num = function (value) {
    var n = Number(value || 0);
    return n.toLocaleString("en-US");
  };

  SILA.numShort = function (value) {
    var n = Number(value || 0);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return SILA.num(n);
  };

  SILA.catLabel = function (name) {
    var map = { ai: "AI", image: "Image", media: "Media", download: "Downloader", tools: "Tools", search: "Search", tts: "Text to Speech", data: "Data" };
    var key = String(name || "general").toLowerCase();
    if (map[key]) return map[key];
    return key.replace(/[-_]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  };

  SILA.timeAgo = function (dateInput) {
    var t = new Date(dateInput).getTime();
    if (!t) return "—";
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return s + "s ago";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  };

  SILA.fmtDate = function (value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  SILA.uptime = function (seconds) {
    var s = Number(seconds || 0);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d) return d + "d " + h + "h";
    if (h) return h + "h " + m + "m";
    return m + "m";
  };

  /* ---------- copy + toast ---------- */
  SILA.toast = function (message) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(SILA._toastTimer);
    SILA._toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1900);
  };

  SILA.copy = function (text) {
    var value = String(text == null ? "" : text);
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(function () { SILA.toast("Copied to clipboard"); }, function () { fallback(); SILA.toast("Copied"); });
    } else {
      fallback();
      SILA.toast("Copied");
    }
  };

  /* ---------- data ---------- */
  SILA.getJSON = function (path) {
    return fetch(SILA.BASE + path, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { if (!res.ok) { data.__status = res.status; } return data; }); });
  };

  /* Polls an endpoint and calls back with fresh data.
     Keeps working while the tab is hidden (slower) and refreshes
     immediately when the tab becomes visible again. */
  SILA.live = function (path, intervalMs, onData, onError) {
    var stopped = false;
    function tick() {
      if (stopped) return;
      SILA.getJSON(path).then(function (data) {
        if (stopped) return;
        if (data && data.__status) { onError && onError(data); } else { onData && onData(data); }
      }).catch(function (err) { if (!stopped) onError && onError(err); });
    }
    tick();
    var timer = setInterval(function () {
      if (document.hidden) return;
      tick();
    }, intervalMs || 10000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
    return { stop: function () { stopped = true; clearInterval(timer); } };
  };

  /* ---------- syntax highlight for JSON responses ---------- */
  SILA.highlight = function (json) {
    return String(json)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g, function (match, str, colon, bool) {
        if (str) return colon ? '<span class="k">' + str + "</span>" + colon : '<span class="s">' + str + "</span>";
        if (bool) return '<span class="b">' + match + "</span>";
        return '<span class="n">' + match + "</span>";
      });
  };

  /* ---------- page chrome ---------- */
  SILA.chrome = function () {
    var toggle = document.querySelector(".menu-toggle");
    var menu = document.querySelector(".mobile-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    document.querySelectorAll("[data-copy]").forEach(function (el) {
      el.addEventListener("click", function () { SILA.copy(el.getAttribute("data-copy")); });
    });
  };

  window.SILA = SILA;
  document.addEventListener("DOMContentLoaded", SILA.chrome);
})();
