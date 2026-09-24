/* Фоновые частицы сайта: спокойный дрейф по всему экрану,
   отталкивание от курсора, резкий разлёт по клику на кнопки
   с возвратом на место. Без геометрических фигур — только фон. */
(function () {
  "use strict";

  var canvas = document.querySelector("canvas[data-brain]");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var w = 0, h = 0, dpr = 1;
  var parts = [];
  var mouse = { x: -9999, y: -9999, r: 150 };

  var PALETTE = [
    [186, 215, 247], // ice
    [168, 201, 255], // sky
    [128, 82, 255],  // violet
    [79, 214, 180],  // verdant
    [255, 47, 69]    // signal-red — редкие «искры»
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makeParticles() {
    var count = Math.min(150, Math.max(60, Math.round((w * h) / 14000)));
    parts = [];
    for (var i = 0; i < count; i++) {
      // 85% — приглушённый лёд, 10% — цветные, 5% — красные искры
      var roll = Math.random();
      var c = roll < 0.85 ? PALETTE[0] : (roll < 0.95 ? PALETTE[1 + ((Math.random() * 3) | 0)] : PALETTE[4]);
      var hx = rnd(0, w), hy = rnd(0, h);
      parts.push({
        hx: hx, hy: hy,             // домашняя позиция
        x: hx, y: hy, vx: 0, vy: 0, // текущая
        r: rnd(0.7, 2.3),
        a: rnd(0.18, 0.6),
        c: c,
        ph: rnd(0, Math.PI * 2),    // фаза дрейфа
        sp: rnd(0.15, 0.45),        // скорость дрейфа
        amp: rnd(6, 22)             // амплитуда дрейфа
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
    if (reduce) drawStatic();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      ctx.globalAlpha = p.a * 0.7;
      ctx.fillStyle = "rgb(" + p.c[0] + "," + p.c[1] + "," + p.c[2] + ")";
      ctx.beginPath();
      ctx.arc(p.hx, p.hy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Резкий разлёт от точки: импульс каждому частице, дальше
     пружинный возврат к домашней позиции («слетались» обратно). */
  function burst(bx, by) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var dx = p.x - bx, dy = p.y - by;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var force = 14 * (1 - Math.min(d, 700) / 700) + 3;
      p.vx += (dx / d) * force + rnd(-2.5, 2.5);
      p.vy += (dy / d) * force + rnd(-2.5, 2.5);
    }
  }

  // Клики по кнопкам/карточкам/ссылкам — триггер разлёта
  document.addEventListener("click", function (e) {
    if (reduce) return;
    var t = e.target;
    while (t && t !== document) {
      if (t.matches && t.matches("a, button, summary, .deck, .tab")) {
        burst(e.clientX, e.clientY);
        return;
      }
      t = t.parentNode;
    }
  }, true);

  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener("pointerleave", function () {
    mouse.x = -9999; mouse.y = -9999;
  });

  var last = 0;
  function frame(now) {
    if (document.hidden) { last = now; requestAnimationFrame(frame); return; }
    var dt = Math.min((now - last) / 1000, 0.05) || 0.016;
    last = now;
    var t = now / 1000;

    ctx.clearRect(0, 0, w, h);

    // связи между соседями — только фоновая паутинка, очень слабая
    ctx.lineWidth = 0.6;
    for (var i = 0; i < parts.length; i++) {
      var a = parts[i];
      for (var j = i + 1; j < parts.length; j++) {
        var b = parts[j];
        var ddx = a.x - b.x, ddy = a.y - b.y;
        var d2 = ddx * ddx + ddy * ddy;
        if (d2 < 110 * 110) {
          ctx.globalAlpha = (1 - Math.sqrt(d2) / 110) * 0.09;
          ctx.strokeStyle = "rgb(186,215,247)";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (var k = 0; k < parts.length; k++) {
      var p = parts[k];

      if (!reduce) {
        // тихий дрейф вокруг домашней точки
        var tx = p.hx + Math.cos(t * p.sp + p.ph) * p.amp;
        var ty = p.hy + Math.sin(t * p.sp * 0.8 + p.ph) * p.amp;
        p.vx += (tx - p.x) * 0.9 * dt;   // возврат-пружина
        p.vy += (ty - p.y) * 0.9 * dt;

        // отталкивание от курсора (как было)
        var mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        var md2 = mdx * mdx + mdy * mdy;
        if (md2 < mouse.r * mouse.r && md2 > 0.01) {
          var md = Math.sqrt(md2);
          var push = (1 - md / mouse.r) * 4.2;
          p.vx += (mdx / md) * push * dt * 60 * 0.08;
          p.vy += (mdy / md) * push * dt * 60 * 0.08;
        }

        p.vx *= Math.pow(0.86, dt * 60); // затухание
        p.vy *= Math.pow(0.86, dt * 60);
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
      }

      ctx.globalAlpha = p.a;
      ctx.fillStyle = "rgb(" + p.c[0] + "," + p.c[1] + "," + p.c[2] + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(frame);
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 180);
  });

  resize();
  if (!reduce) {
    last = performance.now();
    requestAnimationFrame(frame);
  }
})();
