/* Прилёт стеклянных окон и разворачивание центрального мини-резюме */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 1. Прилёт трёх окон с разных сторон (слева / сверху по центру / справа) --- */
  function land() {
    var decks = document.querySelectorAll(".deck");
    decks.forEach(function (d, i) {
      setTimeout(function () {
        d.classList.add("js-landed");
        setTimeout(function () { d.classList.add("js-settled"); }, 1300);
      }, reduce ? 0 : 120 + i * 180);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", land);
  } else {
    land();
  }

  /* --- 2. Разворачивание центрального окна во весь экран, затем переход на страницу --- */
  var expanding = false;
  function expandCenter(deck, href) {
    if (expanding || reduce) return;
    expanding = true;
    var r = deck.getBoundingClientRect();
    var w = window.innerWidth, h = window.innerHeight;
    var clone = deck.cloneNode(true);
    clone.classList.add("deck--clone");
    clone.style.cssText =
      "position:fixed;left:" + r.left + "px;top:" + r.top + "px;" +
      "width:" + r.width + "px;height:" + r.height + "px;margin:0;z-index:999;opacity:1;";
    document.body.appendChild(clone);
    deck.style.visibility = "hidden";
    var anim = clone.animate(
      [
        { transform: "translate(0,0) scale(1)", borderRadius: "16px" },
        { transform: "translate(" + (-r.left) + "px," + (-r.top) + "px) scale(1)", borderRadius: "16px", offset: 0.15 },
        { transform: "translate(" + (-r.left) + "px," + (-r.top) + "px) scale(" + Math.max(w / r.width, h / r.height) + ")", borderRadius: "0px" }
      ],
      { duration: 620, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" }
    );
    anim.onfinish = function () { window.location.href = href; };
  }

  document.querySelectorAll("[data-expand]").forEach(function (deck) {
    deck.addEventListener("click", function (e) {
      e.preventDefault();
      expandCenter(deck, deck.getAttribute("href"));
    });
  });

  /* --- 3. Копирование e-mail по клику (боковая колонка на страницах резюме) --- */
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var text = el.getAttribute("data-copy");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          var old = el.textContent;
          el.textContent = "Скопировано!";
          setTimeout(function () { el.textContent = old; }, 1500);
        });
      }
    });
  });
})();
