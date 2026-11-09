// Tests for cash-register price entry (js/money.js): digits fill from the
// right with two implied decimals, backspace, the cap, paste, and prices
// saved by v1. Node only, no browser.
//
// Run: node --test tests/*.test.mjs

import assert from 'node:assert/strict';
import {describe, test} from 'node:test';

import {centsDigits, formatDigits, pastedPrice, storedPrice, typedPrice} from '../js/money.js';
import {parseNumber} from '../js/units.js';

describe('typing', () => {
	test('digits fill from the right with two decimals', () => {
		assert.equal(typedPrice(''), '');
		assert.equal(typedPrice('8'), '0,08');
		assert.equal(typedPrice('89'), '0,89');
		assert.equal(typedPrice('089'), '0,89');
		assert.equal(typedPrice('324'), '3,24');
		assert.equal(typedPrice('1299'), '12,99');
		assert.equal(typedPrice('129990'), '1.299,90');
	});

	test('a digit typed after the shown value pushes it left', () => {
		assert.equal(typedPrice('0,0'), '');
		assert.equal(typedPrice('0,08' + '9'), '0,89');
		assert.equal(typedPrice('0,89' + '4'), '8,94');
		assert.equal(typedPrice('12,99' + '0'), '129,90');
		assert.equal(typedPrice('129,90' + '0'), '1.299,00');
	});

	test('a comma, a dot, or a minus typed is ignored', () => {
		assert.equal(typedPrice('3,24,'), '3,24');
		assert.equal(typedPrice('3,24.'), '3,24');
		assert.equal(typedPrice('-3,24'), '3,24');
	});

	test('backspace drops the last digit, and clearing every digit leaves the field empty', () => {
		assert.equal(typedPrice('3,2'), '0,32');
		assert.equal(typedPrice('0,3'), '0,03');
		assert.equal(typedPrice('0,0'), '');
		assert.equal(typedPrice('0,'), '');
	});

	test('stops at 8 digits, R$ 999.999,99', () => {
		assert.equal(typedPrice('99999999'), '999.999,99');
		assert.equal(typedPrice('999.999,99' + '1'), '999.999,99');
		assert.equal(centsDigits('123456789'), '12345678');
	});

	test('what the field shows reads back as the same price', () => {
		for (const digits of ['8', '89', '324', '1299', '129990', '99999999']) {
			assert.equal(parseNumber(formatDigits(digits)), Number(digits) / 100);
		}
	});
});

describe('pasting', () => {
	test('a comma or dot with one or two digits at the end is a decimal', () => {
		assert.equal(pastedPrice('12,99'), '12,99');
		assert.equal(pastedPrice('12.9'), '12,90');
		assert.equal(pastedPrice('R$ 1.299,90'), '1.299,90');
		assert.equal(pastedPrice(' 0,5 '), '0,50');
	});

	test('anything else is digits typed', () => {
		assert.equal(pastedPrice('5'), '0,05');
		assert.equal(pastedPrice('324'), '3,24');
		assert.equal(pastedPrice('1.299'), '12,99');
		assert.equal(pastedPrice('abc'), '');
	});
});

describe('prices saved by v1', () => {
	test('load as the same price', () => {
		assert.equal(storedPrice('21,90'), '21,90');
		assert.equal(storedPrice('22.50'), '22,50');
		assert.equal(storedPrice('7'), '7,00');
		assert.equal(storedPrice('1.299,90'), '1.299,90');
		assert.equal(storedPrice('0,061'), '0,06');
	});

	test('a v2 value loads unchanged, and a blank or broken one is empty', () => {
		assert.equal(storedPrice('0,89'), '0,89');
		assert.equal(storedPrice(''), '');
		assert.equal(storedPrice('abc'), '');
	});
});
