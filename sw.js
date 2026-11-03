/* 321 親子同行 Service Worker —— 自動更新版（網路優先）
   ‧ 每次發佈 VER 都不同 → 瀏覽器發現 sw.js 位元組改變就安裝新 SW（register 用 updateViaCache:'none'）
   ‧ install：skipWaiting；預載用 cache:'reload' 繞過 GitHub Pages 約 10 分鐘的 HTTP 快取
   ‧ activate：只刪自己前綴（par321-）的舊快取——同一個 github.io 網域還有其他 321 App，共用 Cache Storage 不可全刪；
     clients.claim，通知所有頁面；背景中的舊頁面直接帶到新版
   ‧ fetch：HTML／JS／JSON／CSS 網路優先（no-cache），離線才用快取；圖片等快取優先；
     version.json 永遠 no-store；影音與 Range 請求不攔截；範圍外（其他 App）與跨網域不碰 */
var VER = 'v6-up1103-xz1103';
var PFX = 'par321-';
var V = PFX + VER;
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./coread.js?v=4", "./peerjs.min.js?v=4", "./gxr.js?v=gx1103", "./xz2.js?v=xz1103", "./gxa.js?v=gx1103-xz1103", "./upd321.js"];
var HOME = 'index.html';

function mine(k) { return k.indexOf(PFX) === 0 || k.indexOf("sap-cache-v5-gx1103") === 0; }
function keyOf(href) {
  var u = new URL(href, self.location);
  var p = u.pathname; if (/\/$/.test(p)) p += HOME;
  return u.origin + p;
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(keyOf(u), r); })['catch'](function () { });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return mine(k) && k !== V; }).map(function (k) { return caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  }).then(function (cs) {
    cs.forEach(function (c) {
      try { c.postMessage({ t: 'sw-updated', v: VER }); } catch (x) { }
      if (c.visibilityState === 'hidden' && c.navigate) { try { c.navigate(c.url); } catch (x) { } }
    });
  }));
});

self.addEventListener('message', function (e) {
  if (e.data === 'skip' || e.data === 'SKIP_WAITING' || (e.data && (e.data.type === 'SKIP_WAITING' || e.data.type === 'skip-waiting'))) self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u; try { u = new URL(r.url); } catch (x) { return; }
  if (u.origin !== self.location.origin) return;
  var p = u.pathname;
  var scope = new URL('./', self.location).pathname;
  if (p.indexOf(scope) !== 0) return;
  if (/\.(mp3|m4a|aac|wav|ogg|opus|mp4|mov|webm)$/i.test(p) || r.headers.get('range')) return;

  if (/version\.json$/.test(p)) {
    e.respondWith(fetch(u.origin + p + '?t=' + Date.now(), { cache: 'no-store' })['catch'](function () {
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  var nav = r.mode === 'navigate' || /\.html$/.test(p) || /\/$/.test(p);
  if (nav || /\.(json|js|css|webmanifest)$/.test(p)) {
    var key = keyOf(u.href);
    e.respondWith(fetch(u.origin + p + u.search, { cache: 'no-cache', credentials: 'same-origin' }).then(function (resp) {
      if (resp && resp.ok) { var cp = resp.clone(); caches.open(V).then(function (c) { c.put(key, cp); }); }
      return resp;
    })['catch'](function () {
      return caches.match(key).then(function (h) {
        if (h) return h;
        return caches.match(r, { ignoreSearch: true }).then(function (h2) {
          return h2 || (nav ? caches.match(u.origin + scope + HOME) : undefined);
        });
      });
    }));
    return;
  }

  e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (h) {
    return h || fetch(r).then(function (resp) {
      if (resp && resp.ok) { var cp = resp.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
      return resp;
    });
  }));
});

