// Service worker: caches the app shell so Vale Mais opens with no signal,
// which is common inside a supermarket.
//
// To ship a change to any shell file, bump VERSION. The browser sees that
// sw.js changed, installs the new cache, and waits until the person taps
// Atualizar (app.js); then the old cache is deleted.

const VERSION = 'v1';
const PREFIX = 'vale-mais-shell-';
const CACHE = PREFIX + VERSION;

// Every file the app needs, relative to the worker's scope
// (tests/shell.test.mjs checks that this list matches the files).
const SHELL = [
	'./',
	'index.html',
	'app.js',
	'style.css',
	'manifest.webmanifest',
	'js/compare.js',
	'js/money.js',
	'js/storage.js',
	'js/units.js',
	'icons/apple-touch-icon.png',
	'icons/icon-192.png',
	'icons/icon-512.png',
	'icons/icon-maskable-512.png',
];

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);

			// cache: 'reload' skips the HTTP cache, so a new version never
			// precaches a stale copy of a file.
			await cache.addAll(SHELL.map((path) => new Request(scopeUrl(path), {cache: 'reload'})));
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data === 'skip-waiting') {
		self.skipWaiting();
	}
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();

			await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
			await self.clients.claim();
		})()
	);
});

// Cache first for the shell; anything else goes to the network.
self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) {
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				const shell = await caches.match(scopeUrl('index.html'), {cacheName: CACHE});

				return shell || fetch(request);
			})()
		);

		return;
	}

	event.respondWith(
		(async () => {
			const cached = await caches.match(request, {cacheName: CACHE, ignoreSearch: true});

			return cached || fetch(request);
		})()
	);
});
