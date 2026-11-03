
/* =========================================================
   🇷🇼 QUIZ MASTER — SERVICE WORKER
   Version: 3.3.3

   FEATURES:
   - Progressive Web App support
   - Offline homepage and offline fallback
   - HTML navigation: Network First
   - Quiz and article data: Network First
   - Static resources: Cache First
   - Automatic cache version updates
   - Safe removal of old Quiz Master caches
   - Service Worker messaging
   ========================================================= */

"use strict";

/* =========================================================
   1. CACHE CONFIGURATION
========================================================= */

const CACHE_VERSION = "3.3.3";

const CACHE_PREFIX = "quizmaster-cache-";

const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",

  // Quiz engine and questions
  "./questions.js",
  "./questions.json",

  // Learning Centre
  "./articles.html",
  "./articles.json",

  // Information pages
  "./about.html",
  "./contact.html",
  "./privacy-policy.html",
  "./terms.html",

  // PWA resources
  "./manifest.webmanifest",
  "./icon-192-4.png",
  "./icon-512-3.png"
];

/*
  Data files should prefer the network so that
  updated questions and articles can be retrieved.

  Previously cached data remains available offline.
*/

const NETWORK_FIRST_FILES = [
  "questions.json",
  "articles.json"
];

/*
  Use the Service Worker's actual registration scope.
  This supports deployment from the website root.
*/

const SCOPE_URL = self.registration.scope;

const HOME_URL = new URL("./index.html", SCOPE_URL).href;

const OFFLINE_URL = new URL("./offline.html", SCOPE_URL).href;


/* =========================================================
   2. HELPER FUNCTIONS
========================================================= */

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}


function isCacheableResponse(response) {
  return (
    response &&
    response.status === 200 &&
    response.type === "basic"
  );
}


function isExcludedRequest(request, url) {
  // Only handle normal GET requests.
  if (request.method !== "GET") {
    return true;
  }

  // Do not handle cross-origin resources.
  if (!isSameOrigin(url)) {
    return true;
  }

  // Do not cache API requests.
  if (url.pathname.includes("/api/")) {
    return true;
  }

  // Ignore Vercel internal routes.
  if (url.pathname.includes("/_vercel/")) {
    return true;
  }

  // Do not interfere with media range requests.
  if (request.headers.has("range")) {
    return true;
  }

  return false;
}


async function saveToCache(cache, request, response) {
  if (!isCacheableResponse(response)) {
    return;
  }

  try {
    await cache.put(
      request,
      response.clone()
    );
  } catch (error) {
    console.warn(
      "Quiz Master could not cache a resource:",
      error
    );
  }
}


async function cacheAppResource(cache, resource) {
  const resourceURL = new URL(
    resource,
    SCOPE_URL
  );

  try {
    const response = await fetch(
      resourceURL.href,
      {
        cache: "reload"
      }
    );

    if (isCacheableResponse(response)) {
      await cache.put(
        resourceURL.href,
        response.clone()
      );

      return true;
    }

    console.warn(
      "Quiz Master resource was not cached:",
      resource
    );

    return false;

  } catch (error) {
    console.warn(
      "Quiz Master could not download:",
      resource,
      error
    );

    return false;
  }
}


async function getOfflineResponse() {
  const cache = await caches.open(CACHE_NAME);

  const offlinePage = await cache.match(
    OFFLINE_URL
  );

  if (offlinePage) {
    return offlinePage;
  }

  return new Response(
    "You are offline. Please reconnect to the internet and try again.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}


function isNetworkFirstFile(url) {
  return NETWORK_FIRST_FILES.some((file) =>
    url.pathname.endsWith("/" + file)
  );
}


/* =========================================================
   3. INSTALL EVENT
========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      /*
        Cache each resource separately.

        This prevents one missing optional resource
        from cancelling the entire installation.
      */

      const results = await Promise.all(
        APP_SHELL.map((resource) =>
          cacheAppResource(cache, resource)
        )
      );

      const homeCached = await cache.match(HOME_URL);

      const offlineCached = await cache.match(OFFLINE_URL);

      /*
        The homepage and offline page are essential.
        If either cannot be cached, installation fails
        so that an incomplete worker is not activated.
      */

      if (!homeCached || !offlineCached) {
        throw new Error(
          "Quiz Master could not cache its essential homepage or offline page."
        );
      }

      console.info(
        "Quiz Master Service Worker installed:",
        CACHE_VERSION
      );

      console.info(
        "Successfully cached resources:",
        results.filter(Boolean).length,
        "of",
        APP_SHELL.length
      );

      // Activate the new worker without waiting
      // for all existing tabs to close.
      await self.skipWaiting();
    })()
  );
});


/* =========================================================
   4. ACTIVATE EVENT
========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      /*
        Delete only old Quiz Master caches.
        Other applications' caches are preserved.
      */

      await Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith(CACHE_PREFIX) &&
            name !== CACHE_NAME
          )
          .map((name) =>
            caches.delete(name)
          )
      );

      // Take control of open pages.
      await self.clients.claim();

      console.info(
        "Quiz Master Service Worker activated:",
        CACHE_VERSION
      );
    })()
  );
});


/* =========================================================
   5. NETWORK-FIRST NAVIGATION
========================================================= */

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    /*
      Try the network first so visitors receive
      the latest available HTML pages.
    */

    const response = await fetch(request);

    if (isCacheableResponse(response)) {
      await saveToCache(
        cache,
        request,
        response
      );
    }

    return response;

  } catch (error) {
    /*
      If the network fails, try the exact page.
    */

    const cachedPage = await cache.match(request);

    if (cachedPage) {
      return cachedPage;
    }

    /*
      Try the homepage for the root URL.
    */

    const requestedURL = new URL(request.url);

    if (
      requestedURL.pathname ===
      new URL(SCOPE_URL).pathname
    ) {
      const homePage = await cache.match(HOME_URL);

      if (homePage) {
        return homePage;
      }
    }

    /*
      If the requested page is unavailable,
      show the offline page instead of displaying
      an unrelated homepage.
    */

    return getOfflineResponse();
  }
}


/* =========================================================
   6. NETWORK-FIRST DATA FILES
========================================================= */

async function handleNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (isCacheableResponse(response)) {
      await saveToCache(
        cache,
        request,
        response
      );
    }

    return response;

  } catch (error) {
    /*
      Return previously cached questions or articles
      when the network is unavailable.
    */

    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: "This content is not available offline yet."
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}


/* =========================================================
   7. CACHE-FIRST STATIC RESOURCES
========================================================= */

async function handleStaticResource(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  /*
    If the resource is not cached, try the network.
  */

  try {
    const response = await fetch(request);

    if (isCacheableResponse(response)) {
      await saveToCache(
        cache,
        request,
        response
      );
    }

    return response;

  } catch (error) {
    return new Response(
      "This resource is currently unavailable offline.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}


/* =========================================================
   8. FETCH EVENT
========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  let url;

  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  /*
    Ignore requests that the Service Worker
    should not control.
  */

  if (isExcludedRequest(request, url)) {
    return;
  }

  /*
    HTML page navigation:
    Network First, then cached page, then offline page.
  */

  if (request.mode === "navigate") {
    event.respondWith(
      handleNavigation(request)
    );

    return;
  }

  /*
    Quiz questions and Learning Centre articles:
    Network First, then cached data.
  */

  if (isNetworkFirstFile(url)) {
    event.respondWith(
      handleNetworkFirst(request)
    );

    return;
  }

  /*
    Other static resources:
    Cache First, then network.
  */

  event.respondWith(
    handleStaticResource(request)
  );
});


/* =========================================================
   9. MESSAGE EVENT
========================================================= */

self.addEventListener("message", (event) => {
  if (
    !event.data ||
    typeof event.data.type !== "string"
  ) {
    return;
  }

  /*
    Allow the page to activate a waiting worker.
  */

  if (event.data.type === "SKIP_WAITING") {
    event.waitUntil(
      self.skipWaiting()
    );

    return;
  }

  /*
    Return the current worker version to the page.
  */

  if (event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        version: CACHE_VERSION,
        cacheName: CACHE_NAME
      });
    }

    return;
  }

  /*
    Allow the page to request cache information.
  */

  if (event.data.type === "GET_CACHE_INFO") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        const keys = await cache.keys();

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            version: CACHE_VERSION,
            cacheName: CACHE_NAME,
            cachedResources: keys.length
          });
        }
      })()
    );
  }
});


/* =========================================================
   10. END
========================================================= */
