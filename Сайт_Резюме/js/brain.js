/* Фоновые частицы сайта — плотное поле по всему экрану.
   Тихий дрейф + паутинка; отталкивание от курсора;
   клик по кнопкам/карточкам — РЕЗКИЙ разлёт на большое
   расстояние с последующим сбором обратно (пружина).
   Частицы яркие, с послесвечением в момент разлёта. */
(function () {
  "use strict";

  var canvas = document.querySelector("canvas[data-brain]");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var w = 0, h = 0, dpr = 1;
  var parts = [];
  var mouse = { x: -9999, y: -9999, r: 170 };

  var PALETTE = [
    [186, 215, 247], // ice
    [168, 201, 255], // sky
    [128, 82, 255],  // violet
    [79, 214, 180],  // verdant
    [255, 47, 69]    // signal-red
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makeParticles() {
    // Плотно: ~1 частица на 6000 px² экрана, 120…340 штук
    var count = Math.min(340, Math.max(120, Math.round((w * h) / 6000)));
    parts = [];
    for (var i = 0; i < count; i++) {
      var roll = Math.random();
      var c = roll < 0.82 ? PALETTE[0]
            : roll < 0.94 ? PALETTE[1 + ((Math.random() * 3) | 0)]
            : PALETTE[4];
      var hx = rnd(0, w), hy = rnd(0, h);
      parts.push({
        hx: hx, hy: hy,
        x: hx, y: hy, vx: 0, vy: 0,
        r: rnd(0.8, 2.6),
        a: rnd(0.22, 0.7),
        c: c,
        ph: rnd(0, Math.PI * 2),
        sp: rnd(0.12, 0.4),
        amp: rnd(8, 26),
        glow: 0 // послесвечение после разлёта
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


  /* РЕЗКИЙ разлёт: чем ближе к точке клика, тем злее импульс
     (до ~125 px/кадр — через пол-экрана), плюс случайный разброс.
     Дальше пружина собирает обратно к домашним точкам. */
  function burst(bx, by) {
    var diag = Math.sqrt(w * w + h * h) || 1;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var dx = p.x - bx, dy = p.y - by;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var falloff = 1 - Math.min(d / diag, 1) * 0.75;
      var force = rnd(55, 125) * falloff;
      p.vx += (dx / d) * force + rnd(-18, 18);
      p.vy += (dy / d) * force + rnd(-18, 18);
      p.glow = 1; // вспыхивают на время полёта
    }
  }

  // Клики по кнопкам/карточкам/ссылкам/вкладкам — триггер разлёта
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
    var f = dt * 60; // нормировка к 60fps

    ctx.clearRect(0, 0, w, h);

    // паутинка между соседями — тонкая, бледная
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgb(186,215,247)";
    for (var i = 0; i < parts.length; i++) {
      var a = parts[i];
      for (var j = i + 1; j < parts.length; j++) {
        var b = parts[j];
        var ddx = a.x - b.x, ddy = a.y - b.y;
        var d2 = ddx * ddx + ddy * ddy;
        if (d2 < 105 * 105) {
          ctx.globalAlpha = (1 - Math.sqrt(d2) / 105) * 0.08;
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
        var tx = p.hx + Math.cos(t * p.sp + p.ph) * p.amp;
        var ty = p.hy + Math.sin(t * p.sp * 0.8 + p.ph) * p.amp;

        if (p.glow > 0.05) {
          // фаза полёта: слабая пружина (даём улететь), гасим свечение
          p.vx += (tx - p.x) * 0.55 * dt;
          p.vy += (ty - p.y) * 0.55 * dt;
          p.vx *= Math.pow(0.975, f);
          p.vy *= Math.pow(0.975, f);
          p.glow *= Math.pow(0.97, f);
        } else {
          // обычный режим: тихий дрейф у дома
          p.vx += (tx - p.x) * 4.2 * dt;
          p.vy += (ty - p.y) * 4.2 * dt;
          p.vx *= Math.pow(0.87, f);
          p.vy *= Math.pow(0.87, f);
          p.glow = 0;
        }

        // отталкивание от курсора
        var mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        var md2 = mdx * mdx + mdy * mdy;
        if (md2 < mouse.r * mouse.r && md2 > 0.01) {
          var md = Math.sqrt(md2);
          var push = (1 - md / mouse.r) * 9;
          p.vx += (mdx / md) * push * f * 0.1;
          p.vy += (mdy / md) * push * f * 0.1;
        }

        p.x += p.vx * f;
        p.y += p.vy * f;
      }

      var lit = p.glow > 0.05;
      if (lit) { // послесвечение в полёте
        ctx.globalAlpha = 0.16 * p.glow;
        ctx.fillStyle = "rgb(" + p.c[0] + "," + p.c[1] + "," + p.c[2] + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5 * p.glow + p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = Math.min(1, p.a + p.glow * 0.5);
      ctx.fillStyle = "rgb(" + p.c[0] + "," + p.c[1] + "," + p.c[2] + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + p.glow * 0.9), 0, Math.PI * 2);
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

