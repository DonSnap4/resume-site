/* Мозг из осколков — эффект по мотивам Эффекты/DESIGN - МОЗГ.md:
   тысячи мельчайших треугольных глифов, собирающихся в форму мозга.
   Осколки (треугольники) прилетают со всех сторон и складываются в мозг;
   курсор слегка раздвигает частицы, они возвращаются на место. */
(function () {
  "use strict";

  var PALETTE = ["#8052ff", "#ffb829", "#15846e", "#e05fc4", "#4f8cff", "#ffffff"];

  function makeBrainPoints(w, h, count) {
    // Мозг в профиль: два «полушария» (эллипс + волны извилин), мозжечок, ствол.
    var pts = [];
    var cx = w * 0.5, cy = h * 0.42;
    // Размер мозга держим умеренным: он фон, а не заливка экрана
    var scale = Math.min(w * 0.17, h * 0.30);
    var tries = 0;
    while (pts.length < count && tries < count * 40) {
      tries++;
      // Случайная точка в ограничивающем прямоугольнике мозга
      var x = (Math.random() * 2 - 1) * scale * 1.10;
      var y = (Math.random() * 2 - 1) * scale * 0.95;
      var nx = x / scale, ny = y / scale;
      var ok = false;

      // Силуэт мозга в профиль: полушарие, лобная и теменная доли,
      // височная доля, мозжечок и ствол — как на анатомической схеме.
      var mx = nx * 0.92, my = ny * 0.92;
      function ell(cx2, cy2, rx, ry) {
        var ex = (mx - cx2) / rx, ey = (my - cy2) / ry;
        return ex * ex + ey * ey <= 1;
      }
      var cerebrum = Math.pow(Math.abs(mx + 0.12) / 0.88, 4) + Math.pow(Math.abs(my + 0.02) / 0.62, 4) <= 1;
      var frontal = ell(-0.70, -0.14, 0.42, 0.42);
      var temporal = ell(-0.42, 0.42, 0.34, 0.28);
      var occipital = ell(0.50, 0.02, 0.44, 0.50);
      var cerebellum = ell(0.62, 0.46, 0.30, 0.24);
      var stem = mx > 0.26 && mx < 0.46 && my > 0.50 && my < 0.95;
      var gyri = Math.sin(mx * 7 + my * 3) + Math.cos(my * 8 - mx * 2);
      var ok = cerebrum || frontal || temporal || occipital || cerebellum || stem;
      if (ok && gyri < -1.6) ok = false;
      if (ok) {
        pts.push({
          hx: cx + x, hy: cy + y,
          // Стартовая позиция осколка — издалека, «прилетает» в мозг
          ax: cx + x + (Math.random() * 2 - 1) * w * 0.65,
          ay: cy + y + (Math.random() * 2 - 1) * h * 0.65,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() * 2 - 1) * 6,
          size: 1.4 + Math.random() * 2.6,
          color: PALETTE[(Math.random() * PALETTE.length) | 0],
          delay: Math.random() * 900,
          x: 0, y: 0, vx: 0, vy: 0
        });
        // старт сразу снаружи
        var p = pts[pts.length - 1];
        p.x = p.ax; p.y = p.ay;
      }
    }
    return pts;
  }

  function init(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var mouse = { x: -9999, y: -9999 };
    var t0 = performance.now();
    var COUNT = 1100;

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = makeBrainPoints(w, h, COUNT);
      if (reduce) {
        particles.forEach(function (p) { p.x = p.hx; p.y = p.hy; });
      }
    }

    window.addEventListener("resize", resize);
    if (!reduce) {
      window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      var assembling = now - t0 < 2600 && !reduce;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (assembling) {
          // Плавный сбор в мозг с задержкой по частицам
          var k = Math.min(1, Math.max(0, (now - t0 - p.delay) / 1400));
          k = 1 - Math.pow(1 - k, 3); // ease-out cubic
          p.x = p.ax + (p.hx - p.ax) * k;
          p.y = p.ay + (p.hy - p.ay) * k;
          p.rot = p.rot + p.spin * (1 - k) * 0.02;
        } else {
          // Живое дыхание мозга
          var breath = Math.sin(now / 1400 + i) * 0.6;
          var tx = p.hx + breath, ty = p.hy + breath * 0.6;
          // Отталкивание курсором + пружина возврата (осколки)
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 12000 && d2 > 1) {
            var f = (12000 - d2) / 12000 * 1.2;
            p.vx += (dx / Math.sqrt(d2)) * f;
            p.vy += (dy / Math.sqrt(d2)) * f;
          }
          p.vx += (tx - p.x) * 0.02;
          p.vy += (ty - p.y) * 0.02;
          p.vx *= 0.9; p.vy *= 0.9;
          p.x += p.vx; p.y += p.vy;
          p.rot += (Math.random() - 0.5) * 0.05;
        }
        // Треугольный осколок
        var s = p.size;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, s * 0.7);
        ctx.lineTo(-s * 0.8, s * 0.7);
        ctx.closePath();
        // Мягкая заливка делает силуэт мозга читаемым, контур даёт «стеклянность»
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    resize();
    requestAnimationFrame(draw);
  }

  document.querySelectorAll("canvas[data-brain]").forEach(init);
})();
