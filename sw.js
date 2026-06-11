const CACHE = 'gym-v7';

// App shell + external libraries needed to boot the app offline
const CORE = [
  '/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// All bundled exercise animation GIFs — precached so guides work fully offline
const GIFS = ['/exercises/ab-wheel-rollout.gif','/exercises/barbell-back-squat.gif','/exercises/barbell-bench-press.gif','/exercises/barbell-curl.gif','/exercises/barbell-deadlift.gif','/exercises/battle-rope.gif','/exercises/burpees.gif','/exercises/cable-chest-fly.gif','/exercises/cable-crunch.gif','/exercises/db-thrusters.gif','/exercises/decline-situps.gif','/exercises/elliptical-machine.gif','/exercises/face-pulls.gif','/exercises/hammer-curl.gif','/exercises/hanging-knee-raises.gif','/exercises/high-plank.gif','/exercises/incline-dumbbell-press.gif','/exercises/lateral-raises.gif','/exercises/lat-pulldown.gif','/exercises/leg-curl-machine.gif','/exercises/leg-press-machine.gif','/exercises/mountain-climbers.gif','/exercises/overhead-db-tricep-ext.gif','/exercises/plank-hold.gif','/exercises/romanian-deadlift-db.gif','/exercises/russian-twists.gif','/exercises/seated-cable-row.gif','/exercises/seated-db-shoulder-press.gif','/exercises/single-arm-db-row.gif','/exercises/standing-calf-raises.gif','/exercises/stationary-bike.gif','/exercises/treadmill.gif','/exercises/tricep-rope-pushdown.gif','/exercises/walking-lunges.gif'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Cache each asset individually so one failure doesn't abort the whole install
      Promise.all([...CORE, ...GIFS].map(url =>
        c.add(new Request(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => {})
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Always let Supabase API / auth traffic hit the network (live data, never cache)
  if (url.hostname.endsWith('supabase.co')) return;

  // HTML navigations: network-first so the app stays fresh, fall back to cache offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Everything else (GIFs, scripts, fonts, icons): cache-first, then network, and store for next time
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached || new Response('', { status: 408 }));
    })
  );
});
