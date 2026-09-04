(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  var copyBtn = document.querySelector("[data-copy]");
  var snippet = document.querySelector("[data-snippet]");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    links.querySelectorAll("a").forEach(function (anchor) {
      anchor.addEventListener("click", function () {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if (copyBtn && snippet) {
    copyBtn.addEventListener("click", function () {
      var text = snippet.textContent.trim();
      var done = function () {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        window.setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("copied");
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          window.prompt("Copy install snippet", text);
        });
      } else {
        window.prompt("Copy install snippet", text);
      }
    });
  }
})();
