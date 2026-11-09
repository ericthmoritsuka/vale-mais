// Tests for keeping the comparison (js/storage.js): a round trip, a damaged
// save, and storage that throws. Node only, no browser.
//
// Run: node --test tests/*.test.mjs

import assert from 'node:assert/strict';
import {describe, test} from 'node:test';

import {MAX_PRODUCTS, blankProduct, clearProducts, loadProducts, saveProducts} from '../js/storage.js';

function memoryStorage() {
	const data = new Map();

	return {
		getItem: (key) => (data.has(key) ? data.get(key) : null),
		removeItem: (key) => data.delete(key),
		setItem: (key, value) => data.set(key, String(value)),
	};
}

const BROKEN = {
	getItem() {
		throw new Error('blocked');
	},
	removeItem() {
		throw new Error('blocked');
	},
	setItem() {
		throw new Error('blocked');
	},
};

describe('storage', () => {
	test('saves and loads the products, then clears them', () => {
		const storage = memoryStorage();
		const products = [{...blankProduct('m'), price: '21,90'}, blankProduct()];

		assert.equal(saveProducts(products, storage), true);
		assert.deepEqual(loadProducts(storage), products);
		clearProducts(storage);
		assert.equal(loadProducts(storage), null);
	});

	test('keeps only known string fields, and at most six products', () => {
		const storage = memoryStorage();

		storage.setItem('vale-mais-comparar', JSON.stringify({products: Array.from({length: 9}, () => ({evil: '<b>', price: 5, size: '3'}))}));

		const loaded = loadProducts(storage);

		assert.equal(loaded.length, MAX_PRODUCTS);
		assert.deepEqual(loaded[0], {...blankProduct(), size: '3'});
	});

	test('a damaged save or a blocked storage gives null, never an error', () => {
		const storage = memoryStorage();

		storage.setItem('vale-mais-comparar', '{not json');
		assert.equal(loadProducts(storage), null);
		assert.equal(loadProducts(BROKEN), null);
		assert.equal(saveProducts([], BROKEN), false);
		assert.doesNotThrow(() => clearProducts(BROKEN));
		assert.equal(loadProducts(undefined), null);
	});
});
