/* Desktop interaction layer: spyglass (rendered once), neon portal, per-word hover, WebAudio sounds.
   Every feature is optional: if WebGL, audio or storage is missing the page keeps working. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var desktop = matchMedia('(min-width:821px) and (hover:hover) and (pointer:fine)').matches;
  if (!desktop) return;
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var conn = navigator.connection || {};
  var liteGpu = !!conn.saveData || (navigator.deviceMemory || 8) <= 2;

  /* ---------- preferences ---------- */
  var prefs = { scope: true, portal: true, sound: true };
  try { var saved = JSON.parse(localStorage.getItem('fx-prefs') || '{}'); Object.keys(prefs).forEach(function (k) { if (typeof saved[k] === 'boolean') prefs[k] = saved[k]; }); } catch (e) {}
  function savePrefs() { try { localStorage.setItem('fx-prefs', JSON.stringify(prefs)); } catch (e) {} }

  /* ---------- sound (Web Audio, unlocked by the first user gesture) ---------- */
  var audio = (function () {
    var ctx = null, master = null, unlocked = false, lastHover = 0;
    function ensure() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination); } catch (e) { ctx = null; }
      return ctx;
    }
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      ['pointerdown', 'keydown'].forEach(function (t) { removeEventListener(t, unlock, true); });
      var c = ensure(); if (c && c.state === 'suspended') c.resume().catch(function () {});
    }
    ['pointerdown', 'keydown'].forEach(function (t) { addEventListener(t, unlock, true); });
    function tone(freqs, dur, type, vol, at) {
      var c = ctx; if (!c || c.state !== 'running') return;
      var t0 = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freqs[0], t0);
      if (freqs[1]) o.frequency.exponentialRampToValueAtTime(freqs[1], t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function play(name) {
      if (!prefs.sound || !unlocked || !ensure()) return;
      switch (name) {
        case 'scopeOn': tone([523], 0.16, 'sine', 0.05); tone([659], 0.16, 'sine', 0.05, 0.07); tone([784], 0.24, 'sine', 0.05, 0.14); break;
        case 'scopeOff': tone([784], 0.16, 'sine', 0.045); tone([587], 0.16, 'sine', 0.045, 0.07); tone([440], 0.24, 'sine', 0.045, 0.14); break;
        case 'portalOn': tone([1200, 2400], 0.28, 'triangle', 0.03); tone([1800, 3000], 0.22, 'sine', 0.02, 0.06); break;
        case 'portalOff': tone([320, 190], 0.28, 'triangle', 0.04); break;
        case 'soundOn': tone([660], 0.1, 'sine', 0.04); break;
        case 'click': tone([660, 880], 0.09, 'sine', 0.035); break;
        case 'tick': var n = performance.now(); if (n - lastHover < 70) return; lastHover = n; tone([3400, 3800], 0.025, 'sine', 0.012); break;
      }
    }
    return { play: play };
  })();

  /* ---------- precise per-word hover: wrap text nodes in .w spans ---------- */
  var WORD_SCOPE = 'h1,h2,h3,h4,p,summary,.eyebrow,.tag,nav a,.big,.btn,label,.meta,footer,.chips i,small';
  function wrapWords() {
    var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest('script,style,textarea,select,option,.w,#fx-scope,#fx-portal,#lt')) return NodeFilter.FILTER_REJECT;
        return p.closest(WORD_SCOPE) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var frag = doc.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
        var s = doc.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- amber cursor: precise dot + lagging ring, active only with the telescope on ---------- */
  var portal = (function () {
    var el = doc.createElement('div'); el.id = 'fx-portal'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="fxc-ring"></div><div class="fxc-dot"></div>';
    doc.body.appendChild(el);
    var ring = el.firstChild, dot = el.lastChild, hotSel = 'a,button,summary,.card,input,select,textarea,label';
    var tx = -200, ty = -200, rx = -200, ry = -200, raf = 0, on = false;
    function draw() {
      raf = 0;
      var k = reduce ? 1 : 0.2;
      rx += (tx - rx) * k; ry += (ty - ry) * k;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      if (Math.abs(tx - rx) > 0.3 || Math.abs(ty - ry) > 0.3) raf = requestAnimationFrame(draw);
    }
    function move(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!root.classList.contains('fx-seen')) { rx = tx; ry = ty; root.classList.add('fx-seen'); }
      if (!on) return;
      el.classList.toggle('hot', !!(e.target.closest && e.target.closest(hotSel)));
      if (!raf) raf = requestAnimationFrame(draw);
    }
    addEventListener('pointermove', move, { passive: true });
    doc.addEventListener('pointerleave', function () { root.classList.remove('fx-seen'); });
    doc.addEventListener('pointerenter', function () { root.classList.add('fx-seen'); });
    return {
      /* on = Portal toggle AND telescope toggle */
      set: function (v) { on = v; root.classList.toggle('fx-portal-on', v); if (!v && raf) { cancelAnimationFrame(raf); raf = 0; } else if (v && !raf) raf = requestAnimationFrame(draw); }
    };
  })();

  /* ---------- UI: spyglass container + controls ---------- */
  var scope = doc.createElement('aside');
  scope.id = 'fx-scope';
  scope.setAttribute('aria-label', 'Telescope and effects');
  scope.innerHTML =
    '<div class="fx-view"><div class="fx-rig"><canvas id="fx-canvas" width="380" height="340" aria-hidden="true"></canvas></div>' +
    '<div class="fx-beam" aria-hidden="true"><div class="fx-flare"></div><div class="fx-cone"></div><div class="fx-lens"></div></div><p class="fx-cap" aria-live="polite">Hover a project to peek</p></div>' +
    '<div class="fx-ctl" role="group" aria-label="Interaction effects">' +
    '<button type="button" class="fx-b" data-k="scope" aria-pressed="true"><i></i><span>Telescope on</span></button>' +
    '<button type="button" class="fx-b" data-k="portal" aria-pressed="true"><i></i><span>Portal on</span></button>' +
    '<button type="button" class="fx-b" data-k="sound" aria-pressed="true"><i></i><span>Sound on</span></button></div>';
  doc.body.appendChild(scope);
  root.classList.add('fx-on');
  var lensEl = scope.querySelector('.fx-lens'), beamEl = scope.querySelector('.fx-beam'), capEl = scope.querySelector('.fx-cap');
  var LABEL = { scope: 'Telescope', portal: 'Portal', sound: 'Sound' };

  function applyPref(k, announce) {
    var on = prefs[k], b = scope.querySelector('[data-k="' + k + '"]');
    b.setAttribute('aria-pressed', String(on));
    b.lastChild.textContent = LABEL[k] + (on ? ' on' : ' off');
    if (k === 'scope') { scope.setAttribute('data-scope', on ? 'on' : 'off'); if (!on) preview.hide(); }
    if (k !== 'sound') { portal.set(prefs.portal && prefs.scope); scope.querySelector('[data-k="portal"]').classList.toggle('dim', !prefs.scope); }
    if (announce) audio.play(k === 'scope' ? (on ? 'scopeOn' : 'scopeOff') : k === 'portal' ? (on ? 'portalOn' : 'portalOff') : (on ? 'soundOn' : ''));
  }
  scope.querySelector('.fx-ctl').addEventListener('click', function (e) {
    var b = e.target.closest('.fx-b'); if (!b) return;
    var k = b.getAttribute('data-k');
    prefs[k] = !prefs[k]; savePrefs(); applyPref(k, true);
  });

  /* ---------- spyglass: real GLB asset, rendered once ---------- */
  function parseGLB(buf) {
    var dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
    var jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
    return { json: json, bin: 20 + jl + 8 };
  }
  function buildModel(THREE, glb, buf) {
    var j = glb.json, group = new THREE.Group();
    var mats = j.materials.map(function (m) {
      var p = m.pbrMetallicRoughness, c = p.baseColorFactor, e = m.emissiveFactor || [0, 0, 0];
      return new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(c[0], c[1], c[2]), emissive: new THREE.Color().setRGB(e[0], e[1], e[2]), roughness: p.roughnessFactor, metalness: p.metallicFactor });
    });
    function attr(i) {
      var a = j.accessors[i], v = j.bufferViews[a.bufferView];
      return new THREE.BufferAttribute(new Float32Array(buf, glb.bin + (v.byteOffset || 0) + (a.byteOffset || 0), a.count * 3), 3);
    }
    j.meshes[0].primitives.forEach(function (pr) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', attr(pr.attributes.POSITION)); g.setAttribute('normal', attr(pr.attributes.NORMAL));
      group.add(new THREE.Mesh(g, mats[pr.material]));
    });
    return group;
  }
  var telescope = { renderer: null, render: null };
  function initTelescope() {
    if (liteGpu || !window.__loadThree) return;
    window.__loadThree(function () {
      var THREE = window.THREE, cv = scope.querySelector('#fx-canvas'), ren;
      if (!THREE) return;
      try { ren = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); } catch (e) { cv.style.display = 'none'; return; }
      fetch('assets/models/spyglass.glb').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(function (buf) {
        var model = buildModel(THREE, parseGLB(buf), buf);
        /* fixed pose, set once: lens toward the lower left, never animated */
        var pivot = new THREE.Group(); pivot.add(model); pivot.rotation.order = 'YXZ'; pivot.rotation.set(0.42, -1.12, 0.3);
        var box = new THREE.Box3().setFromObject(pivot), ctr = box.getCenter(new THREE.Vector3());
        model.position.sub(ctr.clone().applyQuaternion(pivot.quaternion.clone().invert()));
        var sc = new THREE.Scene(); sc.add(pivot);
        sc.add(new THREE.HemisphereLight(0x9ff4ff, 0xff7aa8, 0.85));
        var key = new THREE.DirectionalLight(0xfff2cf, 1.9); key.position.set(-3, 4, 5); sc.add(key);
        var rim = new THREE.DirectionalLight(0x9a6bff, 1.3); rim.position.set(4, 1, -3); sc.add(rim);
        var cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
        var radius = box.getBoundingSphere(new THREE.Sphere()).radius;
        function render() {
          var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
          ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); ren.setSize(w, h, false);
          ren.outputEncoding = THREE.sRGBEncoding;
          cam.aspect = w / h; var half = Math.min(cam.fov, cam.fov * cam.aspect) * Math.PI / 360;
          cam.position.set(0, 0, radius / Math.sin(half) * 0.68); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
          ren.render(sc, cam);
          anchorBeam(w, h);
        }
        /* project the lens face to screen space so the beam leaves the tube exactly there, also when tipped up */
        function anchorBeam(w, h) {
          sc.updateMatrixWorld(true);
          var p = model.localToWorld(new THREE.Vector3(0, 0, 2.45)).project(cam);
          var lx = (p.x + 1) / 2 * w, ly = (1 - p.y) / 2 * h;
          var px = 0.88 * w, py = 0.52 * h, vx = lx - px, vy = ly - py, a = 5 * Math.PI / 180;
          var s = scope.style;
          s.setProperty('--lx', lx.toFixed(1) + 'px'); s.setProperty('--ly', ly.toFixed(1) + 'px');
          s.setProperty('--dx', (vx * Math.cos(a) - vy * Math.sin(a) - vx).toFixed(1) + 'px');
          s.setProperty('--dy', (vx * Math.sin(a) + vy * Math.cos(a) - vy).toFixed(1) + 'px');
        }
        telescope.renderer = ren; telescope.render = render; render();
        var t = 0; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(render, 150); });
        /* a lost GL context (GPU reset, too many contexts, background tab) must not make the telescope vanish: keep the canvas and redraw once the browser restores it */
        cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
        cv.addEventListener('webglcontextrestored', function () { render(); });
        doc.addEventListener('visibilitychange', function () { if (!doc.hidden) render(); });
      }).catch(function () { cv.style.display = 'none'; ren.dispose(); });
    });
  }

  /* ---------- project preview: projector beam from the lens onto a screen ---------- */
  var preview = (function () {
    var map = null, loading = false, active = null, timer = 0, frame = null, img = null, tok = 0, scrollRaf = 0;
    var viewEl = scope.querySelector('.fx-view'), liveOk = /^https:\/\/[a-z0-9-]+\.github\.io\//i;
    function slug(s) { return (s || '').toLowerCase(); }
    /* data/projects.json is keyed by the repo name in each card's link, so new projects work without code changes */
    function key(card) { return slug((card.getAttribute('href') || '').split('/').pop() || card.querySelector('h3').textContent.trim()); }
    var waiting = [];
    function load(cb) {
      if (map) return cb();
      waiting.push(cb);
      if (loading) return; loading = true;
      fetch('data/projects.json').then(function (r) { return r.json(); }).then(function (d) {
        map = {}; d.forEach(function (p) { map[slug((p.url || '').split('/').pop())] = p; });
      }).catch(function () { map = {}; }).then(function () { waiting.splice(0).forEach(function (f) { f(); }); });
    }
    function stopScroll() { if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; } }
    function dropFrame() { stopScroll(); if (frame) { frame.onload = null; frame.src = 'about:blank'; frame.remove(); frame = null; } }
    function reset() { clearTimeout(timer); dropFrame(); if (img) { img.removeAttribute('src'); img.remove(); img = null; } lensEl.textContent = ''; }
    function fit() { lensEl.style.setProperty('--s', (lensEl.clientWidth / 1280).toFixed(4)); }
    /* smooth auto-scroll of the live page (needs a same-origin page; otherwise the CSS pan fallback is used) */
    function autoScroll(f) {
      var w, d;
      try { w = f.contentWindow; d = f.contentDocument; if (!w || !d || !d.documentElement) return false; } catch (e) { return false; }
      var y = 0, dir = 1, hold = performance.now() + 1100, last = performance.now(), max = 0, check = 0;
      function step(now) {
        scrollRaf = 0; if (f !== frame) return;
        try {
          if (now - check > 800) { check = now; max = Math.max(0, Math.min(d.documentElement.scrollHeight - w.innerHeight, 12000)); }
          if (max > 40 && now >= hold) {
            var speed = Math.max(60, max / 16) * (dir > 0 ? 1 : 2.2), dt = Math.min(64, now - last) / 1000;
            y += dir * speed * dt;
            if (y >= max) { y = max; dir = -1; hold = now + 1200; } else if (y <= 0) { y = 0; dir = 1; hold = now + 1400; }
            w.scrollTo({ top: y, behavior: 'instant' });
          }
        } catch (e) { return; }
        last = now; scrollRaf = requestAnimationFrame(step);
      }
      scrollRaf = requestAnimationFrame(step); return true;
    }
    function show(card) {
      var name = card.querySelector('h3').textContent.trim(), my = ++tok;
      active = card; capEl.innerHTML = '<b>◉</b> '; capEl.appendChild(doc.createTextNode(name));
      load(function () {
        if (my !== tok || !prefs.scope) return;
        var d = map[key(card)]; reset(); beamEl.classList.remove('closing'); beamEl.classList.add('on'); viewEl.classList.add('firing'); fit();
        if (d && d.image) {
          img = doc.createElement('img'); img.alt = ''; img.decoding = 'async'; img.src = d.image; lensEl.appendChild(img);
        } else {
          var r = doc.createElement('div'); r.className = 'fx-repo';
          r.innerHTML = '<span>repository</span><b></b><span></span>';
          r.children[1].textContent = d ? d.title : name; r.children[2].textContent = d && d.stack ? d.stack.slice(0, 2).join(' · ') : 'GitHub';
          lensEl.appendChild(r);
        }
        if (d && d.liveUrl && liveOk.test(d.liveUrl)) {
          timer = setTimeout(function () {
            if (my !== tok) return; dropFrame();
            var f = doc.createElement('iframe'), sameOrigin = false;
            try { sameOrigin = new URL(d.liveUrl).origin === location.origin; } catch (e) {}
            frame = f; f.loading = 'lazy'; f.tabIndex = -1; f.title = ''; f.setAttribute('aria-hidden', 'true'); f.referrerPolicy = 'no-referrer';
            f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            f.onload = function () {
              if (f !== frame) return;
              if (!reduce && !(sameOrigin && autoScroll(f))) f.classList.add('pan');
              setTimeout(function () { if (f === frame) f.classList.add('ready'); }, 900);
            };
            f.src = d.liveUrl; lensEl.appendChild(f);
          }, 1100);
        }
      });
    }
    function hide() {
      tok++; active = null; viewEl.classList.remove('firing'); capEl.textContent = 'Hover a project to peek';
      if (beamEl.classList.contains('on')) { beamEl.classList.remove('on'); beamEl.classList.add('closing'); }
      var my = tok; setTimeout(function () { if (my === tok) { reset(); beamEl.classList.remove('closing'); } }, 340);
    }
    var wk = doc.getElementById('wk'), hideT = 0, hidePending = false;
    function cancelHide() { clearTimeout(hideT); hidePending = false; }
    function schedHide() { if (hidePending) return; hidePending = true; hideT = setTimeout(function () { hidePending = false; hide(); }, 140); }
    if (wk) {
      var cardOf = function (t) { return t && t.closest ? t.closest('.card') : null; };
      /* leaving is debounced: a card lifting/scaling under a still cursor can fire out/over pairs, which must not cancel the beam */
      var enter = function (e) { var c = cardOf(e.target); if (!c) return; cancelHide(); if (c !== active && prefs.scope) show(c); };
      var leave = function (e) { var c = cardOf(e.target); if (c && !c.contains(e.relatedTarget)) schedHide(); };
      wk.addEventListener('mouseover', enter); wk.addEventListener('mouseout', leave);
      wk.addEventListener('pointerover', enter); wk.addEventListener('pointerout', leave);
      wk.addEventListener('focusin', enter); wk.addEventListener('focusout', leave);
      /* position-based trigger: does not depend on enter/leave event pairing, so it also works when those are swallowed or reordered */
      var px = 0, py = 0, pend = 0;
      addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        px = e.clientX; py = e.clientY;
        if (pend) return;
        pend = requestAnimationFrame(function () {
          pend = 0;
          var c = cardOf(doc.elementFromPoint(px, py));
          if (c) { cancelHide(); if (c !== active && prefs.scope) show(c); } else if (active) schedHide();
        });
      }, { passive: true });
    }
    addEventListener('resize', fit);
    return { hide: hide };
  })();

  /* ---------- delegated hover tick + click sound (one listener each) ---------- */
  var lastWord = null;
  doc.addEventListener('pointerover', function (e) {
    var w = e.target.closest && e.target.closest('.w');
    if (w && w !== lastWord && prefs.portal && prefs.scope) audio.play('tick');
    lastWord = w || null;
  }, { passive: true });
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('a,button,summary');
    if (t && !t.classList.contains('fx-b')) audio.play('click');
  });

  /* ---------- boot ---------- */
  wrapWords();
  doc.addEventListener('projects:added', wrapWords);
  ['scope', 'portal', 'sound'].forEach(function (k) { applyPref(k, false); });
  initTelescope();
})();
