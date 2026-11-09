// Tests for number parsing, unit conversion, and pt-BR formatting
// (js/units.js). Node only, no browser and no network.
//
// Run: node --test tests/*.test.mjs

import assert from 'node:assert/strict';
import {describe, test} from 'node:test';

import {baseQuantity, formatMoney, formatPercent, formatQuantity, formatUnitPrice, parseNumber, priceUnitLabel} from '../js/units.js';

describe('parseNumber', () => {
	test('reads a decimal comma and a decimal dot', () => {
		assert.equal(parseNumber('12,99'), 12.99);
		assert.equal(parseNumber('12.99'), 12.99);
	});

	test('reads thousands with either mark', () => {
		assert.equal(parseNumber('1.299,90'), 1299.9);
		assert.equal(parseNumber('1,299.90'), 1299.9);
		assert.equal(parseNumber('1.299.000'), 1299000);
	});

	test('reads a single dot as decimal', () => {
		assert.equal(parseNumber('1.5'), 1.5);
		assert.equal(parseNumber('0.500'), 0.5);
	});

	test('ignores R$ and spaces, and a bare leading or trailing mark', () => {
		assert.equal(parseNumber(' R$ 7 '), 7);
		assert.equal(parseNumber('r$12,99'), 12.99);
		assert.equal(parseNumber(',5'), 0.5);
		assert.equal(parseNumber('5,'), 5);
	});

	test('passes a number through', () => {
		assert.equal(parseNumber(3), 3);
		assert.equal(parseNumber(-3), null);
	});

	test('rejects what is not a number', () => {
		for (const text of ['', '   ', 'abc', '12,99,1', '1.29,90', '1,2,3.4', '-5', '1.2.3,4', ',', null, undefined]) {
			assert.equal(parseNumber(text), null, String(text));
		}
	});
});

describe('baseQuantity', () => {
	test('converts g to kg and ml to L', () => {
		assert.equal(baseQuantity(1, 500, 'g'), 0.5);
		assert.equal(baseQuantity(1, 2, 'kg'), 2);
		assert.ok(Math.abs(baseQuantity(1, 350, 'ml') - 0.35) < 1e-12);
		assert.equal(baseQuantity(1, 1.5, 'L'), 1.5);
	});

	test('multiplies the pack', () => {
		assert.equal(baseQuantity(12, 30, 'm'), 360);
		assert.ok(Math.abs(baseQuantity(6, 200, 'ml') - 1.2) < 1e-12);
		assert.equal(baseQuantity(2, 60, 'folhas'), 120);
		assert.equal(baseQuantity(30, 1, 'un'), 30);
	});
});

describe('formatting', () => {
	test('money has two decimals from R$ 1 up', () => {
		assert.equal(formatMoney(21.9), 'R$ 21,90');
		assert.equal(formatMoney(1299.9), 'R$ 1.299,90');
		assert.equal(formatMoney(1), 'R$ 1,00');
	});

	test('money below R$ 1 keeps three significant digits', () => {
		assert.equal(formatMoney(21.9 / 360), 'R$ 0,0608');
		assert.equal(formatMoney(22.5 / 320), 'R$ 0,0703');
		assert.equal(formatMoney(0.5), 'R$ 0,50');
		assert.equal(formatMoney(0.061), 'R$ 0,061');
		assert.equal(formatMoney(0.00948), 'R$ 0,00948');
		assert.notEqual(formatMoney(0.004), 'R$ 0,00');
	});

	test('unit prices name their unit', () => {
		assert.equal(formatUnitPrice(12.5, 'mass'), 'R$ 12,50/kg');
		assert.equal(formatUnitPrice(2.35, 'sheets'), 'R$ 2,35/100 folhas');
		assert.equal(priceUnitLabel('volume'), 'R$/L');
		assert.equal(priceUnitLabel('count'), 'R$/un');
		assert.equal(priceUnitLabel('length'), 'R$/m');
	});

	test('quantities and percents', () => {
		assert.equal(formatQuantity(1.2), '1,2');
		assert.equal(formatQuantity(1200), '1.200');
		assert.equal(formatPercent(13.48), '13%');
		assert.equal(formatPercent(2.34), '2,3%');
		assert.equal(formatPercent(4), '4%');
	});
});
