/* 321親子同行 · 一起共讀
   帶領者開房間 → 得到 6 位數共讀碼／連結／QR；弟兄姊妹打開後，手機畫面跟著帶領者換到同一個畫面、同一個捲動位置。
   傳輸：peerjs.min.js（Cloudflare 中繼站，相容 PeerJS 介面）。ES5。
   只同步「在哪個畫面」與捲動比例；設定、個人紀錄、填寫內容、對象資料一律不同步（各人畫面顯示各人自己的資料）。
   投影螢幕：連結加 &screen=1（由 peerjs.min.js 負責放大、隱藏介面、保持螢幕不關）。 */
(function () {
  if (window.CR) return;
    var APP = {
    pfx: 'pt321-',
    title: '321親子同行',
    name: { zh: '321親子同行', zs: '321亲子同行', en: '321 Parenting Together' },
    who: { zh: '爸爸媽媽', zs: '爸爸妈妈', en: 'other parents' },
    css: '.crchip,.crmask{--crb:var(--meadow-deep,#3A6450);--crgold:var(--honey,#B8872B);--crcard:var(--card,#fff);--crink:var(--ink,#2B382F);--crmute:var(--muted,#69736C);--crline:var(--line,#E5E0D2);--crbg:var(--bg,#F4F1E7)}' +
      '#crTop{position:relative}' +
      '@media (max-width:380px){header.topbar.crhas{gap:8px;padding-left:12px;padding-right:12px}header.topbar.crhas .right{gap:5px}header.topbar.crhas .icon-btn{width:36px;height:36px}}',
    lang: function () { var l = ''; try { l = String(navigator.language || '').toLowerCase(); } catch (e) { } return /^en/.test(l) ? 'en' : (/^zh-(cn|sg|hans)/.test(l) ? 'zs' : 'zh'); },
    top: function () { return document.querySelector('header.topbar'); },
    /* 孩子模式、首次設定、設定／習慣對話框＝個人性，不同步；成長日記是個人紀錄，也不同步 */
    overlay: function () {
      var d = document, ob = d.getElementById('onboard');
      return !!(d.body.classList.contains('kids') || (ob && ob.classList.contains('open')) || d.querySelector('.sheet-mask.open'));
    },
    page: function () {
      if (APP.overlay()) return null;
      var t = document.querySelector('.tab.active'), id = t ? t.getAttribute('data-page') : 'today';
      if (id !== 'today' && id !== 'task' && id !== 'mood' && id !== 'tips') return null;
      return { p: id };
    },
    key: function (pg) { return pg ? pg.p : '~'; },
    busy: function () {
      var a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return true;
      return APP.overlay();
    },
    go: function (pg) {
      if (!/^(today|task|mood|tips)$/.test(pg.p) || typeof showPage !== 'function') return false;
      showPage(pg.p); return true;
    },
    mount: function () {
      var r = document.querySelector('header.topbar .right'); if (!r || document.getElementById('crTop')) return;
      var b = document.createElement('button'); b.id = 'crTop'; b.type = 'button'; b.className = 'icon-btn'; b.setAttribute('aria-label', 'co-read'); b.textContent = '📡';
      b.style.fontSize = '20px'; b.onclick = function () { window.CR.sheet(); };
      r.insertBefore(b, r.firstChild); r.parentNode.className += ' crhas';
    },
    watch: function (cb) {
      var mo = new MutationObserver(cb), o = { attributes: true, attributeFilter: ['class'] };
      mo.observe(document.body, o);
      var m = document.querySelector('main'); if (m) mo.observe(m, { attributes: true, attributeFilter: ['class'], subtree: true });
      var ob = document.getElementById('onboard'); if (ob) mo.observe(ob, o);
      var ms = document.querySelectorAll('.sheet-mask'); for (var i = 0; i < ms.length; i++) mo.observe(ms[i], o);
    }
  };
  var FOLLOW_COOL = 8000;
  var VER = (function () { try { var s = document.currentScript && document.currentScript.src || ''; var m = s.match(/[?&]v=([^&]+)/); return m ? m[1] : '1'; } catch (e) { return '1'; } })();
  var PEER_JS = ['peerjs.min.js?v=' + VER];
  var QR_JS = ['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js', 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'];
  var SSKEY = 'cr321_' + APP.pfx;
  var TX = {
    zh: { title: '一起共讀', desc: '開一個共讀房間，把共讀碼或連結傳給{who}。他們打開後，手機畫面會跟著你換到同一個畫面、同一個位置；你往下捲，大家也一起捲。個人資料與填寫的內容不會同步。', host: '開共讀房間（我來帶領）', join: '加入', codePH: '輸入 6 位數共讀碼', orJoin: '或加入別人的共讀', code: '共讀碼', people: '已有 {0} 人加入', waiting: '等待{who}加入…', invite: '傳送邀請', copyLink: '複製連結', copyScr: '複製投影連結', scrT: '🖥 投影螢幕', scrD: '在連接投影機或電視的電腦／平板瀏覽器打開投影連結，畫面會變成大字、沒有按鈕、自動跟著你。', copied: '已複製', end: '結束共讀', leave: '離開共讀', inviteMsg: '📡 一起來共讀《{app}》！\n點連結加入：{0}\n或打開 App 按右上角「📡」輸入共讀碼：{1}', following: '跟著帶領共讀', paused: '你自己瀏覽中 · 點這裡回到帶領者', away: '帶領者在其他頁面（此頁不同步）', connecting: '連線中…', hostChip: '共讀 {0} · {1} 人', ended: '共讀已結束', joined: '已加入共讀，畫面會跟著帶領者', noRtc: '這支手機的瀏覽器不支援共讀，請改用 Chrome 或 Safari', loadErr: '共讀功能載入失敗，請確認網路後再試', badCode: '請輸入 6 位數共讀碼', notFound: '找不到這個共讀房間，請確認共讀碼，或請帶領者重新開房間', followOnly: '你正在跟著共讀', back2: '回到帶領者', tip: '提示：帶領者的手機請保持 App 開著、螢幕不要關，大家才會一直同步。', qrTip: '用手機相機掃描加入', btn: '共讀', joinedOne: '有一位加入共讀', hostLeft: '帶領者暫時離線，正在重新連線…', close: '關閉' },
    zs: { title: '一起共读', desc: '开一个共读房间，把共读码或链接传给{who}。他们打开后，手机画面会跟着你换到同一个画面、同一个位置；你往下滚，大家也一起滚。个人资料与填写的内容不会同步。', host: '开共读房间（我来带领）', join: '加入', codePH: '输入 6 位数共读码', orJoin: '或加入别人的共读', code: '共读码', people: '已有 {0} 人加入', waiting: '等待{who}加入…', invite: '发送邀请', copyLink: '复制链接', copyScr: '复制投影链接', scrT: '🖥 投影荧幕', scrD: '在连接投影机或电视的电脑／平板浏览器打开投影链接，画面会变成大字、没有按钮、自动跟着你。', copied: '已复制', end: '结束共读', leave: '离开共读', inviteMsg: '📡 一起来共读《{app}》！\n点链接加入：{0}\n或打开 App 按右上角「📡」输入共读码：{1}', following: '跟着带领共读', paused: '你自己浏览中 · 点这里回到带领者', away: '带领者在其他页面（此页不同步）', connecting: '连线中…', hostChip: '共读 {0} · {1} 人', ended: '共读已结束', joined: '已加入共读，画面会跟着带领者', noRtc: '这支手机的浏览器不支持共读，请改用 Chrome 或 Safari', loadErr: '共读功能载入失败，请确认网络后再试', badCode: '请输入 6 位数共读码', notFound: '找不到这个共读房间，请确认共读码，或请带领者重新开房间', followOnly: '你正在跟着共读', back2: '回到带领者', tip: '提示：带领者的手机请保持 App 开着、屏幕不要关，大家才会一直同步。', qrTip: '用手机相机扫描加入', btn: '共读', joinedOne: '有一位加入共读', hostLeft: '带领者暂时离线，正在重新连线…', close: '关闭' },
    en: { title: 'Read together', desc: 'Open a room and send the room code or link to {who}. When they open it, their phones follow you to the same screen and scroll position; scroll down and everyone scrolls with you. Personal data and anything you type is never shared.', host: 'Open a room (I’ll lead)', join: 'Join', codePH: 'Enter the 6-digit room code', orJoin: 'Or join someone else’s room', code: 'Room code', people: '{0} joined', waiting: 'Waiting for {who} to join…', invite: 'Send invite', copyLink: 'Copy link', copyScr: 'Copy projector link', scrT: '🖥 Projector screen', scrD: 'Open the projector link in the browser of the computer or tablet connected to the projector: big text, no buttons, and it follows you automatically.', copied: 'Copied', end: 'End session', leave: 'Leave', inviteMsg: '📡 Come read “{app}” together!\nTap to join: {0}\nOr open the app, tap “📡” at the top right and enter code {1}', following: 'Following the leader', paused: 'You’re browsing · tap to return to the leader', away: 'Leader is on another screen (not synced)', connecting: 'Connecting…', hostChip: 'Room {0} · {1}', ended: 'Reading session ended', joined: 'Joined — your screen will follow the leader', noRtc: 'This browser cannot join a reading room. Please use Chrome or Safari.', loadErr: 'Could not load reading-together. Check your connection and try again.', badCode: 'Please enter the 6-digit room code', notFound: 'Room not found. Check the code, or ask the leader to open a new room.', followOnly: 'You are following', back2: 'Back to leader', tip: 'Tip: the leader should keep the app open with the screen on so everyone stays in sync.', qrTip: 'Scan with a phone camera to join', btn: 'Together', joinedOne: 'Someone joined the room', hostLeft: 'The leader is offline for a moment — reconnecting…', close: 'Close' }
  };
  function lng() { var l = 'zh'; try { l = APP.lang(); } catch (e) { } return TX[l] ? l : 'zh'; }
  function X(k) {
    var l = lng(), s = (TX[l] && TX[l][k]) || TX.zh[k] || k;
    s = s.replace(/\{who\}/g, (APP.who && APP.who[l]) || '').replace(/\{app\}/g, (APP.name && APP.name[l]) || '');
    for (var i = 1; i < arguments.length; i++) s = s.replace('{' + (i - 1) + '}', arguments[i]);
    return s;
  }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function $(id) { return document.getElementById(id); }

  var loaded = {};
  function loadJs(urls, test, cb) {
    if (test()) { cb(true); return; } var i = 0;
    (function nx() {
      if (i >= urls.length) { cb(false); return; } var u = urls[i++];
      if (loaded[u]) { setTimeout(function () { cb(test()); }, 0); return; }
      var s = document.createElement('script'); s.src = u; s.async = true;
      s.onload = function () { loaded[u] = 1; if (test()) cb(true); else nx(); }; s.onerror = function () { nx(); };
      document.head.appendChild(s);
    })();
  }

  /* ---------- 樣式 ---------- */
  (function () {
    var st = document.createElement('style'); st.id = 'crcss';
    st.textContent = APP.css + '\n' +
      '.crchip{position:fixed;left:50%;transform:translateX(-50%);top:70px;z-index:99980;border:0;border-radius:999px;padding:7px 14px 7px 10px;font:inherit;font-size:14px;line-height:1.35;background:var(--crb);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}' +
      '.crchip .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#5BD38A;margin-right:6px;vertical-align:1px;animation:crp 1.6s infinite}' +
      '.crchip.wait .dot{background:#F2C14E}.crchip.off{background:var(--crgold)}.crchip.off .dot{background:#fff;animation:none}' +
      '@keyframes crp{0%,100%{opacity:1}50%{opacity:.35}}' +
      '#crTop.cron::after{content:"";position:absolute;right:4px;top:4px;width:9px;height:9px;border-radius:50%;background:#5BD38A;border:1.5px solid #fff}' +
      '.crmask{position:fixed;left:0;right:0;top:0;bottom:0;z-index:99990;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;font-size:16px;line-height:1.6}' +
      '.crcard{background:var(--crcard);color:var(--crink);width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));box-sizing:border-box;-webkit-overflow-scrolling:touch}' +
      '.crcard *{box-sizing:border-box}' +
      '.crtt{font-weight:700;font-size:1.15em;margin-bottom:10px}.crk{font-size:.86em;color:var(--crmute);text-align:center;margin-top:6px}' +
      '.crcode{font-size:2.3em;font-weight:800;letter-spacing:.12em;text-align:center;color:var(--crb);margin:2px 0 8px;font-variant-numeric:tabular-nums}' +
      '.crqr{display:flex;justify-content:center;margin:4px 0}.crqr img{width:180px;height:180px;image-rendering:pixelated;background:#fff;border-radius:10px;padding:4px}' +
      '.crcount{text-align:center;font-weight:700;margin:10px 0 4px}.crx{font-size:.86em;color:var(--crmute);line-height:1.6}.crc{text-align:center}' +
      '.cracts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px}' +
      '.crbtn{flex:1 1 130px;min-height:48px;border-radius:13px;border:2px solid var(--crb);background:transparent;color:var(--crb);font:inherit;font-weight:700;padding:0 14px;cursor:pointer}' +
      '.crbtn.pri{background:var(--crb);color:#fff}.crbtn.blk{display:block;width:100%;flex:none}' +
      '.crjoin{display:flex;gap:8px;margin-top:6px}.crjoin input{flex:1;min-width:0;font:inherit;font-size:1.15em;letter-spacing:.1em;padding:10px 12px;border:2px solid var(--crline);border-radius:12px;background:var(--crbg);color:var(--crink);text-align:center;min-height:48px}' +
      '.crjoin .crbtn{flex:none;min-width:84px}' +
      '#crtoast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(110px + env(safe-area-inset-bottom,0px));z-index:99995;background:rgba(20,28,24,.92);color:#fff;border-radius:999px;padding:10px 18px;font-size:15px;max-width:88vw;text-align:center;pointer-events:none}';
    document.head.appendChild(st);
  })();
  var tT = null;
  function say(m) {
    var el = $('crtoast'); if (!el) { el = document.createElement('div'); el.id = 'crtoast'; document.body.appendChild(el); }
    el.textContent = m; el.style.display = 'block'; clearTimeout(tT); tT = setTimeout(function () { el.style.display = 'none'; }, 2200);
  }
  function copyText(t, cb) {
    function fb() { try { var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); document.body.removeChild(a); cb && cb(); } catch (e) { try { window.prompt('', t); } catch (e2) { } } }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { cb && cb(); }, fb); else fb(); } catch (e) { fb(); }
  }
  function shareText(t) { try { if (navigator.share) { navigator.share({ text: t })['catch'](function () { }); return; } } catch (e) { } copyText(t, function () { say(X('copied')); }); }

  /* ---------- 狀態 ---------- */
  var C = { role: '', code: '', peer: null, conns: [], host: null, last: null, lastJson: '', retry: 0, rt: null, manualAt: 0, status: '', want: null, free: false, paused: false, navAt: 0, seenKey: null, misses: 0, first: false, lastRx: 0 };
  function appUrl() { return location.origin + location.pathname; }
  function joinUrl(code, scr) { return appUrl() + '?join=' + code + (scr ? '&screen=1' : ''); }
  function newCode() { var c = ''; for (var i = 0; i < 6; i++) c += Math.floor(Math.random() * 10); return c.charAt(0) === '0' ? '1' + c.slice(1) : c; }
  function live() { var o = []; for (var i = 0; i < C.conns.length; i++) if (C.conns[i].open) o.push(C.conns[i]); return o; }
  function hasWs() { return 'WebSocket' in window; }
  /* undefined＝暫時不判斷（共讀面板開著）；null＝個人性頁面，不同步 */
  function pageNow() { if ($('crsheet')) return undefined; try { return APP.page(); } catch (e) { return undefined; } }
  function ratio() {
    var de = document.documentElement, b = document.body, mx = Math.max(de.scrollHeight, b ? b.scrollHeight : 0) - (window.innerHeight || 600);
    if (mx <= 4) return 0; var y = window.pageYOffset || de.scrollTop || 0;
    return Math.round(Math.min(1, Math.max(0, y / mx)) * 1000) / 1000;
  }

  /* ---------- 帶領者 ---------- */
  function host(code, quiet) {
    if (!hasWs()) { say(X('noRtc')); return; }
    loadJs(PEER_JS, function () { return !!window.Peer; }, function (ok) {
      if (!ok) { say(X('loadErr')); return; }
      teardown(); C.role = 'host'; C.code = code || newCode(); C.status = 'connecting'; C.lastJson = ''; ss(SSKEY, { r: 'host', c: C.code }); chip();
      var p = C.peer = new window.Peer(APP.pfx + C.code, { debug: 0 });
      p.on('open', function () { C.retry = 0; C.status = 'ok'; chip(); if (!quiet) sheet(); snap(true); });
      p.on('connection', function (c) {
        C.conns.push(c);
        c.on('open', function () { chip(); say(X('joinedOne')); paintCount(); if (C.last) try { c.send(C.last); } catch (e) { } });
        c.on('close', function () { drop(c); }); c.on('error', function () { drop(c); });
      });
      p.on('disconnected', function () { if (C.role === 'host' && !p.destroyed) setTimeout(function () { try { p.reconnect(); } catch (e) { } }, 1500); });
      p.on('error', function (e) {
        if (C.role !== 'host') return;
        if (e && e.type === 'unavailable-id') { if (C.retry++ < 25) { C.status = 'connecting'; chip(); clearTimeout(C.rt); C.rt = setTimeout(function () { host(C.code, true); }, 3000); } else { say(X('loadErr')); end(); } return; }
        if (e && (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed')) { clearTimeout(C.rt); C.rt = setTimeout(function () { if (C.role === 'host') host(C.code, true); }, 4000); }
      });
    });
  }
  function drop(c) { var o = []; for (var i = 0; i < C.conns.length; i++) if (C.conns[i] !== c) o.push(C.conns[i]); C.conns = o; chip(); paintCount(); }
  function bcast(m) { if (C.role !== 'host') return; m.t = 'st'; m.ts = new Date().getTime(); C.last = m; var cs = live(); for (var i = 0; i < cs.length; i++) try { cs[i].send(m); } catch (e) { } }
  /* 全量狀態：{pg:頁面識別, f:捲動比例}；個人性頁面送 {off:1}；只傳識別，不傳任何內容 */
  function snap(force) {
    if (C.role !== 'host') return;
    var pg = pageNow(); if (pg === undefined) return;
    var m = pg === null ? { off: 1 } : { pg: pg, f: ratio() }, j = JSON.stringify(m);
    if (!force && j === C.lastJson) return;
    C.lastJson = j; bcast(m);
  }
  var scT = null, chT = null;
  window.addEventListener('scroll', function () { if (C.role === 'host') { clearTimeout(scT); scT = setTimeout(function () { snap(); }, 220); } }, { passive: true });
  function userMove() { if (C.role === 'follow') { C.manualAt = new Date().getTime(); if (!C.paused) { C.paused = true; chip(); } } }
  window.addEventListener('touchmove', userMove, { passive: true }); window.addEventListener('wheel', userMove, { passive: true });
  window.addEventListener('keydown', function (e) { if (e.keyCode === 32 || (e.keyCode >= 33 && e.keyCode <= 40)) userMove(); }, false);

  /* ---------- 跟隨者 ---------- */
  function join(code) {
    code = String(code || '').replace(/\s/g, '').toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(code)) { say(X('badCode')); return; }
    if (!hasWs()) { say(X('noRtc')); return; }
    loadJs(PEER_JS, function () { return !!window.Peer; }, function (ok) {
      if (!ok) { say(X('loadErr')); return; }
      teardown(); C.role = 'follow'; C.code = code; C.status = 'connecting'; C.first = true; C.misses = 0; C.free = false; C.paused = false; C.seenKey = null; ss(SSKEY, { r: 'follow', c: code }); chip(); closeSheet();
      var p = C.peer = new window.Peer({ debug: 0 });
      p.on('open', function () { dial(); });
      p.on('disconnected', function () { if (C.role === 'follow' && !p.destroyed) setTimeout(function () { try { p.reconnect(); } catch (e) { } }, 1500); });
      p.on('error', function (e) {
        if (C.role !== 'follow') return;
        if (e && e.type === 'peer-unavailable') { C.misses++; if (C.first && C.misses >= 3) { say(X('notFound')); leave(true); return; } C.status = 'connecting'; chip(); redial(4000); return; }
        redial(4000);
      });
    });
  }
  function redial(ms) { clearTimeout(C.rt); C.rt = setTimeout(function () { if (C.role === 'follow') dial(); }, ms || 3000); }
  function dial() {
    var p = C.peer; if (!p || p.destroyed || C.role !== 'follow') return;
    if (p.disconnected) { try { p.reconnect(); } catch (e) { } redial(3000); return; }
    try { if (C.host) C.host.close(); } catch (e) { }
    var c = C.host = p.connect(APP.pfx + C.code, { reliable: true });
    var to = setTimeout(function () { if (!c.open && C.role === 'follow' && C.host === c) { try { c.close(); } catch (e) { } redial(1000); } }, 12000);
    c.on('open', function () { clearTimeout(to); C.misses = 0; C.lastRx = new Date().getTime(); C.status = 'ok'; if (C.first) { C.first = false; say(X('joined')); } chip(); });
    c.on('data', function (m) { C.lastRx = new Date().getTime(); if (C.status !== 'ok') { C.status = 'ok'; chip(); } if (!m) return; if (m.t === 'st') apply(m); else if (m.t === 'end') leave(); });
    c.on('close', function () { clearTimeout(to); if (C.role === 'follow' && C.host === c) { C.status = 'lost'; chip(); redial(2500); } });
    c.on('error', function () { });
  }
  function busy() { try { return !!(APP.busy && APP.busy()); } catch (e) { return false; } }
  function followScroll(force) {
    var m = C.want; if (!m || m.off || m.f == null || C.role !== 'follow') return;
    var now = new Date().getTime(); if (!force && now - C.manualAt < FOLLOW_COOL) return;
    if (C.free && !force) return;
    var de = document.documentElement, mx = Math.max(de.scrollHeight, document.body.scrollHeight) - (window.innerHeight || 600), y = Math.round(Math.max(0, mx) * m.f);
    if (C.paused) { C.paused = false; chip(); }
    try { window.scrollTo({ top: y, behavior: Math.abs(y - (window.pageYOffset || 0)) < 1800 ? 'smooth' : 'auto' }); } catch (e) { window.scrollTo(0, y); }
  }
  function scrollLater(force) { setTimeout(function () { followScroll(force); }, 140); setTimeout(function () { followScroll(false); }, 700); setTimeout(function () { followScroll(false); }, 1500); }
  function apply(m, force) {
    if (C.role !== 'follow') return;
    if (m) C.want = m; m = C.want; if (!m) return;
    if (m.off) { chip(); return; }
    if (!m.pg) return;
    if (force) { C.free = false; C.paused = false; C.manualAt = 0; }
    if (C.free) { chip(); return; }
    var cur = pageNow(); if (cur === undefined) return;
    if (APP.key(cur) !== APP.key(m.pg)) {
      if (busy()) return;
      C.navAt = new Date().getTime();
      var ok = false; try { ok = APP.go(m.pg); } catch (e) { ok = false; }
      if (!ok) return;
      try { C.seenKey = APP.key(pageNow()); } catch (e2) { }
      scrollLater(force); chip(); return;
    }
    followScroll(force); chip();
  }
  /* 畫面重畫後：帶領者重新取樣；跟隨者看看是不是自己跑去別的畫面了 */
  function check() {
    if (C.role === 'host') { snap(); return; }
    if (C.role !== 'follow' || !C.want || C.want.off || !C.want.pg) return;
    var cur = pageNow(); if (cur === undefined) return;
    var k = APP.key(cur); if (C.seenKey === null) { C.seenKey = k; return; } if (k === C.seenKey) return; C.seenKey = k;
    if (k === APP.key(C.want.pg)) { if (C.free) { C.free = false; chip(); } return; }
    if (new Date().getTime() - C.navAt > 500) { C.free = true; chip(); }
  }
  function onChange() { clearTimeout(chT); chT = setTimeout(check, 150); }
  function backToLeader() { apply(null, true); }

  var tk = 0;
  setInterval(function () {
    tk++;
    if (C.role === 'host') { if (tk % 3 === 0) { var cs = live(); for (var i = 0; i < cs.length; i++) try { cs[i].send({ t: 'hb' }); } catch (e) { } } }
    else if (C.role === 'follow') {
      if (C.host && C.lastRx && new Date().getTime() - C.lastRx > 15000) { C.lastRx = 0; C.status = 'lost'; chip(); dial(); return; }
      /* 先前因為忙碌（開著對話框、正在打字）沒換成頁，現在補上 */
      if (C.want && !C.want.off && C.want.pg && !C.free && C.status === 'ok') { var cur = pageNow(); if (cur !== undefined && APP.key(cur) !== APP.key(C.want.pg)) apply(); }
    }
  }, 2000);
  window.addEventListener('pagehide', function () { if (C.role === 'host') { var cs = live(); for (var i = 0; i < cs.length; i++) try { cs[i].send({ t: 'hb' }); } catch (e) { } } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && C.role === 'follow' && C.status !== 'ok') dial(); if (!document.hidden && C.role === 'host' && C.peer && C.peer.disconnected) try { C.peer.reconnect(); } catch (e) { } });
  window.addEventListener('resize', function () { chip(); });

  /* ---------- 結束 ---------- */
  function teardown() { clearTimeout(C.rt); try { if (C.peer) C.peer.destroy(); } catch (e) { } C.peer = null; C.conns = []; C.host = null; C.want = null; C.free = false; C.paused = false; }
  function end() { var cs = live(); for (var i = 0; i < cs.length; i++) try { cs[i].send({ t: 'end' }); } catch (e) { } setTimeout(endNow, cs.length ? 300 : 0); }
  function endNow() { teardown(); C.role = ''; C.code = ''; C.last = null; ss(SSKEY, null); chip(); closeSheet(); say(X('ended')); }
  function leave(quiet) { teardown(); C.role = ''; C.code = ''; ss(SSKEY, null); chip(); closeSheet(); if (!quiet) say(X('ended')); }

  /* ---------- 畫面 ---------- */
  function chip() {
    var el = $('crchip'), tb = $('crTop'); if (tb) tb.className = tb.className.replace(/\s*cron/g, '') + (C.role ? ' cron' : '');
    if (!C.role) { if (el) el.parentNode.removeChild(el); return; }
    if (!el) { el = document.createElement('button'); el.id = 'crchip'; el.type = 'button'; el.className = 'crchip'; el.onclick = function () { if (C.role === 'follow' && (C.paused || C.free)) { backToLeader(); return; } sheet(); }; document.body.appendChild(el); }
    var t, cls = 'crchip';
    if (C.role === 'host') t = C.status === 'ok' ? X('hostChip', C.code, live().length) : X('connecting');
    else if (C.status !== 'ok') { t = C.status === 'lost' ? X('hostLeft') : X('connecting'); cls += ' wait'; }
    else if (C.paused || C.free) { t = X('paused'); cls += ' off'; }
    else if (C.want && C.want.off) { t = X('away'); cls += ' off'; }
    else t = X('following');
    el.className = cls; el.innerHTML = '<span class="dot"></span>📡 ' + E(t);
    try { var h = APP.top && APP.top(), b = h ? h.getBoundingClientRect().bottom : 60; el.style.top = Math.max(0, Math.round(b) + 6) + 'px'; } catch (e) { }
  }
  function qrInto(id, text) {
    loadJs(QR_JS, function () { return typeof window.qrcode === 'function'; }, function (ok) {
      var box = $(id); if (!box || !ok) { if (box) box.style.display = 'none'; return; }
      try { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); box.innerHTML = q.createImgTag(5, 10); } catch (e) { box.style.display = 'none'; }
    });
  }
  function paintCount() { var e = $('crcount'); if (e) { var n = live().length; e.textContent = n ? X('people', n) : X('waiting'); } }
  function closeSheet() { var m = $('crsheet'); if (m) { m.parentNode.removeChild(m); onChange(); } }
  function openSheet(h) {
    var m = $('crsheet'); if (!m) { m = document.createElement('div'); m.id = 'crsheet'; m.className = 'crmask'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.onclick = function (e) { if (e.target === m) closeSheet(); }; document.body.appendChild(m); }
    m.innerHTML = '<div class="crcard">' + h + '</div>'; return m;
  }
  function sheet() {
    var h = '<div class="crtt">📡 ' + E(X('title')) + '</div>';
    if (C.role === 'host') {
      var u = joinUrl(C.code);
      h += '<div class="crk">' + E(X('code')) + '</div><div class="crcode">' + E(C.code.slice(0, 3) + ' ' + C.code.slice(3)) + '</div>' +
        '<div class="crqr" id="crqr"></div><div class="crx crc">' + E(X('qrTip')) + '</div>' +
        '<div class="crcount" id="crcount"></div>' +
        '<div class="cracts"><button class="crbtn pri" type="button" data-act="crinvite">↗ ' + E(X('invite')) + '</button><button class="crbtn" type="button" data-act="crcopy">⧉ ' + E(X('copyLink')) + '</button></div>' +
        '<div style="margin-top:14px"><div class="crtt" style="font-size:1em;margin-bottom:2px">' + E(X('scrT')) + '</div><div class="crx">' + E(X('scrD')) + '</div><div class="cracts" style="margin-top:6px"><button class="crbtn blk" type="button" data-act="crscr">' + E(X('copyScr')) + '</button></div></div>' +
        '<div class="crx" style="margin-top:12px">' + E(X('tip')) + '</div>' +
        '<div class="cracts" style="margin-top:12px"><button class="crbtn" type="button" data-act="crend">■ ' + E(X('end')) + '</button><button class="crbtn" type="button" data-act="crclose">' + E(X('close')) + '</button></div>';
      openSheet(h); paintCount(); qrInto('crqr', u); return;
    }
    if (C.role === 'follow') {
      h += '<div class="crk">' + E(X('followOnly')) + '</div><div class="crcode">' + E(C.code.slice(0, 3) + ' ' + C.code.slice(3)) + '</div>' +
        '<div class="cracts"><button class="crbtn pri" type="button" data-act="crback">' + E(X('back2')) + '</button><button class="crbtn" type="button" data-act="crleave">' + E(X('leave')) + '</button></div>' +
        '<div class="cracts"><button class="crbtn" type="button" data-act="crclose">' + E(X('close')) + '</button></div>';
      openSheet(h); return;
    }
    h += '<div class="crx" style="margin-bottom:12px;font-size:.95em">' + E(X('desc')) + '</div>' +
      '<button class="crbtn pri blk" type="button" data-act="crhost">📡 ' + E(X('host')) + '</button>' +
      '<div class="crk" style="margin-top:16px">' + E(X('orJoin')) + '</div>' +
      '<div class="crjoin"><input id="crin" type="tel" inputmode="numeric" maxlength="7" autocomplete="off" placeholder="' + E(X('codePH')) + '"><button class="crbtn pri" type="button" data-act="crjoin">' + E(X('join')) + '</button></div>' +
      '<div class="cracts" style="margin-top:12px"><button class="crbtn" type="button" data-act="crclose">' + E(X('close')) + '</button></div>';
    openSheet(h); var inp = $('crin');
    if (inp) inp.onkeydown = function (e) { if (e.keyCode === 13) join(inp.value); };
  }
  document.addEventListener('click', function (e) {
    var n = e.target; while (n && n !== document && !(n.getAttribute && n.getAttribute('data-act') && /^cr/.test(n.getAttribute('data-act')))) n = n.parentNode; if (!n || n === document) return;
    var a = n.getAttribute('data-act');
    if (a === 'crhost') { closeSheet(); host(); }
    else if (a === 'crjoin') { var i = $('crin'); join(i ? i.value : ''); }
    else if (a === 'crinvite') { shareText(X('inviteMsg', joinUrl(C.code), C.code)); }
    else if (a === 'crcopy') { copyText(joinUrl(C.code), function () { say(X('copied')); }); }
    else if (a === 'crscr') { copyText(joinUrl(C.code, true), function () { say(X('copied')); }); }
    else if (a === 'crend') end();
    else if (a === 'crleave') leave();
    else if (a === 'crback') { closeSheet(); backToLeader(); }
    else if (a === 'crclose') closeSheet();
  }, false);

  window.CR = {
    on: function () { return !!C.role; },
    role: function () { return C.role; },
    sheet: sheet, join: join, host: host, end: end, leave: leave,
    label: function () { return X('btn'); },
    text: function (k) { return X(k); },
    changed: onChange
  };

  /* ---------- 接到 app ---------- */
  try { APP.mount(); } catch (e) { }
  try { APP.watch(onChange); } catch (e) { }
  chip();
  /* 邀請連結 ?join=碼（&screen=1 投影）；重新整理後回到原本的共讀 */
  (function () {
    var code = '', m = location.search.match(/[?&]join=([A-Za-z0-9]{6})/);
    if (m) code = m[1]; else { try { var o = JSON.parse(sessionStorage.getItem('cr_j') || 'null'); if (o && o.j && new Date().getTime() - o.t < 20000) code = o.j; } catch (e) { } }
    if (code) { try { history.replaceState(null, '', location.pathname + (location.hash || '')); } catch (e) { } setTimeout(function () { join(code); }, 600); return; }
    var keep = ss(SSKEY);
    if (keep && keep.c) setTimeout(function () { if (keep.r === 'host') host(keep.c, true); else join(keep.c); }, 600);
  })();
})();
