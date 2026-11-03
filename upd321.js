/* upd321.js — 321 系列通用「自動更新」掛件（ES5，不依賴 App 的任何函式）
   做法與互動聖經相同：
   ① version.json 輪詢（開啟 2.5 秒後、每 30 分鐘、回到前景、bfcache 回來、恢復連線；fetch no-store）
   ② Service Worker 更新（register 用 updateViaCache:'none'，每次檢查也 reg.update()）
   ③ 新 SW 啟用時通知頁面（背景中的舊頁面由 sw.js 直接帶到新版）
   空閒（沒有朗讀／錄音錄影／美圖工作室／小智面板／畫線面板／共讀中／輸入框有字）時自動套用；
   忙碌時只在頂端顯示「有新版本」更新條（可點立即更新），忙碌結束後自動套用。
   防無限重整（sessionStorage）：同一版第一次一般更新，第二次硬更新（只清本 App 前綴的快取），
   硬更新過仍是舊檔（CDN 尚未生效）就只留更新條。
   設定：頁面先定義 window.UPD321_VER（或全域 APPVER）；選用 UPD321_PFX（快取前綴陣列）、UPD321_SW（預設 sw.js）、
   UPD321_LANG（'tc'|'sc'|'en' 或回傳它們的函式）、UPD321_BUSY（額外忙碌判斷函式）。
   UI：UPD321.card() 回傳「版本與更新」卡片（版本號＋檢查更新＋強制更新）；UPD321.mount(parent) 掛上去。 */
(function () {
  if (window.UPD321) return;
  var doc = document;
  var S = {
    tc: { newVer: '🔔 已有新版本，點這裡立即更新', updating: '正在更新到最新版…', upToDate: '✓ 已是最新版本', netErr: '目前連不上網路，請稍後再試', found: '發現新版本，正在更新…', updated: '✓ 已自動更新到最新版 v', title: '🔄 版本與更新', cur: '目前版本', check: '檢查更新', hard: '強制更新', hardAsk: '強制更新會清除本 App 的離線快取並重新下載（您的資料與紀錄不受影響）。要繼續嗎？', note: '有新版時 App 會在您閒置時自動更新；朗讀、錄影、輸入中不會被打斷。' },
    sc: { newVer: '🔔 已有新版本，点这里立即更新', updating: '正在更新到最新版…', upToDate: '✓ 已是最新版本', netErr: '目前连不上网络，请稍后再试', found: '发现新版本，正在更新…', updated: '✓ 已自动更新到最新版 v', title: '🔄 版本与更新', cur: '当前版本', check: '检查更新', hard: '强制更新', hardAsk: '强制更新会清除本 App 的离线缓存并重新下载（您的数据与记录不受影响）。要继续吗？', note: '有新版时 App 会在您闲置时自动更新；朗读、录像、输入中不会被打断。' },
    en: { newVer: '🔔 A new version is ready — tap to update', updating: 'Updating to the latest version…', upToDate: '✓ You have the latest version', netErr: 'No connection right now — please try again later', found: 'New version found, updating…', updated: '✓ Updated to the latest version v', title: '🔄 Version & updates', cur: 'Current version', check: 'Check for updates', hard: 'Force update', hardAsk: 'Force update clears this app\'s offline cache and downloads everything again (your data and records are kept). Continue?', note: 'When a new version is out the app updates itself while you are idle; reading aloud, recording and typing are never interrupted.' }
  };
  var UPD = { reg: null, target: '', pending: false, started: false };
  function VER() { try { return String(window.UPD321_VER || (typeof APPVER !== 'undefined' ? APPVER : '') || ''); } catch (e) { return String(window.UPD321_VER || ''); } }
  function L() {
    var l = window.UPD321_LANG;
    try { if (typeof l === 'function') l = l(); } catch (e) { l = ''; }
    if (l === 'tc' || l === 'sc' || l === 'en') return l;
    var h = String(doc.documentElement.lang || '').toLowerCase();
    if (/^en/.test(h)) return 'en';
    if (/hans|cn|sg|^zh-?s/.test(h)) return 'sc';
    return 'tc';
  }
  function T(k) { return (S[L()] || S.tc)[k]; }
  function ssGet(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  function now() { return new Date().getTime(); }

  /* ---------- toast ---------- */
  var tt = 0;
  function toast(m) {
    try {
      var t = doc.getElementById('upd321-toast');
      if (!t) { t = doc.createElement('div'); t.id = 'upd321-toast'; (doc.body || doc.documentElement).appendChild(t); }
      t.textContent = m; t.className = 'on'; clearTimeout(tt); tt = setTimeout(function () { t.className = ''; }, 2600);
    } catch (e) { }
  }
  function css() {
    if (doc.getElementById('upd321-css')) return;
    var s = doc.createElement('style'); s.id = 'upd321-css';
    s.textContent = '#upd321-bar{position:fixed;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top));z-index:2147483000;max-width:92vw;background:#1e4d8c;color:#fff;padding:10px 18px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.28);font:600 14px/1.4 -apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;text-align:center;cursor:pointer}' +
      '#upd321-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483001;max-width:88vw;background:rgba(30,30,30,.92);color:#fff;padding:9px 16px;border-radius:12px;font:600 14px/1.4 -apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;opacity:0;pointer-events:none;transition:opacity .2s;text-align:center}#upd321-toast.on{opacity:1}' +
      '.upd321-card{box-sizing:border-box;margin:14px 0;padding:14px;border:1px solid rgba(128,128,128,.35);border-radius:14px;background:rgba(128,128,128,.08);color:inherit;font-size:15px;line-height:1.6}' +
      '.upd321-card .u3t{font-weight:800;margin-bottom:6px}.upd321-card .u3v{display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;word-break:break-all}.upd321-card .u3v b{font-weight:800}' +
      '.upd321-card .u3b{display:grid;grid-template-columns:1fr 1fr;gap:8px}.upd321-card button{box-sizing:border-box;min-height:44px;padding:8px 6px;border-radius:10px;border:1.5px solid #1e4d8c;background:#e8edf5;color:#1e4d8c;font:800 15px/1.3 inherit;font-family:inherit;cursor:pointer}' +
      '.upd321-card button.u3h{border-color:rgba(128,128,128,.5);background:transparent;color:inherit;font-weight:700}.upd321-card .u3n{font-size:13px;opacity:.75;margin-top:8px;line-height:1.55}';
    (doc.head || doc.documentElement).appendChild(s);
  }

  /* ---------- 忙碌判斷 ---------- */
  function busy() {
    try {
      if (typeof window.UPD321_BUSY === 'function' && window.UPD321_BUSY()) return true;
      if (window.CR) { var cr = CR.on ? CR.on() : (typeof CR.role === 'function' ? CR.role() : CR.role); if (cr) return true; }                     /* 共讀中 */
      if (window.speechSynthesis && speechSynthesis.speaking) return true;               /* 內建語音朗讀 */
      var m = doc.querySelectorAll('audio,video');
      for (var i = 0; i < m.length; i++) if (!m[i].paused && !m[i].ended && m[i].readyState > 1) return true;   /* 朗讀／配樂／錄影預覽 */
      if (doc.getElementById('spkbar')) return true;                                      /* 朗讀控制列 */
      if (doc.documentElement.classList.contains('gxa-lock')) return true;               /* 美圖工作室／小智／工具箱全螢幕 */
      if (doc.querySelector('#gxaroot .on, .gxsmask.on, .gxz.on, #gxuBox.on, .hlsheet-mask, .rw-mask, .gxr-ov, dialog[open]')) return true;
      var a = doc.activeElement;
      if (a && /^(TEXTAREA|INPUT)$/.test(a.tagName) && a.value && !/^(checkbox|radio|range|button|submit|file|color)$/i.test(a.type || '')) return true;
      if (a && a.isContentEditable && (a.textContent || '').length) return true;
    } catch (e) { }
    return false;
  }

  /* ---------- 版本偵測 ---------- */
  function verFetch(ok, fail) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', 'version.json?t=' + now(), true);
      try { x.setRequestHeader('Cache-Control', 'no-cache'); } catch (e) { }
      x.timeout = 15000;
      x.onload = function () { if (x.status >= 200 && x.status < 300) { try { return ok(JSON.parse(x.responseText)); } catch (e) { } } if (fail) fail(); };
      x.onerror = x.ontimeout = function () { if (fail) fail(); };
      x.send();
    } catch (e) { if (fail) fail(); }
  }
  function bar(on) {
    var b = doc.getElementById('upd321-bar');
    if (!on) { if (b && b.parentNode) b.parentNode.removeChild(b); return; }
    css();
    if (!b) { b = doc.createElement('div'); b.id = 'upd321-bar'; b.onclick = function () { apply(ssGet('updTry') === UPD.target); }; (doc.body || doc.documentElement).appendChild(b); }
    b.textContent = T('newVer');
  }
  function reloadFresh() {
    if (window.__reloading) return; window.__reloading = 1;
    var q = String(location.search || '').replace(/([?&])u=\d+&?/, '$1').replace(/[?&]$/, '');
    location.replace(location.pathname + q + (q ? '&' : '?') + 'u=' + now() + (location.hash || ''));
  }
  function mine(k) {
    var p = window.UPD321_PFX; if (!p || !p.length) return false;
    for (var i = 0; i < p.length; i++) if (String(k).indexOf(p[i]) === 0) return true;
    return false;
  }
  function apply(hard) {
    bar(false); toast(T('updating'));
    ssSet('updTry', UPD.target || 'x');
    if (!hard && navigator.serviceWorker && UPD.reg) {
      try { if (UPD.reg.waiting) UPD.reg.waiting.postMessage('skip'); UPD.reg.update(); } catch (e) { }
      setTimeout(reloadFresh, 900); return;
    }
    ssSet('updHard', UPD.target || 'x');
    var done = 0, fin = function () { if (!done) { done = 1; reloadFresh(); } };
    try {
      if (window.caches && caches.keys) caches.keys().then(function (ks) {
        return Promise.all(ks.filter(mine).map(function (k) { return caches['delete'](k); }));
      })['catch'](function () { });
      if (UPD.reg) UPD.reg.unregister().then(function () { setTimeout(fin, 300); }, fin);
    } catch (e) { }
    setTimeout(fin, 1500);
  }
  function onNew(v) {
    if (!v || v === VER()) return;
    UPD.target = v;
    if (busy()) { UPD.pending = true; bar(true); return; }
    if (ssGet('updHard') === v) { bar(true); return; }
    apply(ssGet('updTry') === v);
  }
  function idle() { if (UPD.pending && !busy()) { UPD.pending = false; onNew(UPD.target); } }
  function check(manual) {
    if (navigator.onLine === false) { if (manual) toast(T('netErr')); return; }
    try { if (UPD.reg) UPD.reg.update(); } catch (e) { }
    verFetch(function (j) {
      var v = j && (j.v || j.version);
      if (v && String(v) !== VER()) { if (manual) { ssSet('updHard', ''); toast(T('found')); } onNew(String(v)); }
      else if (manual) toast(T('upToDate'));
    }, function () { if (manual) toast(T('netErr')); });
  }
  function force() { if (window.confirm(T('hardAsk'))) { UPD.target = UPD.target || 'x'; apply(true); } }

  /* ---------- 「版本與更新」卡片 ---------- */
  function card() {
    css();
    var c = doc.createElement('div'); c.className = 'upd321-card'; c.setAttribute('data-upd321', '1');
    c.innerHTML = '<div class="u3t">' + T('title') + '</div><div class="u3v"><span>' + T('cur') + '</span><b>' + VER().replace(/</g, '&lt;') + '</b></div>' +
      '<div class="u3b"><button type="button" data-k="check">' + T('check') + '</button><button type="button" class="u3h" data-k="hard">' + T('hard') + '</button></div><div class="u3n">' + T('note') + '</div>';
    c.addEventListener('click', function (e) {
      var k = e.target && e.target.getAttribute && e.target.getAttribute('data-k');
      if (k === 'check') check(1); else if (k === 'hard') force();
    });
    return c;
  }
  function mount(parent, before) {
    if (!parent) return null;
    var old = parent.querySelector && parent.querySelector('[data-upd321]');
    if (old) return old;
    var c = card(); if (before) parent.insertBefore(c, before); else parent.appendChild(c); return c;
  }
  /* 在 App 的設定／我的頁面出現時自動掛上卡片：sel＝容器選擇器；pos＝'end'（預設）或 'start' */
  function mountWhen(sel, pos, up, need) {
    var go = function () {
      try {
        var els = doc.querySelectorAll(sel);
        for (var i = 0; i < els.length; i++) {
          var c = els[i];
          if (up) { var n = c; c = null; while (n && n.nodeType === 1) { if (n.matches ? n.matches(up) : (n.msMatchesSelector && n.msMatchesSelector(up))) { c = n; break; } n = n.parentNode; } }
          if (!c || c.querySelector('[data-upd321]')) continue;
          if (need && !c.querySelector(need)) continue;
          mount(c, pos === 'start' ? c.firstChild : null);
        }
      } catch (e) { }
    };
    var t = 0;
    var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(go, 120); });
    var start = function () { mo.observe(doc.body, { childList: true, subtree: true }); go(); };
    if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
  }

  /* ---------- 啟動 ---------- */
  function init() {
    if (UPD.started) return; UPD.started = true;
    if (!/^https?:/.test(location.protocol)) return;
    if (/[?&]u=\d+/.test(location.search) && history.replaceState) {
      setTimeout(function () { toast(T('updated') + VER()); }, 1200);
      try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])u=\d+&?/, '$1').replace(/[?&]$/, '') + location.hash); } catch (e) { }
    }
    if ('serviceWorker' in navigator) {
      var sw = navigator.serviceWorker;
      var reg = function () {
        sw.register(window.UPD321_SW || 'sw.js', { updateViaCache: 'none' }).then(function (r) {
          UPD.reg = r;
          var track = function (w) { if (w) w.addEventListener('statechange', function () { if (w.state === 'installed' && sw.controller) check(0); }); };
          track(r.installing); track(r.waiting);
          r.addEventListener('updatefound', function () { track(r.installing); });
        })['catch'](function () { });
      };
      if (doc.readyState === 'complete') reg(); else window.addEventListener('load', reg);
      sw.addEventListener('message', function (e) { var d = e.data || {}; if (d.t === 'sw-updated' && d.v && String(d.v) !== VER()) onNew(String(d.v)); });
      sw.addEventListener('controllerchange', function () { if (UPD.target && !busy()) reloadFresh(); });
    }
    setTimeout(function () { check(0); }, 2500);
    setInterval(function () { check(0); }, 30 * 60 * 1000);
    setInterval(idle, 15000);
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') check(0); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) check(0); });
    window.addEventListener('online', function () { check(0); });
  }
  window.UPD321 = { init: init, check: check, apply: apply, force: force, card: card, mount: mount, mountWhen: mountWhen, busy: busy, idle: idle, st: UPD, ver: VER };
  init();
})();
