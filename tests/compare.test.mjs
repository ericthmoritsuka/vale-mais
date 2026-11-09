// Tests for the comparison (js/compare.js): unit prices, price kinds,
// ranking, ties, incompatible units, different tipos, and the tag check.
// Node only, no browser and no network.
//
// Run: node --test tests/*.test.mjs

import assert from 'node:assert/strict';
import {describe, test} from 'node:test';

import {compare, displayName, evaluate, tagCheck, tipoWarning} from '../js/compare.js';

const near = (actual, expected, places = 6) => assert.ok(Math.abs(actual - expected) < 10 ** -places, `${actual} is not ${expected}`);

// DESIGN.md section 6.
const PAPEL_A = {kind: 'normal', name: 'Papel A', pack: '12', price: '21,90', size: '30', tipo: 'folha dupla', unit: 'm'};
const PAPEL_B = {kind: 'normal', name: 'Papel B', pack: '16', price: '22,50', size: '20', tipo: 'Folha Dupla ', unit: 'm'};

describe('evaluate', () => {
	test('multiplies the pack: 12 rolos × 30 m is 360 m', () => {
		const a = evaluate(PAPEL_A);

		assert.equal(a.complete, true);
		assert.equal(a.quantity, 360);
		assert.equal(a.totalText, '12 × 30 m = 360 m');
		near(a.unitPrice, 21.9 / 360);
	});

	test('a blank pack counts as 1', () => {
		const item = evaluate({price: '8,99', size: '500', unit: 'g'});

		assert.equal(item.complete, true);
		assert.equal(item.totalText, '500 g = 0,5 kg');
		near(item.unitPrice, 17.98);
	});

	test('normalizes ml to L and prices sheets per 100', () => {
		near(evaluate({pack: '6', price: '12', size: '200', unit: 'ml'}).unitPrice, 10);
		near(evaluate({pack: '2', price: '6', size: '60', unit: 'folhas'}).unitPrice, 5);
	});

	test('names what is missing', () => {
		const item = evaluate({name: 'X', price: '', size: '0', unit: 'g'});

		assert.equal(item.complete, false);
		assert.deepEqual(item.missing, ['preço', 'tamanho']);
	});

	test('Leve 3 Pague 2 uses price × 2 ÷ 3 and says so', () => {
		const item = evaluate({kind: 'leve', leveX: '3', pagueY: '2', price: '12,99', size: '1', unit: 'L'});

		assert.equal(item.complete, true);
		near(item.effectivePrice, 8.66);
		near(item.unitPrice, 8.66);
		near(item.nominalUnitPrice, 12.99);
		assert.match(item.notes[0], /^Leve 3 Pague 2: a conta usa R\$ 8,66 cada \(R\$ 12,99 × 2 ÷ 3\), levando 3\.$/);
	});

	test('Leve X Pague Y needs X greater than Y', () => {
		assert.equal(evaluate({kind: 'leve', leveX: '2', pagueY: '3', price: '5', size: '1', unit: 'un'}).complete, false);
		assert.equal(evaluate({kind: 'leve', leveX: '', pagueY: '', price: '5', size: '1', unit: 'un'}).complete, false);
	});

	test('atacarejo keeps the price and states the minimum', () => {
		const item = evaluate({kind: 'atacarejo', minQty: '6', price: '9,99', size: '1', unit: 'kg'});

		near(item.unitPrice, 9.99);
		assert.equal(item.minQty, 6);
		assert.equal(item.notes[0], 'Atacarejo: só vale levando 6 ou mais.');
	});

	test('clube keeps the price and labels it', () => {
		const item = evaluate({kind: 'clube', price: '10,99', size: '1', unit: 'kg'});

		near(item.unitPrice, 10.99);
		assert.equal(item.kindLabel, 'Clube/app');
	});
});

describe('compare', () => {
	test('the toilet paper example: A about 13% cheaper per meter', () => {
		const result = compare([PAPEL_A, PAPEL_B]);
		const [group] = result.groups;

		assert.equal(result.groups.length, 1);
		assert.deepEqual(group.winners, [0]);
		assert.equal(group.headline, 'Papel A sai 13% mais barato por metro.');
		assert.equal(group.detail, 'R$ 0,00948 a menos por metro que Papel B.');
		near(group.rows[1].diffPercent, 13.48, 2);
		assert.equal(group.tipoWarning, null, 'folha dupla and "Folha Dupla " are the same tipo');
	});

	test('ranks three or more products', () => {
		const result = compare([
			{price: '10', size: '1', unit: 'kg'},
			{price: '4', size: '500', unit: 'g'},
			{price: '12', size: '1', unit: 'kg'},
		]);
		const rows = result.groups[0].rows;

		assert.deepEqual(rows.map((row) => [row.rank, row.name]), [[1, 'Produto B'], [2, 'Produto A'], [3, 'Produto C']]);
		assert.equal(result.groups[0].headline, 'Produto B sai 20% mais barato por quilo.');
		assert.equal(rows[2].text, 'O 1º sai 33% mais barato (R$ 4,00 a menos por quilo).');
	});

	test('within 0.5% is praticamente igual', () => {
		const tie = compare([{price: '10,00', size: '1', unit: 'kg'}, {price: '10,04', size: '1', unit: 'kg'}]);

		assert.match(tie.groups[0].headline, /^Praticamente igual por quilo: Produto A e Produto B\.$/);
		assert.deepEqual(tie.groups[0].winners, [0, 1]);
		assert.equal(tie.groups[0].rows[1].text, 'Praticamente igual ao 1º.');

		const apart = compare([{price: '10,00', size: '1', unit: 'kg'}, {price: '10,07', size: '1', unit: 'kg'}]);

		assert.match(apart.groups[0].headline, /mais barato/);
		assert.deepEqual(apart.groups[0].winners, [0]);
	});

	test('does not compare units that do not convert', () => {
		const result = compare([
			{price: '5', size: '1', unit: 'kg'},
			{price: '6', size: '12', unit: 'un'},
			{price: '7', size: '800', unit: 'g'},
		]);

		assert.deepEqual(result.incompatible, ['Não dá pra comparar kg com un.']);
		assert.equal(result.groups.length, 1);
		assert.equal(result.groups[0].dimension, 'mass');
		assert.deepEqual(result.groups[0].rows.map((row) => row.index), [0, 2]);
		assert.deepEqual(result.alone.map((item) => item.index), [1]);
	});

	test('names meters against sheets', () => {
		const result = compare([{price: '5', size: '30', unit: 'm'}, {price: '5', size: '60', unit: 'folhas'}]);

		assert.deepEqual(result.incompatible, ['Não dá pra comparar m com folhas.']);
		assert.equal(result.groups.length, 0);
	});

	test('incomplete products are left out', () => {
		const result = compare([PAPEL_A, {name: 'Vazio'}]);

		assert.equal(result.complete, 1);
		assert.equal(result.groups.length, 0);
	});

	test('warns when tipos differ, and still compares', () => {
		const result = compare([PAPEL_A, {...PAPEL_B, tipo: 'folha simples'}]);

		assert.equal(result.groups[0].tipoWarning, 'Atenção: tipos diferentes (folha dupla × folha simples).');
		assert.equal(result.groups[0].headline, 'Papel A sai 13% mais barato por metro.');
	});

	test('a tipo on only one product is no warning', () => {
		assert.equal(tipoWarning(['folha dupla', '']), null);
		assert.equal(tipoWarning([' Folha  dupla', 'folha dupla']), null);
	});
});

describe('tag check', () => {
	test('a tag within 2% is fine', () => {
		assert.equal(tagCheck('17,90', 17.98, 'mass'), null);
		assert.equal(tagCheck('', 17.98, 'mass'), null);
	});

	test('a tag more than 2% off warns with both values', () => {
		assert.equal(
			tagCheck('15,90', 17.98, 'mass'),
			'A etiqueta diz R$ 15,90/kg, a conta dá R$ 17,98/kg. A etiqueta pode estar errada, ou algum valor foi digitado errado.'
		);
	});

	test('evaluate checks the tag against the price before Leve X Pague Y', () => {
		const ok = evaluate({kind: 'leve', leveX: '3', pagueY: '2', price: '12,99', size: '1', tagPrice: '12,99', unit: 'L'});
		const off = evaluate({price: '8,99', size: '500', tagPrice: '8,99', unit: 'g'});

		assert.equal(ok.tagWarning, null);
		assert.match(off.tagWarning, /R\$ 8,99\/kg, a conta dá R\$ 17,98\/kg/);
	});
});

describe('displayName', () => {
	test('uses the name, or a letter by position', () => {
		assert.equal(displayName({name: '  Neve  '}, 0), 'Neve');
		assert.equal(displayName({}, 2), 'Produto C');
	});
});
