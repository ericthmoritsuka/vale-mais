// The comparison: each product's unit price, the price kind it used, and
// the ranking of the products that can be compared (DESIGN.md sections 3,
// 4, and 6). Pure functions over plain objects, so Node tests can import
// them.
//
// A product is what a card holds, with its fields as typed (strings) or as
// numbers:
//
//   {name, price, pack, size, unit, kind, minQty, leveX, pagueY, tipo, tagPrice}
//
// kind is 'normal', 'clube', 'atacarejo', or 'leve'.

import {DIMENSIONS, UNITS, baseQuantity, formatMoney, formatPercent, formatQuantity, formatReais, formatUnitPrice, parseNumber, unitName} from './units.js';

// Two unit prices within this many percent are "praticamente igual".
export const TIE_PERCENT = 0.5;

// The tag's printed unit price may differ from ours by this many percent
// before it is called a mismatch (rounding on the tag, a size rounded).
export const TAG_TOLERANCE_PERCENT = 2;

export const KINDS = {
	atacarejo: 'Atacarejo',
	clube: 'Clube/app',
	leve: 'Leve X Pague Y',
	normal: 'Normal',
};

const LETTERS = 'ABCDEFGHIJ';

// The name shown for the product at this position: its own name, or
// "Produto A".
export function displayName(product, index) {
	const name = String(product.name || '').trim();

	return name || `Produto ${LETTERS[index] || index + 1}`;
}

// A whole number of at least 1, or null.
function wholeAtLeastOne(value) {
	const number = parseNumber(value);

	return number !== null && Number.isInteger(number) && number >= 1 ? number : null;
}

function blank(value) {
	return value === undefined || value === null || String(value).trim() === '';
}

// One product worked out. complete is true when it has everything a unit
// price needs; missing names what it lacks, in Portuguese, for the card.
export function evaluate(product) {
	const result = {
		complete: false,
		dimension: null,
		effectivePrice: null,
		kindLabel: KINDS[product.kind] || KINDS.normal,
		leve: null,
		missing: [],
		notes: [],
		nominalUnitPrice: null,
		quantity: null,
		tagWarning: null,
		totalText: '',
		unitPrice: null,
	};

	const price = parseNumber(product.price);
	const pack = blank(product.pack) ? 1 : parseNumber(product.pack);
	const size = parseNumber(product.size);
	const unit = UNITS[product.unit] ? product.unit : null;

	if (price === null || price <= 0) {
		result.missing.push('preço');
	}

	if (pack === null || pack <= 0) {
		result.missing.push('quantidade no pacote');
	}

	if (size === null || size <= 0) {
		result.missing.push('tamanho');
	}

	if (!unit) {
		result.missing.push('unidade');
	}

	if (unit && size > 0 && pack > 0) {
		const dimension = UNITS[unit].dimension;
		const quantity = baseQuantity(pack, size, unit);
		const base = DIMENSIONS[dimension].base;
		const typed = pack === 1 ? `${formatQuantity(size)} ${unit}` : `${formatQuantity(pack)} × ${formatQuantity(size)} ${unit}`;

		result.dimension = dimension;
		result.quantity = quantity;
		result.totalText = typed === `${formatQuantity(quantity)} ${base}` ? typed : `${typed} = ${formatQuantity(quantity)} ${base}`;
	}

	let effectivePrice = price;

	if (product.kind === 'clube') {
		result.notes.push('Preço Clube/app: só vale com o cadastro na loja.');
	}
	else if (product.kind === 'atacarejo') {
		const minQty = wholeAtLeastOne(product.minQty);

		result.minQty = minQty;
		result.notes.push(minQty ? `Atacarejo: só vale levando ${minQty} ou mais.` : 'Atacarejo: informe a partir de quantas unidades vale.');
	}
	else if (product.kind === 'leve') {
		const x = wholeAtLeastOne(product.leveX);
		const y = wholeAtLeastOne(product.pagueY);

		if (!x || !y || y >= x) {
			result.missing.push('Leve X Pague Y (X maior que Y)');
		}
		else if (price > 0) {
			result.leve = {x, y};
			effectivePrice = (price * y) / x;
			result.notes.push(`Leve ${x} Pague ${y}: a conta usa ${formatMoney(effectivePrice)} cada (${formatMoney(price)} × ${y} ÷ ${x}), levando ${x}.`);
		}
	}

	if (result.missing.length) {
		return result;
	}

	const per = DIMENSIONS[result.dimension].per;

	result.complete = true;
	result.effectivePrice = effectivePrice;
	result.nominalUnitPrice = (price / result.quantity) * per;
	result.unitPrice = (effectivePrice / result.quantity) * per;
	result.tagWarning = tagCheck(product.tagPrice, result.nominalUnitPrice, result.dimension);

	return result;
}

// The tag's printed unit price against the one worked out from the tag's
// own price (before any Leve X Pague Y, which the tag's unit price does not
// count). Returns a warning, or null when the tag agrees or is blank.
export function tagCheck(tagPrice, computed, dimension) {
	const tag = parseNumber(tagPrice);

	if (tag === null || tag <= 0 || !computed) {
		return null;
	}

	const off = (Math.abs(tag - computed) / computed) * 100;

	if (off <= TAG_TOLERANCE_PERCENT) {
		return null;
	}

	return `A etiqueta diz ${formatUnitPrice(tag, dimension)}, a conta dá ${formatUnitPrice(computed, dimension)}. A etiqueta pode estar errada, ou algum valor foi digitado errado.`;
}

// The tipo as compared: trimmed, lower case, single spaces.
function tipoKey(tipo) {
	return String(tipo || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Every product compared: per-product results, one ranked group per
// dimension that has two or more complete products, the dimensions that
// cannot be compared with each other, and the complete products left
// without a partner in their dimension.
export function compare(products) {
	const evaluated = products.map((product, index) => ({...evaluate(product), index, name: displayName(product, index)}));
	const complete = evaluated.filter((item) => item.complete);
	const byDimension = new Map();

	for (const item of complete) {
		if (!byDimension.has(item.dimension)) {
			byDimension.set(item.dimension, []);
		}

		byDimension.get(item.dimension).push(item);
	}

	const dimensions = [...byDimension.keys()];
	const incompatible = [];

	for (let i = 0; i < dimensions.length; i++) {
		for (let j = i + 1; j < dimensions.length; j++) {
			incompatible.push(`Não dá pra comparar ${unitName(dimensions[i])} com ${unitName(dimensions[j])}.`);
		}
	}

	const groups = [];
	const alone = [];

	for (const [dimension, items] of byDimension) {
		if (items.length < 2) {
			alone.push(...items);

			continue;
		}

		groups.push(rankGroup(dimension, items, products));
	}

	return {alone, complete: complete.length, evaluated, groups, incompatible};
}

// One group ranked by unit price. Every comparison is stated as the cheaper
// product being X% cheaper than the other, 1 - cheaper / other: 13% cheaper
// is not 13% more expensive (that is 15.6%), so the app never turns the
// number around.
//
// The headline and the rows carry the percent. The reais behind it, per unit
// and for a whole purchase, are in `values`, which the screen keeps behind
// "Ver valores".
function rankGroup(dimension, items, products) {
	const word = DIMENSIONS[dimension].word;
	const per = DIMENSIONS[dimension].per;
	const ranked = [...items].sort((a, b) => a.unitPrice - b.unitPrice || a.index - b.index);
	const best = ranked[0];

	const rows = ranked.map((item, position) => {
		const diffValue = item.unitPrice - best.unitPrice;
		const diffPercent = (diffValue / item.unitPrice) * 100;

		return {
			diffPercent,
			diffValue,
			index: item.index,
			name: item.name,
			rank: position + 1,

			// Buying this product's own quantity at the 1st's unit price.
			saving: (diffValue / per) * item.quantity,
			tie: position > 0 && diffPercent <= TIE_PERCENT + 1e-9,
			unitPrice: item.unitPrice,
		};
	});

	const tied = rows.filter((row) => row.rank === 1 || row.tie);
	const others = rows.filter((row) => row.rank > 1 && !row.tie);
	let headline;

	if (tied.length > 1) {
		headline = `Praticamente igual por ${word}: ${joinNames(tied.map((row) => row.name))}.`;
	}
	else if (rows.length === 2) {
		headline = `${best.name} sai ${formatPercent(rows[1].diffPercent)} mais barato.`;
	}
	else {
		headline = `${best.name} sai ${formatPercent(rows[1].diffPercent)} mais barato que ${rows[1].name}.`;
	}

	for (const row of rows.slice(1)) {
		row.text = row.tie ? 'Praticamente igual ao 1º.' : `O 1º sai ${formatPercent(row.diffPercent)} mais barato.`;
	}

	const values = [];

	for (const row of others) {
		const other = items.find((item) => item.index === row.index);
		const quantity = `${formatQuantity(other.quantity)} ${DIMENSIONS[dimension].base}`;
		const multibuy = [best, other].filter((item) => item.leve).map((item) => `o Leve ${item.leve.x} Pague ${item.leve.y} do ${item.name}, levando ${item.leve.x}`);
		let saving = `Levando a mesma quantidade do ${row.name} (${quantity}), você economiza ${formatReais(row.saving)} com o ${best.name}.`;

		if (multibuy.length) {
			saving += ` A conta considera ${joinNames(multibuy)}.`;
		}

		values.push({
			index: row.index,
			perUnit: `${formatMoney(row.diffValue)} a menos por ${word} que ${row.name}.`,
			saving,
		});
	}

	return {
		dimension,
		headline,
		rows,
		tipoWarning: tipoWarning(items.map((item) => products[item.index].tipo)),
		values,
		winners: tied.map((row) => row.index),
	};
}

// "A e B", "A, B e C".
function joinNames(names) {
	return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
}

// "Atenção: tipos diferentes (folha dupla × folha simples)" when two or more
// products in a group have a tipo and they are not all the same.
export function tipoWarning(tipos) {
	const seen = new Map();

	for (const tipo of tipos) {
		const key = tipoKey(tipo);

		if (key && !seen.has(key)) {
			seen.set(key, String(tipo).trim().replace(/\s+/g, ' '));
		}
	}

	return seen.size > 1 ? `Atenção: tipos diferentes (${[...seen.values()].join(' × ')}).` : null;
}
