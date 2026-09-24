/* Мозг-созвездие — по референсу «Эффекты/DESIGN - МОЗГ.md» (Dala):
   тысячи мельчайших треугольных глифов (КОНТУР, 1–2 px) ярких цветов,
   собирающихся в органичную форму мозга; вокруг — редкие «амбиентные»
   частицы. Мозг здесь фон: небольшой, спокойный, живой.

   Ключевое отличие от «на глаз из эллипсов»: силуэт задан настоящим
   анатомическим контуром мозга в профиль (Path2D + кривые Безье) в
   нормированных координатах 0..1; точки берутся случайно, но проходят
   проверку isPointInPath; извилины вырезаются по линиям борозд (sulci),
   поэтому мозг читается как мозг, а не как шар. */
(function () {
  "use strict";

  var PALETTE = ["#8052ff", "#ffb829", "#15846e", "#e05fc4", "#4f8cff", "#ffffff"];
  var WEIGHT = [0.34, 0.18, 0.16, 0.10, 0.14, 0.08];

  /* ---------- Контур мозга в профиль (мозг «смотрит» влево): ----------
     лобная доля — слева, темя — сверху, затылок — справа, мозжечок —
     отдельной массой внизу справа, ствол мозга — узким столбиком внизу,
     височная доля — снизу слева. Пропорция близка к настоящей: 0.875 x 0.70. */
  function brainPath() {
    var p = new Path2D();
    p.moveTo(0.075, 0.399);                                    // лобный полюс
    p.bezierCurveTo(0.055, 0.267, 0.150, 0.179, 0.320, 0.166); // вверх по лобной доле
    p.bezierCurveTo(0.470, 0.155, 0.575, 0.161, 0.660, 0.192); // темя (теменная доля)
    p.bezierCurveTo(0.800, 0.232, 0.925, 0.311, 0.950, 0.434); // затылочный скат
    p.bezierCurveTo(0.962, 0.496, 0.950, 0.535, 0.915, 0.566); // затылочный полюс
    p.bezierCurveTo(0.925, 0.610, 0.930, 0.667, 0.915, 0.707); // правый край мозжечка
    p.bezierCurveTo(0.895, 0.760, 0.830, 0.786, 0.760, 0.775); // низ мозжечка
    p.bezierCurveTo(0.715, 0.766, 0.680, 0.742, 0.660, 0.702); // задний край к стволу
    p.bezierCurveTo(0.662, 0.755, 0.648, 0.812, 0.612, 0.841); // ствол мозга (мост)
    p.bezierCurveTo(0.590, 0.856, 0.560, 0.843, 0.548, 0.808); // продолговатый мозг
    p.bezierCurveTo(0.534, 0.775, 0.490, 0.752, 0.446, 0.739); // под височной долей
    p.bezierCurveTo(0.360, 0.752, 0.290, 0.760, 0.215, 0.712); // низ височной доли
    p.bezierCurveTo(0.168, 0.678, 0.150, 0.652, 0.152, 0.632); // височный полюс
    p.bezierCurveTo(0.140, 0.585, 0.108, 0.478, 0.075, 0.399); // врезка к лобному полюсу
    p.closePath();
    return p;
  }

  /* ---------- Борозды: по ним вырезаются «извилины» ---------- */
  var SULCI = [
    // латеральная (сильвиева) борозда — отделяет височную долю
    [[0.235, 0.583], [0.336, 0.537], [0.452, 0.496], [0.600, 0.464], [0.722, 0.474]],
    // центральная борозда (Роланда)
    [[0.452, 0.238], [0.478, 0.240], [0.496, 0.328], [0.492, 0.430]],
    // прецентральная извилина
    [[0.356, 0.240], [0.372, 0.255], [0.378, 0.387], [0.348, 0.487]],
    // лобные извилины
    [[0.268, 0.245], [0.268, 0.300], [0.248, 0.413], [0.218, 0.507]],
    [[0.166, 0.279], [0.196, 0.371], [0.208, 0.460]],
    // постцентральная извилина
    [[0.540, 0.240], [0.572, 0.259], [0.582, 0.376], [0.556, 0.448]],
    // теменно-затылочная
    [[0.698, 0.240], [0.742, 0.240], [0.720, 0.345], [0.658, 0.413]],
    // затылочные извилины
    [[0.818, 0.240], [0.852, 0.319], [0.828, 0.434]],
    [[0.868, 0.300], [0.880, 0.413], [0.860, 0.507]],
    // верхняя и нижняя височные извилины
    [[0.300, 0.638], [0.420, 0.583], [0.560, 0.565], [0.680, 0.586]],
    [[0.276, 0.696], [0.398, 0.655], [0.528, 0.641], [0.620, 0.667]],
    // листки мозжечка
    [[0.716, 0.572], [0.680, 0.682]],
    [[0.792, 0.551], [0.744, 0.676]]
  ];

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len = vx * vx + vy * vy;
    var t = len ? (wx * vx + wy * vy) / len : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var dx = px - (ax + vx * t), dy = py - (ay + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function distToSulci(px, py) {
    var best = 9;
    for (var i = 0; i < SULCI.length; i++) {
      var line = SULCI[i];
      for (var j = 0; j < line.length - 1; j++) {
        var d = segDist(px, py, line[j][0], line[j][1], line[j + 1][0], line[j + 1][1]);
        if (d < best) best = d;
      }
    }
    return best;
  }

  function pickColor() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < WEIGHT.length; i++) {
      acc += WEIGHT[i];
      if (r <= acc) return PALETTE[i];
    }
    return PALETTE[0];
  }

  /* ---------- Точки мозга: внутри контура, вне борозд ---------- */
  function makeBrainPoints(path, probe, scale, cx, cy, w, h, count) {
    var pts = [];
    var tries = 0, maxTries = count * 60;
    var GAP = 0.0095; // «толщина» борозды в нормированных единицах
    while (pts.length < count && tries < maxTries) {
      tries++;
      var nx = 0.02 + Math.random() * 0.96, ny = 0.02 + Math.random() * 0.96;
      if (!probe.isPointInPath(path, nx, ny)) continue;
      if (distToSulci(nx, ny) < GAP) continue;

      var x = (nx - 0.5) * scale, y = (ny - 0.5) * scale;
      var mang = Math.random() * Math.PI * 2;
      var mrad = scale * 0.44 * Math.sqrt(Math.random());
      pts.push({
        hx: cx + x, hy: cy + y,
        mx: cx + Math.cos(mang) * mrad,
        my: cy + Math.sin(mang) * mrad,
        ax: cx + x + (Math.random() * 2 - 1) * w * 0.7,
        ay: cy + y + (Math.random() * 2 - 1) * h * 0.7,
        x: 0, y: 0, vx: 0, vy: 0,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * 5,
        size: 1.0 + Math.random() * 1.1,
        alpha: 0.38 + Math.random() * 0.5,
        color: pickColor(),
        phase: Math.random() * Math.PI * 2,
        delay: Math.random() * 1100,
        amb: false
      });
    }
    return pts;
  }

  /* ---------- Фоновая нейросеть: узлы по всему экрану ---------- */
  function makeAmbient(probe, path, scale, cx, cy, w, h, count) {
    var pts = [], tries = 0;
    while (pts.length < count && tries < count * 80) {
      tries++;
      var x = Math.random() * w, y = Math.random() * h;
      var nx = (x - cx) / scale + 0.5, ny = (y - cy) / scale + 0.5;
      var inBrain = probe.isPointInPath(path, nx, ny);
      // Частицы есть и вокруг, и внутри мозга: форма возникает из общей материи,
      // но внутри силуэта их плотность и яркость выше.
      var depth = inBrain ? 0.7 : 0.28;
      pts.push({
        hx: x, hy: y, mx: x, my: y, ax: x, ay: y, x: x, y: y, vx: 0, vy: 0,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * 2,
        size: (inBrain ? 1.0 : 0.72) + Math.random() * (inBrain ? 1.25 : 0.8),
        alpha: (inBrain ? 0.34 : 0.10) + Math.random() * (inBrain ? 0.45 : 0.22),
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        phase: Math.random() * Math.PI * 2,
        depth: depth,
        amb: true
      });
    }
    return pts;
  }

  function init(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var probe = document.createElement("canvas").getContext("2d");
    var path = brainPath();

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var w = 0, h = 0, scale = 1, cx = 0, cy = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [], scaledPath = null, scaledSulci = [];
    var mouse = { x: -9999, y: -9999 };
    var t0 = performance.now();
    var assembled = false; // мозг собран (повторный прилёт при ресайзе не нужен)

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Мозг — фон, а не заливка: фигура соразмерна экрану, но не «на весь кадр»
      scale = Math.min(w * 0.255, h * 0.44);
      cx = w * 0.5;
      cy = Math.max(h * 0.27, scale * 0.66);

      var area = w * h;
      var brainCount = Math.round(Math.min(1800, Math.max(760, area / 900)));
      var ambCount = Math.round(Math.min(900, Math.max(260, area / 2400)));

      particles = makeBrainPoints(path, probe, scale, cx, cy, w, h, brainCount)
        .concat(makeAmbient(probe, path, scale, cx, cy, w, h, ambCount));

      particles.forEach(function (p) {
        if (reduce || assembled || p.amb) { p.x = p.hx; p.y = p.hy; }
        else { p.x = p.ax; p.y = p.ay; }
      });

      // Тот же контур в экранных координатах — для мягкой подсветки силуэта
      scaledPath = new Path2D();
      var m = new DOMMatrix()
        .translateSelf(cx, cy)
        .scaleSelf(scale, scale)
        .translateSelf(-0.5, -0.5);
      scaledPath.addPath(path, m);

      // Извилины в экранных координатах — еле заметные линии борозд,
      // они и делают силуэт узнаваемым мозгом
      function sx(nx) { return cx + (nx - 0.5) * scale; }
      function sy(ny) { return cy + (ny - 0.5) * scale; }
      scaledSulci = SULCI.map(function (line) {
        var sp = new Path2D();
        line.forEach(function (pt, i) {
          if (i === 0) sp.moveTo(sx(pt[0]), sy(pt[1]));
          else sp.lineTo(sx(pt[0]), sy(pt[1]));
        });
        return sp;
      });

      // ВАЖНО: смена canvas.width очищает холст, поэтому без анимации
      // (reduce) сразу рисуем статичный кадр — иначе мозг исчезает.
      if (reduce && w && h) draw(performance.now());
    }

    window.addEventListener("resize", resize);
    if (!reduce) {
      window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
      window.addEventListener("pointerleave", function () { mouse.x = -9999; mouse.y = -9999; });
    }

    function triangle(p) {
      var c = Math.cos(p.rot), s = Math.sin(p.rot);
      var a = p.size, b = p.size * 0.87, d = p.size * 0.5;
      // вершины (0,-a), (b,d), (-b,d) с поворотом
      ctx.beginPath();
      ctx.moveTo(p.x + a * s, p.y - a * c);
      ctx.lineTo(p.x + (b * c - d * s), p.y + (b * s + d * c));
      ctx.lineTo(p.x - (b * c + d * s), p.y - (b * s - d * c));
      ctx.closePath();
      ctx.stroke();
    }

    function drawConnections(now) {
      // Dala: поле — это не просто точки, а живая нейросеть.
      // Рисуем только короткие связи, поэтому полноэкранный слой остаётся лёгким.
      ctx.lineWidth = 0.65;
      for (var i = 0; i < particles.length; i++) {
        var a = particles[i];
        if (!a.amb) continue;
        for (var j = i + 1; j < particles.length; j++) {
          var b = particles[j];
          if (!b.amb) continue;
          var dx = a.x - b.x, dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > 10800) continue; // не соединяем весь экран в паутину
          var d = Math.sqrt(d2);
          var strength = (1 - d / 104) * 0.18;
          var pulse = 0.72 + Math.sin(now / 900 + a.phase + b.phase) * 0.28;
          ctx.globalAlpha = strength * pulse;
          ctx.strokeStyle = a.color;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);

      var drift = now / 1000;
      // Морфинг: мозг ⇄ сфера — медленный цикл, в точке перехода частицы разлетаются
      var morph = Math.sin(drift * 0.32) * 0.5 + 0.5;
      morph = morph * morph * (3 - 2 * morph);
      var scatter = Math.sin(morph * Math.PI);

      // Мягкая подсветка силуэта — чтобы мозг «проявлялся» на чёрном
      var glow = ctx.createRadialGradient(cx - scale * 0.22, cy - scale * 0.26, scale * 0.08, cx, cy, scale * 1.05);
      glow.addColorStop(0, "rgba(128, 82, 255, 0.11)");
      glow.addColorStop(0.55, "rgba(21, 132, 110, 0.05)");
      glow.addColorStop(1, "rgba(128, 82, 255, 0)");
      ctx.fillStyle = glow;
      ctx.globalAlpha = 1 - morph * 0.85;
      if (scaledPath) ctx.fill(scaledPath);

      // Еле заметный контур силуэта и линии борозд — «анатомия» мозга
      if (scaledPath) {
        ctx.strokeStyle = "rgba(186, 215, 247, 0.11)";
        ctx.lineWidth = 1.1;
        ctx.stroke(scaledPath);
        ctx.strokeStyle = "rgba(186, 215, 247, 0.055)";
        ctx.lineWidth = 0.9;
        for (var s = 0; s < scaledSulci.length; s++) ctx.stroke(scaledSulci[s]);
      }
      ctx.globalAlpha = 1;

      var assembling = !reduce && !assembled && now - t0 < 3400;
      if (!reduce && !assembling) assembled = true; // сбор закончен — при ресайзе заново не «прилетаем»
      drawConnections(now);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        if (assembling && !p.amb) {
          var k = Math.min(1, Math.max(0, (now - t0 - p.delay) / 2000));
          k = 1 - Math.pow(1 - k, 3); // ease-out cubic
          p.x = p.ax + (p.hx - p.ax) * k;
          p.y = p.ay + (p.hy - p.ay) * k;
          p.rot += p.spin * (1 - k) * 0.012;
        } else {
          // Дыхание мозга + очень медленное «плавание» всей фигуры
          var breathe = Math.sin(drift * 0.45 + p.phase) * 1.1;
          var sway = Math.sin(drift * 0.16) * 3.2;
          var swayY = Math.cos(drift * 0.13) * 2.4;
          var tx = p.hx + breathe + sway * (p.amb ? 2.4 : 1);
          var ty = p.hy + breathe * 0.55 + swayY * (p.amb ? 2.4 : 1);
          if (!p.amb) {
            // Морфинг в сферу и разлёт в момент перехода между формами
            tx += (p.mx - p.hx) * morph + (p.hx - cx) * scatter * 0.3;
            ty += (p.my - p.hy) * morph + (p.hy - cy) * scatter * 0.3;
          }
          var sp = 0.012;

          if (!p.amb) {
            // Курсор мягко раздвигает частицы, затем они возвращаются на место
            var dx = p.x - mouse.x, dy = p.y - mouse.y;
            var d2 = dx * dx + dy * dy;
            if (d2 < 16000 && d2 > 1) {
              var f = ((16000 - d2) / 16000) * 0.9;
              var inv = 1 / Math.sqrt(d2);
              p.vx += dx * inv * f;
              p.vy += dy * inv * f;
            }
            sp = 0.026;
          }

          p.vx += (tx - p.x) * sp;
          p.vy += (ty - p.y) * sp;
          p.vx *= 0.9; p.vy *= 0.9;
          p.x += p.vx; p.y += p.vy;
          p.rot += p.spin * (0.0018 + scatter * 0.012);
        }

        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.amb ? 0.7 : 0.9;
        triangle(p);
      }

      ctx.globalAlpha = 1;
      if (!reduce) requestAnimationFrame(draw);
    }

    resize();
    if (reduce) draw(performance.now());
    else requestAnimationFrame(draw);
  }

  document.querySelectorAll("canvas[data-brain]").forEach(init);
})();
