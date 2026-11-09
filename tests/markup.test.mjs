// Tests for the result markup in index.html: "Ver valores" is a real button,
// tells assistive technology whether it is open, and starts collapsed.
// Node only, no browser: the template is read as text.
//
// Run: node --test tests/*.test.mjs

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {describe, test} from 'node:test';

const ROOT = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

async function valuesTemplate() {
	const match = /<template id="values-template">([\s\S]*?)<\/template>/.exec(await read('index.html'));

	assert.ok(match, 'index.html has no values-template');

	return match[1];
}

describe('Ver valores', () => {
	test('is a button that starts collapsed', async () => {
		const markup = await valuesTemplate();
		const button = /<button\b([^>]*)>([^<]*)<\/button>/.exec(markup);

		assert.ok(button, 'the template has no button');
		assert.match(button[1], /\btype="button"/);
		assert.match(button[1], /\baria-expanded="false"/);
		assert.equal(button[2].trim(), 'Ver valores');
	});

	test('its panel starts hidden', async () => {
		const panel = /<div class="values-panel"([^>]*)>/.exec(await valuesTemplate());

		assert.ok(panel, 'the template has no values-panel');
		assert.match(panel[1], /\bhidden\b/);
	});

	test('the app links the button to its panel and opens nothing on load', async () => {
		const app = await read('app.js');

		assert.match(app, /setAttribute\('aria-controls', panel\.id\)/);
		assert.match(app, /const openValues = new Set\(\);/);
	});

	test('the tap target is at least 2.75rem (44 px) tall', async () => {
		const rule = /\.values-toggle \{([^}]*)\}/.exec(await read('style.css'));

		assert.ok(rule, 'style.css has no .values-toggle rule');
		assert.match(rule[1], /min-height: 2\.75rem;/);
	});
});
