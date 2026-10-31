
/* =====================================================
   QUIZ MASTER 🇷🇼
   Service Worker
   Version: 2.1.0
===================================================== */

"use strict";

const CACHE_VERSION = "quizmaster-v2.1.0";

const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const OFFLINE_PAGE = "./offline.html";

const STATIC_FILES = [
  "./",
  "./index.html",
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",
  "./premium.html",
  "./referral.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512-3.png"
];

const DATA_FILES = [
  "./questions.js",
  "./questions.json",
  "./payment.js",
  "./referral.js"
];

/* INSTALL */

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await cache.addAll(STATIC_FILES);

      await self.skipWaiting();
    })()
  );
});

/* ACTIVATE */

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith("quizmaster-") &&
            ![
              STATIC_CACHE,
              PAGE_CACHE,
              DATA_CACHE
            ].includes(name)
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clients) {
        client.postMessage({
          type: "QUIZMASTER_UPDATED",
          version: CACHE_VERSION
        });
      }
    })()
  );
});

/* FETCH */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  /* API requests: always use network */

  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/payment")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  /* Questions and JavaScript: network first */

  if (
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  /* HTML pages: network first */

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  /* Images, icons, CSS and other assets: cache first */

  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

/* NETWORK FIRST */

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;

  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      const offline = await caches.match(OFFLINE_PAGE);

      if (offline) {
        return offline;
      }

      return new Response(
        "Internet ntiboneka. Ongera ugerageze.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        }
      );
    }

    return new Response(
      "Internet ntiboneka.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

/* CACHE FIRST */

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;

  } catch (error) {
    return new Response(
      "File ntibonetse. Ongera ugerageze.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

/* MESSAGE */

self.addEventListener("message", event => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_QUIZMASTER_CACHE") {
    event.waitUntil(
      caches.keys().then(names =>
        Promise.all(
          names
            .filter(name => name.startsWith("quizmaster-"))
            .map(name => caches.delete(name))
        )
      )
    );
  }
});
