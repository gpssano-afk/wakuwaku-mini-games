"use strict";
// Increment VERSION when publishing changes to the precached game files.
const VERSION = "v6";
const ROOT = new URL("./", self.location.href);
// Include the scope so two apps hosted on one origin never delete each other's cache.
const PREFIX = `wakuwaku:${ROOT.pathname}:`;
const CACHE = PREFIX + VERSION;
const FILES = [
  "./", "index.html", "style.css", "app.js", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png",
  "games/hitofude/index.html", "games/hitofude/difficulty.html", "games/hitofude/style.css",
  "games/hitofude/game.js", "games/hitofude/stages.js",
  "games/block-fit/index.html", "games/block-fit/difficulty.html", "games/block-fit/style.css",
  "games/block-fit/game.js", "games/block-fit/generator.js",
].map(path => new URL(path, ROOT).href);

self.addEventListener("install", event => {
  // Refresh the HTTP cache too, so a new version never precaches stale assets.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    FILES.map(url => new Request(url, { cache: "reload" })),
  )).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)),
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  // Normalize queries and directory URLs while preserving separate game routes.
  url.search = "";
  url.hash = "";
  if (url.pathname.endsWith("/")) url.pathname += "index.html";
  if (!FILES.includes(url.href)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url.href);
    return cached || fetch(event.request);
  }));
});
