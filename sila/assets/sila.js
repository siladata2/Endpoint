/* SILA API — shared helpers (loaded by every public page, before page scripts) */
(function () {
  "use strict";

  var OLD_URL = "https://api.silatech.site";

  /* ---------- helpers ---------- */

  window.escapeHtml = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /* 'ai' -> 'AI', 'image' -> 'Image' */
  window.catLabel = function (c) {
    c = String(c || "general");
    return c.length <= 3 ? c.toUpperCase() : c.charAt(0).toUpperCase() + c.slice(1);
  };

  var toastTimer;
  window.silaToast = function (message) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2000);
  };

  window.copyText = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (err) {}
      area.remove();
    }
    window.silaToast("Copied to clipboard");
  };

  /* ---------- mobile navigation ---------- */

  function setupNav() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".menu-toggle");
    if (!header || !toggle) return;

    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        header.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) header.classList.remove("open");
    });
  }

  /* ---------- show the real base URL of whatever domain this runs on ---------- */

  function fillBaseUrl() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    var targets = [];
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf(OLD_URL) !== -1 && !node.parentNode.closest("a")) targets.push(node);
    }
    targets.forEach(function (n) {
      n.nodeValue = n.nodeValue.split(OLD_URL).join(window.location.origin);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    fillBaseUrl();
  });
})();
