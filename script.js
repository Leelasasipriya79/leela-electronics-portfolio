(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var C = {};
  function cssv(n){ return getComputedStyle(root).getPropertyValue(n).trim(); }
  function readColors(){ C = { line: cssv('--line') || '#216453', signal: cssv('--signal') || '#6FF0C4', copper: cssv('--copper') || '#E39A58' }; }
  readColors();

  /* ---------- preloader ---------- */
  (function(){
    var pre = document.getElementById('pre');
    if(!pre) return;
    var bar = document.getElementById('pre-bar'), v = document.getElementById('pre-v'), pc = document.getElementById('pre-p');
    var dur = reduce ? 500 : 2800, t0 = performance.now();
    function finish(){
      pre.classList.add('lit');
      setTimeout(function(){
        pre.classList.add('done');
        root.classList.add('ready');
        setTimeout(function(){ if(pre.parentNode) pre.parentNode.removeChild(pre); }, 800);
      }, reduce ? 120 : 500);
    }
    function step(now){
      var p = Math.min(1, (now - t0) / dur);
      bar.style.transform = 'scaleX(' + p + ')';
      v.textContent = (p * 5).toFixed(2) + ' V';
      pc.textContent = Math.round(p * 100) + '%';
      if(p > 0.8) pre.classList.add('lit');
      if(p < 1) requestAnimationFrame(step); else finish();
    }
    requestAnimationFrame(step);
  })();

  /* ---------- PCB background ---------- */
  (function(){
    var cv = document.getElementById('bg'); if(!cv) return;
    var ctx = cv.getContext('2d');
    var W, H, dpr, off, traces = [], pulses = [], last = performance.now();
    var G = 26;
    var dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    function ri(a,b){ return a + Math.floor(Math.random() * (b - a + 1)); }

    function build(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
      var ox = off.getContext('2d'); ox.setTransform(dpr,0,0,dpr,0,0);
      traces = []; pulses = [];
      var n = Math.min(64, Math.round(W * H / 17000));
      for(var i = 0; i < n; i++){
        var x = ri(0, Math.floor(W / G)) * G, y = ri(0, Math.floor(H / G)) * G, d = ri(0, 7);
        var pts = [[x,y]], segs = ri(4, 9), cum = [0], total = 0;
        for(var s = 0; s < segs; s++){
          var len = ri(2, 7) * G;
          var nx = x + dirs[d][0] * len, ny = y + dirs[d][1] * len;
          total += Math.hypot(nx - x, ny - y);
          x = nx; y = ny; pts.push([x,y]); cum.push(total);
          d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;
        }
        traces.push({pts: pts, cum: cum, total: total});
      }
      ox.lineJoin = 'round'; ox.lineCap = 'round';
      traces.forEach(function(t){
        ox.globalAlpha = 0.5; ox.strokeStyle = C.line; ox.lineWidth = 1.6;
        ox.beginPath(); t.pts.forEach(function(p, k){ k ? ox.lineTo(p[0], p[1]) : ox.moveTo(p[0], p[1]); }); ox.stroke();
        var ends = [t.pts[0], t.pts[t.pts.length - 1]];
        ends.forEach(function(p){
          ox.globalAlpha = 0.65; ox.lineWidth = 1.6;
          ox.beginPath(); ox.arc(p[0], p[1], 4.2, 0, 6.2832); ox.stroke();
          ox.beginPath(); ox.arc(p[0], p[1], 1.3, 0, 6.2832); ox.fillStyle = C.line; ox.fill();
        });
      });
      ox.globalAlpha = 1;
      if(!reduce){
        var pn = Math.max(4, Math.round(traces.length * 0.45));
        for(var k = 0; k < pn; k++) pulses.push(newPulse());
      }
    }
    function newPulse(){
      var t = traces[ri(0, traces.length - 1)];
      return { t: t, p: -Math.random() * 200, v: 90 + Math.random() * 110 };
    }
    function at(t, d){
      if(d <= 0) return t.pts[0];
      for(var i = 1; i < t.cum.length; i++){
        if(d <= t.cum[i]){
          var f = (d - t.cum[i-1]) / (t.cum[i] - t.cum[i-1]);
          return [t.pts[i-1][0] + (t.pts[i][0] - t.pts[i-1][0]) * f, t.pts[i-1][1] + (t.pts[i][1] - t.pts[i-1][1]) * f];
        }
      }
      return t.pts[t.pts.length - 1];
    }
    function draw(now){
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      ctx.drawImage(off, 0, 0);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.fillStyle = C.signal;
      for(var i = 0; i < pulses.length; i++){
        var u = pulses[i]; u.p += u.v * dt;
        if(u.p > u.t.total + 40){ pulses[i] = newPulse(); continue; }
        for(var k = 0; k < 7; k++){
          var q = at(u.t, Math.min(u.p, u.t.total) - k * 7);
          if(u.p - k * 7 < 0) continue;
          ctx.globalAlpha = (1 - k / 7) * 0.9;
          ctx.beginPath(); ctx.arc(q[0], q[1], 3 - k * 0.3, 0, 6.2832); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if(!reduce) requestAnimationFrame(draw);
    }
    function start(){ build(); if(reduce){ draw(performance.now()); } }
    var rt;
    window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ build(); if(reduce) draw(performance.now()); }, 200); });
    function recolor(){ readColors(); build(); if(reduce) draw(performance.now()); }
    try{ window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', recolor); }catch(e){}
    try{ new MutationObserver(recolor).observe(root, {attributes:true, attributeFilter:['data-theme']}); }catch(e){}
    start();
    if(!reduce) requestAnimationFrame(draw);
  })();

  /* ---------- oscilloscope ---------- */
  (function(){
    var cv = document.getElementById('scope'); if(!cv) return;
    var cx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, phase = 0, wave = 'sine', cyc = 3, amp = 2.4, visible = true, last = performance.now();
    var fn = {
      sine: function(x){ return Math.sin(x); },
      square: function(x){ return Math.max(-1, Math.min(1, Math.sin(x) * 7)); },
      tri: function(x){ return (2 / Math.PI) * Math.asin(Math.sin(x)); }
    };
    function size(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    function draw(){
      if(!w) return;
      cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,w,h);
      var dx = w / 10, dy = h / 8, i, j;
      cx.lineWidth = 1; cx.strokeStyle = 'rgba(111,240,196,.14)'; cx.beginPath();
      for(i = 1; i < 10; i++){ cx.moveTo(i * dx, 0); cx.lineTo(i * dx, h); }
      for(j = 1; j < 8; j++){ cx.moveTo(0, j * dy); cx.lineTo(w, j * dy); }
      cx.stroke();
      cx.strokeStyle = 'rgba(111,240,196,.34)'; cx.beginPath();
      cx.moveTo(w / 2, 0); cx.lineTo(w / 2, h); cx.moveTo(0, h / 2); cx.lineTo(w, h / 2);
      for(i = 0; i <= 50; i++){ var tx = i * dx / 5; cx.moveTo(tx, h / 2 - 4); cx.lineTo(tx, h / 2 + 4); }
      for(j = 0; j <= 40; j++){ var ty = j * dy / 5; cx.moveTo(w / 2 - 4, ty); cx.lineTo(w / 2 + 4, ty); }
      cx.stroke();
      var mid = h / 2, A = amp * dy, f = fn[wave];
      cx.beginPath();
      for(var px = 0; px <= w; px += 2){
        var t = (px / w) * cyc * 6.2832 + phase;
        var y = mid - f(t) * A + (reduce ? 0 : (Math.random() - 0.5) * 0.8);
        if(px) cx.lineTo(px, y); else cx.moveTo(px, y);
      }
      cx.lineJoin = 'round'; cx.lineCap = 'round';
      cx.strokeStyle = 'rgba(111,240,196,.2)'; cx.lineWidth = 8; cx.stroke();
      cx.shadowColor = '#6FF0C4'; cx.shadowBlur = 10;
      cx.strokeStyle = '#6FF0C4'; cx.lineWidth = 2; cx.stroke();
      cx.shadowBlur = 0;
    }
    function loop(now){
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if(visible){ phase -= dt * 2.2; draw(); }
      requestAnimationFrame(loop);
    }
    function readouts(){
      document.getElementById('ro-f').textContent = (cyc * 0.2).toFixed(1) + ' kHz';
      document.getElementById('ro-v').textContent = (amp * 2).toFixed(1) + ' V';
    }
    var btns = document.querySelectorAll('.waves button');
    btns.forEach(function(b){
      b.addEventListener('click', function(){
        wave = b.dataset.w;
        btns.forEach(function(o){ o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        if(reduce) draw();
      });
    });
    document.getElementById('in-f').addEventListener('input', function(e){ cyc = parseFloat(e.target.value); readouts(); if(reduce) draw(); });
    document.getElementById('in-a').addEventListener('input', function(e){ amp = parseFloat(e.target.value); readouts(); if(reduce) draw(); });
    try{ new ResizeObserver(function(){ size(); draw(); }).observe(cv); }catch(e){ window.addEventListener('resize', function(){ size(); draw(); }); }
    try{ new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(cv); }catch(e){}
    size(); readouts(); draw();
    if(!reduce) requestAnimationFrame(loop);
  })();

  /* ---------- reveal, counters, gauge ---------- */
  var gaugeDone = false;
  function countUp(el){
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    if(reduce){ el.textContent = target.toFixed(dec); return; }
    var t0 = performance.now(), dur = 1500;
    (function tick(now){
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(dec);
      if(p < 1) requestAnimationFrame(tick); else el.textContent = target.toFixed(dec);
    })(t0);
  }
  var needle = document.getElementById('g-needle'), gfill = document.getElementById('g-fill');
  (function ticks(){
    var g = document.getElementById('g-ticks'); if(!g) return;
    var ns = 'http://www.w3.org/2000/svg';
    for(var i = 0; i <= 10; i++){
      var a = (-90 + i * 18) * Math.PI / 180, major = i % 5 === 0;
      var r1 = 100 + 10, r2 = major ? 120 : 116;
      var ln = document.createElementNS(ns, 'line');
      ln.setAttribute('class', 'g-tick');
      ln.setAttribute('x1', 120 + r1 * Math.sin(a)); ln.setAttribute('y1', 130 - r1 * Math.cos(a));
      ln.setAttribute('x2', 120 + r2 * Math.sin(a)); ln.setAttribute('y2', 130 - r2 * Math.cos(a));
      g.appendChild(ln);
      if(major){
        var tx = document.createElementNS(ns, 'text');
        tx.setAttribute('x', 120 + 86 * Math.sin(a)); tx.setAttribute('y', 130 - 86 * Math.cos(a) + 4);
        tx.textContent = i; g.appendChild(tx);
      }
    }
    needle.setAttribute('transform', 'rotate(-90 120 130)');
  })();
  function setGauge(v){
    needle.setAttribute('transform', 'rotate(' + (-90 + v * 18) + ' 120 130)');
    gfill.style.strokeDasharray = Math.max(0, v * 10) + ' 100';
  }
  function runGauge(){
    if(gaugeDone) return; gaugeDone = true;
    var target = 8.22;
    if(reduce){ setGauge(target); return; }
    var t0 = performance.now(), dur = 2000;
    (function tick(now){
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.exp(-6 * p) * Math.cos(10 * p);
      setGauge(target * (p < 1 ? e : 1));
      if(p < 1) requestAnimationFrame(tick); else setGauge(target);
    })(t0);
  }
  var gaugeEl = document.getElementById('gauge');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(e.target);
      });
    }, {threshold: 0.18, rootMargin: '0px 0px -6% 0px'});
    document.querySelectorAll('[data-rv]').forEach(function(el){ io.observe(el); });
    if(gaugeEl){
      new IntersectionObserver(function(es, ob){
        if(es[0].isIntersecting){ runGauge(); ob.disconnect(); }
      }, {threshold: 0.5}).observe(gaugeEl);
    }
  } else {
    document.querySelectorAll('[data-rv]').forEach(function(el){ el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(countUp); });
    runGauge();
  }

  /* ---------- nav ---------- */
  var menu = document.getElementById('menu'), links = document.getElementById('links');
  menu.addEventListener('click', function(){
    var open = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', function(e){
    if(e.target.tagName === 'A'){ links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  });
  var prog = document.getElementById('prog'), ticking = false;
  function onScroll(){
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    prog.style.transform = 'scaleX(' + p + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive: true});
  onScroll();
})();
