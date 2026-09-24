/* Лендинг: медленный прилёт трёх окон, их «плавание в воде», выбор
   направления и разворачивание полного стеклянного резюме ПРЯМО ПОД окнами.
   Отдельные страницы (leader/sales/procurement.html) остаются — на них
   можно дать прямую ссылку и оттуда распечатать PDF. */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEYS = ["leader", "sales", "procurement"];
  var cache = {};
  var decks = Array.prototype.slice.call(document.querySelectorAll(".deck"));

  var stage = document.getElementById("stage");
  var stageBody = document.getElementById("stageBody");
  var stageOpen = document.getElementById("stageOpen");
  var stageClose = document.getElementById("stageClose");
  var tabs = stage ? Array.prototype.slice.call(stage.querySelectorAll(".tab")) : [];
  var current = null;
  var scrollAfter = false;

  /* --- 1. Прилёт: медленно, поочерёдно, с мягким блюром (анимации в CSS) --- */
  function land() {
    decks.forEach(function (d, i) {
      setTimeout(function () { d.classList.add("js-landed"); }, reduce ? 0 : 300 + i * 440);
    });
  }
  decks.forEach(function (d) {
    d.addEventListener("animationend", function (e) {
      if (!e.animationName || e.animationName.indexOf("fly-") !== 0) return;
      if (!d.classList.contains("js-float")) d.classList.add("js-float");
    });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", land);
  else land();

  /* --- 2. Копирование контактов по клику (на страницах резюме и в сцене) --- */
  function bindCopy(root) {
    root.querySelectorAll("[data-copy]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var text = el.getAttribute("data-copy");
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(function () {
          var old = el.textContent;
          el.textContent = "Скопировано!";
          setTimeout(function () { el.textContent = old; }, 1500);
        });
      });
    });
  }

  /* --- 3. Сцена: полное резюме под тремя окнами --- */
  function setActive(key) {
    decks.forEach(function (d) {
      var on = d.getAttribute("data-key") === key;
      d.classList.toggle("is-active", on);
      if (on) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-key") === key;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (stage) {
      if (key) stage.setAttribute("data-key", key);
      else stage.removeAttribute("data-key");
    }
    if (stageOpen && key) stageOpen.setAttribute("href", key + ".html");
  }

  function render(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var frag = document.createDocumentFragment();
    [".cv-hero", ".cv-body", ".legal"].forEach(function (sel) {
      var node = doc.querySelector(sel);
      if (node) frag.appendChild(document.importNode(node, true));
    });
    stageBody.innerHTML = "";
    stageBody.appendChild(frag);
    bindCopy(stageBody);
    stage.classList.remove("is-loading");
    // перезапуск анимации появления контента
    void stageBody.offsetWidth;
    stage.classList.add("is-in");
    if (scrollAfter) {
      scrollAfter = false;
      stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  function open(key, scroll) {
    if (!stage || KEYS.indexOf(key) < 0) { if (key) window.location.href = key + ".html"; return; }
    current = key;
    scrollAfter = scroll !== false;
    setActive(key);
    stage.hidden = false;
    if (cache[key]) {
      render(cache[key]);
      return;
    }
    stage.classList.add("is-loading");
    fetch(key + ".html", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (html) {
      cache[key] = html;
      render(html);
    }).catch(function () {
      // без fetch (локальный файл, офлайн) — просто открываем страницу целиком
      window.location.href = key + ".html";
    });
  }

  function close() {
    if (!stage || stage.hidden) return;
    stage.hidden = true;
    stage.classList.remove("is-in");
    stage.removeAttribute("data-key");
    if (window.history && history.replaceState) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    current = null;
    decks.forEach(function (d) { d.classList.remove("is-active"); d.removeAttribute("aria-current"); });
    var decksBox = document.querySelector(".decks");
    if (decksBox) decksBox.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  /* --- 4. Связывание: окна, вкладки, кнопки, клавиатура, адресная строка --- */
  document.querySelectorAll("[data-key]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var key = el.getAttribute("data-key");
      if (!stage || KEYS.indexOf(key) < 0) return; // обычная ссылка на страницу
      e.preventDefault();
      if (window.history && history.pushState) history.pushState({ key: key }, "", "#" + key);
      open(key);
    });
    // предзагрузка по наведению — переключение становится мгновенным
    el.addEventListener("mouseenter", function () {
      var key = el.getAttribute("data-key");
      if (!stage || cache[key] || KEYS.indexOf(key) < 0) return;
      fetch(key + ".html").then(function (r) { return r.text(); })
        .then(function (t) { cache[key] = t; }).catch(function () {});
    });
  });

  if (stageClose) stageClose.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (stage && !stage.hidden) close();
  });

  function keyFromHash() {
    return (window.location.hash || "").replace("#", "");
  }
  window.addEventListener("hashchange", function () {
    var key = keyFromHash();
    if (KEYS.indexOf(key) >= 0) { if (key !== current) open(key); }
    else if (stage && !stage.hidden) close();
  });

  /* --- 5. Интерактив: копирование контактов, счётчики, появление блоков --- */
  // телефон / почта / Telegram / MAX копируются по клику (текст ссылки)
  document.querySelectorAll(".kv dd a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0 || href.indexOf("mailto:") === 0 ||
        a.host.indexOf("t.me") >= 0 || a.host.indexOf("max.ru") >= 0) {
      a.setAttribute("data-copy", a.textContent.trim());
    }
  });

  function countUp(el) {
    var m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m || reduce) return;
    var target = parseInt(m[1], 10), suffix = m[2];
    if (!target) return;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min((ts - start) / 900, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = "0" + suffix;
    requestAnimationFrame(step);
  }

  // reveal-появление панелей/записей/счётчиков по мере прокрутки
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("js-in");
        en.target.querySelectorAll(".numbers .stat b").forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll(".panel, .entry, .cv-hero").forEach(function (el) {
      el.classList.add("js-reveal");
      io.observe(el);
    });
  }

  bindCopy(document);
  if (stage && KEYS.indexOf(keyFromHash()) >= 0) open(keyFromHash());
})();
