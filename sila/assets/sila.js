/* SILA API — shared page helpers */
(function () {
  "use strict";

  var OLD_URL = "https://api.silatech.site";

  /* Show the real base URL of whatever domain this is running on */
  function fillBaseUrl() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim() === OLD_URL) {
        node.nodeValue = node.nodeValue.replace(OLD_URL, window.location.origin);
      }
    }
  }

  /* Fade-in sections as they scroll into view */
  function reveal() {
    if (!("IntersectionObserver" in window)) return;

    var targets = document.querySelectorAll(".section, .api-card, .endpoint, .stat");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("sila-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible
      el.classList.add("sila-reveal");
      io.observe(el);
    });

    /* cards injected later by fetch() */
    var grid = document.getElementById("apiGrid") || document.getElementById("endpointList");
    if (grid && "MutationObserver" in window) {
      new MutationObserver(function () {
        grid.querySelectorAll(".api-card, .endpoint").forEach(function (el) {
          if (!el.classList.contains("sila-seen")) {
            el.classList.add("sila-seen", "sila-reveal");
            requestAnimationFrame(function () {
              el.classList.add("sila-in");
            });
          }
        });
      }).observe(grid, { childList: true });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillBaseUrl();
    reveal();
  });
})();
