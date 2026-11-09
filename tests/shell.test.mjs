// Tests for the app shell: the service worker caches every file the app
// loads and nothing that is missing, it has a VERSION, and the manifest's
// icons exist. Node only, no browser.
//
// Run: node --test tests/*.test.mjs

import assert from 'node:assert/strict';
import {access, readFile, readdir} from 'node:fs/promises';
import {describe, test} from 'node:test';

const ROOT = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

async function shellList() {
	const source = await read('sw.js');
	const block = /const SHELL = \[([\s\S]*?)\];/.exec(source)[1];

	return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

describe('app shell', () => {
	test('sw.js has a VERSION', async () => {
		assert.match(await read('sw.js'), /^const VERSION = 'v\d+';$/m);
	});

	test('every shell file exists', async () => {
		for (const path of (await shellList()).filter((path) => path !== './')) {
			await access(new URL(path, ROOT));
		}
	});

	test('every script, stylesheet, and icon is in the shell', async () => {
		const shell = new Set(await shellList());
		const files = [
			'index.html',
			'app.js',
			'style.css',
			'manifest.webmanifest',
			...(await readdir(new URL('js/', ROOT))).filter((name) => name.endsWith('.js')).map((name) => `js/${name}`),
			...(await readdir(new URL('icons/', ROOT))).map((name) => `icons/${name}`),
		];

		for (const file of files) {
			assert.ok(shell.has(file), `${file} is not in the SHELL list in sw.js`);
		}
	});

	test('the manifest icons exist', async () => {
		const manifest = JSON.parse(await read('manifest.webmanifest'));

		assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));

		for (const icon of manifest.icons) {
			await access(new URL(icon.src, ROOT));
		}
	});

	test('no em dash anywhere in the app', async () => {
		const emDash = String.fromCharCode(0x2014);
		const files = ['index.html', 'app.js', 'style.css', 'sw.js', 'manifest.webmanifest', 'README.md', 'CHANGELOG.md', 'js/compare.js', 'js/money.js', 'js/storage.js', 'js/units.js'];

		for (const file of files) {
			assert.ok(!(await read(file)).includes(emDash), `${file} has an em dash`);
		}
	});
});
