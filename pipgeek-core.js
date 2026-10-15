// PiPGeek core. pipgeekRun() runs inside the web page: background.js injects it with chrome.scripting.executeScript
// (only when you click the icon, press the shortcut or use the right-click menu), and auto.js uses it for
// "pop out when I switch tabs". It finds the main video, pops it out or puts it back. Nothing is sent anywhere.
// The function must stay self-contained: the browser copies its source text into the page.
function pipgeekRun(cmd) {
  'use strict';
  cmd = cmd || {};
  const G = globalThis.__pipgeek || (globalThis.__pipgeek = {});
  const FIREFOX = /\bFirefox\//.test(navigator.userAgent);
  const ACCENT = '#4f46e5';

  // ---------- finding videos ----------
  function shadowOf(el) {
    if (el.shadowRoot) return el.shadowRoot;
    try { if (FIREFOX && el.openOrClosedShadowRoot) return el.openOrClosedShadowRoot; } catch (e) { /* not allowed */ }
    try { if (!FIREFOX && typeof chrome !== 'undefined' && chrome.dom && chrome.dom.openOrClosedShadowRoot) return chrome.dom.openOrClosedShadowRoot(el); } catch (e) { /* not allowed */ } // chromium-only
    return null;
  }
  // Every video in this document: inside shadow roots (open, and closed where the browser lets add-ons see them)
  // and inside frames from the same site. ox, oy and clip place each one on the top page.
  function collect() {
    const out = []; let foreign = 0;
    const vw = innerWidth, vh = innerHeight;
    function walk(root, ox, oy, clip, depth, inShadow, frameEl) {
      if (depth > 12) return;
      let all;
      try { all = root.querySelectorAll('*'); } catch (e) { return; }
      for (const el of all) {
        const tag = el.localName;
        if (tag === 'video') out.push({ v: el, ox, oy, clip, root, shadow: inShadow, frame: frameEl });
        else if (tag === 'iframe' || tag === 'frame') {
          let doc = null;
          try { doc = el.contentDocument; } catch (e) { doc = null; }
          if (!doc || !doc.documentElement) { foreign++; continue; }
          const r = el.getBoundingClientRect();
          const fx = ox + r.left + el.clientLeft, fy = oy + r.top + el.clientTop;
          const c = [Math.max(clip[0], fx), Math.max(clip[1], fy), Math.min(clip[2], fx + el.clientWidth), Math.min(clip[3], fy + el.clientHeight)];
          walk(doc, fx, fy, c, depth + 1, false, el);
        }
        const sr = shadowOf(el);
        if (sr) walk(sr, ox, oy, clip, depth + 1, true, frameEl);
      }
    }
    walk(document, 0, 0, [0, 0, vw, vh], 0, false, null);
    return { list: out, foreign };
  }
  function shown(v) {
    try {
      if (v.checkVisibility && !v.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
      const cs = v.ownerDocument.defaultView.getComputedStyle(v);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05;
    } catch (e) { return true; }
  }
  function measure(c) {
    const v = c.v, r = v.getBoundingClientRect();
    const L = r.left + c.ox, T = r.top + c.oy, R = r.right + c.ox, B = r.bottom + c.oy;
    const w = Math.max(0, Math.min(R, c.clip[2]) - Math.max(L, c.clip[0])), h = Math.max(0, Math.min(B, c.clip[3]) - Math.max(T, c.clip[1]));
    c.full = Math.max(0, r.width) * Math.max(0, r.height);
    c.vis = shown(v) ? w * h : 0;
    c.playing = !v.paused && !v.ended && v.readyState > 2;
    c.loaded = v.readyState > 0;
    c.hasSource = !!(v.currentSrc || v.src || v.srcObject || v.querySelector('source'));
    const seen = c.vis >= 1600;   // at least 40 x 40 px of it on screen
    c.score = (c.playing && seen ? 4e9 : seen ? 2e9 : c.playing ? 1e9 : 0) + (seen ? c.vis : c.full) + (c.loaded ? 1 : 0);
    if (!c.hasSource && !c.loaded) c.score = -1;
    return c;
  }
  function best(list, src) {
    let pool = list.map(measure);
    if (src) {
      const same = pool.filter((c) => c.v.currentSrc === src || c.v.src === src);
      if (same.length) pool = same;
    }
    pool.sort((a, b) => b.score - a.score);
    return pool[0] && pool[0].score >= 0 ? pool[0] : null;
  }
  function inPip() {
    // The video that is popped out from this page (or a same-site frame), if any.
    const { list } = collect();
    for (const c of list) {
      const d = c.v.ownerDocument;
      if (d.pictureInPictureElement === c.v || (c.root.pictureInPictureElement === c.v)) return c;
    }
    return null;
  }
  function where(c) { return c.frame ? 'iframe' : c.shadow ? 'shadow' : 'page'; }

  // ---------- small messages on the page ----------
  function host() {
    let h = G.host && G.host.isConnected ? G.host : null;
    if (h) return G.root;
    h = document.createElement('pipgeek-ui');
    h.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
    const root = h.attachShadow({ mode: 'closed' });
    const css = document.createElement('style');
    css.textContent = `
      :host { all: initial; }
      .t { position: fixed; top: 16px; right: 16px; max-width: 360px; box-sizing: border-box; padding: 12px 14px 12px 14px; border-radius: 12px;
        background: #17171f; color: #f4f4f6; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,.35);
        border-left: 4px solid ${ACCENT}; pointer-events: auto; opacity: 0; transform: translateY(-6px); transition: opacity .18s, transform .18s; }
      .t.on { opacity: 1; transform: none; }
      .t b { display: block; font-size: 13px; color: #a5b4fc; margin-bottom: 2px; letter-spacing: .02em; }
      .t kbd { font: 12px ui-monospace, Consolas, monospace; background: #2c2c38; border-radius: 5px; padding: 1px 5px; }
      .t .x { position: absolute; top: 6px; right: 8px; background: none; border: 0; color: #9a9aa8; font-size: 16px; cursor: pointer; padding: 2px 4px; }
      .p { position: fixed; transform: translate(-50%, -50%); pointer-events: auto; border: 0; border-radius: 999px; padding: 12px 20px; cursor: pointer;
        background: ${ACCENT}; color: #fff; font: 700 15px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.4);
        display: inline-flex; gap: 9px; align-items: center; }
      .p:hover { background: #4338ca; }
      .p svg { width: 18px; height: 18px; }
      .ring { position: fixed; border: 3px solid ${ACCENT}; border-radius: 8px; box-shadow: 0 0 0 9999px rgba(0,0,0,.25); pointer-events: none; transition: opacity .3s; }`;
    const w = document.createElement('div'); w.id = 'w';
    root.append(css, w);
    (document.body || document.documentElement).appendChild(h);
    G.host = h; G.root = root;
    return root;
  }
  function clear() { if (G.host && G.host.isConnected) G.root.getElementById('w').textContent = ''; clearTimeout(G.timer); }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // parts: a string, or a list of strings and {kbd: text} / {i: text} for key names and menu names
  function toast(title, parts, ms) {
    const root = host(); clear();
    const t = el('div', 't'); t.setAttribute('role', 'status');
    const x = el('button', 'x', '\u00d7'); x.title = 'Close'; x.onclick = clear;
    const m = el('div', 'm');
    for (const p of [].concat(parts)) m.append(typeof p === 'string' ? p : p.kbd ? el('kbd', '', p.kbd) : el('i', '', p.i));
    t.append(x, el('b', '', title), m);
    root.getElementById('w').appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    G.timer = setTimeout(clear, ms || 4500);
    return t;
  }
  function rectOnTop(c) {
    const r = c.v.getBoundingClientRect();
    return { left: r.left + c.ox, top: r.top + c.oy, width: r.width, height: r.height };
  }
  // A button over the video. A click on it counts as you using the page, so the browser lets it pop the video out.
  function popButton(c, why) {
    const root = host(); clear();
    try { c.v.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { /* ignore */ }
    const r = rectOnTop(c);
    const ring = document.createElement('div'); ring.className = 'ring';
    Object.assign(ring.style, { left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 'px', height: r.height + 'px' });
    const b = document.createElement('button'); b.className = 'p'; b.id = 'pipgeek-pop';
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.2');
    for (const [x, y, w, h, rx, fill] of [[2, 4, 20, 16, 2.5, 'none'], [12, 11, 8, 7, 1.2, 'currentColor']]) {
      const r = document.createElementNS(NS, 'rect');
      for (const [k, v] of Object.entries({ x, y, width: w, height: h, rx, fill })) r.setAttribute(k, v);
      svg.append(r);
    }
    b.append(svg, el('span', '', 'Pop out video'));
    Object.assign(b.style, { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px' });
    b.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation(); clear();
      try { await enter(c.v); } catch (err) { fail(c, err, true); }
    };
    root.getElementById('w').append(ring, b);
    const t = toast('PiPGeek', why, 9000);
    root.getElementById('w').prepend(ring, b);   // toast() cleared the layer, put them back
    G.timer = setTimeout(clear, 9000);
    return t;
  }
  function firefoxHelp(c) {
    if (c) { try { c.v.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { /* ignore */ } }
    const mac = /Mac/.test(navigator.platform);
    toast('Use Firefox\'s own picture-in-picture', ['This version of Firefox does not let add-ons pop videos out. Firefox can do it itself: hover over the video and click the picture-in-picture button on its edge, or press ',
      { kbd: mac ? 'Cmd+Option+Shift+]' : 'Ctrl+Shift+]' }, '. You can also right-click the video and pick ', { i: 'Watch in Picture-in-Picture' }, '.'], 12000);
  }

  // ---------- popping out ----------
  async function enter(v) {
    // Some sites switch picture-in-picture off for their player. Switch it back on for this video.
    if (v.disablePictureInPicture || v.hasAttribute('disablepictureinpicture')) {
      v.removeAttribute('disablepictureinpicture');
      try { v.disablePictureInPicture = false; } catch (e) { /* ignore */ }
      G.unblocked = (G.unblocked || 0) + 1;
    }
    await v.requestPictureInPicture();
    G.last = v;
  }
  function fail(c, err, fromButton) {
    const name = err && err.name;
    if (name === 'NotAllowedError' && !fromButton) {
      popButton(c, FIREFOX ? 'Firefox needs one more click from you: press the button on the video. Tip: the keyboard shortcut (Alt+P) pops it out straight away.'
        : 'Click the button on the video to pop it out.');
      return { ok: false, action: 'button', where: where(c), error: name };
    }
    if (name === 'InvalidStateError' && c && c.v.readyState === 0) {
      toast('PiPGeek', 'This video has not loaded yet. Press play, then try again.');
      return { ok: false, action: 'none', error: name, reason: 'not-loaded' };
    }
    toast('PiPGeek', 'The browser would not pop this video out' + (err && err.message ? ': ' + String(err.message) : '.'));
    return { ok: false, action: 'none', error: name || String(err) };
  }

  async function main() {
    const mode = cmd.mode || 'toggle';
    if (mode === 'scan') {
      // used for frames from other sites: report how good the best video here is, change nothing
      if (window.top === window) return { score: -1 };
      const b = best(collect().list);
      return { score: b ? b.score : -1 };
    }
    if (mode === 'note') {
      toast('PiPGeek', FIREFOX ? ['The video is inside a frame from another site, which add-ons can\'t reach. Right-click the video and pick ', { i: 'Watch in Picture-in-Picture' }, ', or use the player\'s own button.']
        : ['The video is inside a frame from another site. Right-click the video and pick ', { i: 'Picture in picture' }, ', or use the player\'s own button. Allowing PiPGeek on every site (in its settings) lets it reach these too.'], 8000);
      return { ok: false, action: 'none', reason: 'frame' };
    }
    const supported = typeof HTMLVideoElement !== 'undefined' && 'requestPictureInPicture' in HTMLVideoElement.prototype;
    if (mode === 'toggle' || mode === 'enter') {
      const open = inPip();
      if (open && (mode === 'toggle' || !cmd.src || open.v.currentSrc === cmd.src || open.v.src === cmd.src)) {
        clear();
        await open.v.ownerDocument.exitPictureInPicture();
        return { ok: true, action: 'exit', where: where(open) };
      }
    }
    const { list, foreign } = collect();
    const c = best(list, cmd.src);
    if (!c) {
      if (mode === 'auto' || cmd.quiet) return { ok: false, action: 'none', reason: 'no-video', foreign };
      if (foreign) return { ok: false, action: 'none', reason: 'no-video', foreign };
      toast('PiPGeek', 'No video found on this page. Start the video playing, then try again.');
      return { ok: false, action: 'none', reason: 'no-video', foreign };
    }
    if (!supported) {
      if (mode !== 'auto') firefoxHelp(c);
      return { ok: false, action: 'help', where: where(c) };
    }
    if (mode === 'auto' && !c.playing) return { ok: false, action: 'none', reason: 'not-playing' };
    try {
      await enter(c.v);
      clear();
      return { ok: true, action: 'enter', where: where(c), unblocked: G.unblocked || 0 };
    } catch (err) {
      if (mode === 'auto') return { ok: false, action: 'none', error: err && err.name };
      return fail(c, err, false);
    }
  }

  // ---------- pop out when I switch tabs (Chromium: Media Session "enterpictureinpicture") ----------
  function autoOn(on) {
    try {
      if (!navigator.mediaSession) return false;
      navigator.mediaSession.setActionHandler('enterpictureinpicture', on ? () => { pipgeekRun({ mode: 'auto' }); } : null);
      G.auto = on;
      return true;
    } catch (e) { return false; }   // Firefox and older browsers do not have this action
  }
  function syncAuto() {
    try {
      chrome.storage.local.get({ autoPip: false }).then((s) => autoOn(!!s.autoPip)).catch(() => {});
      if (!G.watching) {
        G.watching = true;
        chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.autoPip) autoOn(!!ch.autoPip.newValue); });
      }
    } catch (e) { /* storage not available here */ }
  }

  if (cmd.mode === 'register') { syncAuto(); return Promise.resolve({ ok: true, action: 'register' }); }
  const p = main();
  if (cmd.mode !== 'scan' && cmd.mode !== 'auto' && window.top === window) syncAuto();
  return p;
}
