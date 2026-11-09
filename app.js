// The Comparar screen: product cards, each with its own unit price, and the
// result below them. The math is in js/compare.js and js/units.js; this file
// only reads the inputs and writes the outputs.
//
// The cards are built once per add, remove, or clear, and only their output
// lines change while the person types, so the field being typed in never
// loses focus.

import {DIMENSIONS, UNITS, formatMoney, formatUnitPrice, unitName} from './js/units.js';
import {compare} from './js/compare.js';
import {pastedPrice, storedPrice, typedPrice} from './js/money.js';
import {MAX_PRODUCTS, blankProduct, clearProducts, loadProducts, saveProducts} from './js/storage.js';

const MIN_PRODUCTS = 2;
const LETTERS = 'ABCDEFGHIJ';

const list = document.getElementById('products');
const template = document.getElementById('card-template');
const valuesTemplate = document.getElementById('values-template');
const addButton = document.getElementById('add');
const resultBody = document.getElementById('result-body');

// The groups whose values the person opened, by dimension. Empty on load, so
// every result starts with only the percent showing.
const openValues = new Set();

let products = loadProducts() || [blankProduct(), blankProduct()];

// Prices saved by v1 are the text as typed ("22.50", "7"); show them the
// way cash-register entry writes them ("22,50", "7,00").
for (const product of products) {
	product.price = storedPrice(product.price);
	product.tagPrice = storedPrice(product.tagPrice);
}

while (products.length < MIN_PRODUCTS) {
	products.push(blankProduct(products[products.length - 1]?.unit));
}

function element(tag, className, text) {
	const node = document.createElement(tag);

	if (className) {
		node.className = className;
	}

	if (text !== undefined) {
		node.textContent = text;
	}

	return node;
}

// ------------------------------------------------------------ the cards

function buildCards() {
	list.replaceChildren(
		...products.map((product, index) => {
			const card = template.content.firstElementChild.cloneNode(true);
			const letter = LETTERS[index];

			card.dataset.index = String(index);
			card.querySelector('.card-title').textContent = `Produto ${letter}`;
			card.querySelector('.remove').setAttribute('aria-label', `Remover produto ${letter}`);
			card.querySelector('.remove').hidden = products.length <= MIN_PRODUCTS;

			for (const input of card.querySelectorAll('[data-field]')) {
				input.value = product[input.dataset.field];
				input.id = `p${index}-${input.dataset.field}`;
			}

			// Open the details when they hold something, so a saved tipo or
			// tag price is not hidden after the app reopens.
			card.querySelector('.more').open = Boolean(product.tipo || product.tagPrice);
			showKindFields(card, product.kind);

			return card;
		})
	);

	addButton.hidden = products.length >= MAX_PRODUCTS;
	update();
}

function showKindFields(card, kind) {
	for (const row of card.querySelectorAll('[data-show]')) {
		row.hidden = row.dataset.show !== kind;
	}
}

// Whether the person has typed anything in the card yet; an untouched card
// does not nag about what it is missing.
function touched(product) {
	return ['name', 'price', 'pack', 'size', 'tipo', 'tagPrice'].some((field) => product[field].trim());
}

// ----------------------------------------------------------- the result

function update() {
	const result = compare(products);
	const ranks = new Map();

	for (const group of result.groups) {
		for (const row of group.rows) {
			ranks.set(row.index, {rank: row.rank, tied: group.winners.length > 1, winner: group.winners.includes(row.index)});
		}
	}

	for (const card of list.children) {
		const index = Number(card.dataset.index);
		const product = products[index];
		const item = result.evaluated[index];
		const rank = ranks.get(index);
		const badge = card.querySelector('.badge');

		card.classList.toggle('winner', Boolean(rank?.winner));
		badge.hidden = !rank;

		if (rank) {
			badge.textContent = rank.winner ? (rank.tied ? 'Empate' : 'Mais barato') : `${rank.rank}º`;
		}

		card.querySelector('[data-out="total"]').textContent = item.totalText ? `Total: ${item.totalText}` : '';
		card.querySelector('[data-out="unit-price"]').textContent = item.complete ? formatUnitPrice(item.unitPrice, item.dimension) : '';
		card.querySelector('[data-out="notes"]').textContent = item.notes.join(' ');

		const tag = card.querySelector('[data-out="tag"]');

		tag.hidden = !item.tagWarning;
		tag.textContent = item.tagWarning || '';

		const missing = item.complete || !touched(product) ? '' : `Falta: ${item.missing.join(', ')}.`;

		card.querySelector('[data-out="missing"]').textContent = missing;

		const dimension = item.dimension || UNITS[product.unit]?.dimension;

		card.querySelector('[data-out="tag-label"]').textContent = `Preço por ${dimension ? DIMENSIONS[dimension].label : 'unidade'} na etiqueta`;
	}

	renderResult(result);
}

function renderResult(result) {
	const parts = [];

	for (const message of result.incompatible) {
		parts.push(element('p', 'warn', message + ' Comparando só os produtos na mesma unidade.'));
	}

	for (const item of result.groups) {
		const block = element('div', 'group');

		if (result.groups.length > 1) {
			block.append(element('h3', 'group-title', `Por ${DIMENSIONS[item.dimension].word} (R$/${DIMENSIONS[item.dimension].label})`));
		}

		block.append(element('p', 'headline', item.headline));

		if (item.values.length) {
			block.append(valuesBlock(item));
		}

		if (item.tipoWarning) {
			block.append(element('p', 'warn', item.tipoWarning + ' A comparação pode não ser justa.'));
		}

		const ranking = element('ol', 'ranking');

		for (const row of item.rows) {
			const evaluated = result.evaluated[row.index];
			const entry = element('li', item.winners.includes(row.index) ? 'rank winner' : 'rank');
			const top = element('div', 'rank-top');

			top.append(element('span', 'rank-place', `${row.rank}º`), element('span', 'rank-name', row.name), element('span', 'rank-price', formatUnitPrice(row.unitPrice, item.dimension)));
			entry.append(top, element('p', 'rank-kind', kindText(row.index, evaluated)));

			if (row.text) {
				entry.append(element('p', 'rank-text', row.text));
			}

			ranking.append(entry);
		}

		block.append(ranking);
		parts.push(block);
	}

	for (const item of result.alone) {
		if (result.groups.length || result.incompatible.length) {
			parts.push(element('p', 'note', `${item.name} ficou de fora: nenhum outro produto em ${unitName(item.dimension)}.`));
		}
	}

	if (!result.groups.length && !result.incompatible.length) {
		parts.push(element('p', 'empty', 'Preencha preço, tamanho e unidade de pelo menos dois produtos para ver qual vale mais.'));
	}

	resultBody.replaceChildren(...parts);
}

// "Ver valores" and the reais it shows: per unit and for the same purchase,
// against each product the 1st beats.
function valuesBlock(group) {
	const block = valuesTemplate.content.firstElementChild.cloneNode(true);
	const button = block.querySelector('.values-toggle');
	const panel = block.querySelector('.values-panel');
	const open = openValues.has(group.dimension);

	panel.id = `values-${group.dimension}`;
	button.dataset.dimension = group.dimension;
	button.setAttribute('aria-controls', panel.id);
	button.setAttribute('aria-expanded', String(open));
	panel.hidden = !open;

	for (const line of group.values) {
		const entry = element('div', 'values-item');

		entry.append(element('p', 'values-unit', line.perUnit), element('p', 'values-saving', line.saving));
		panel.append(entry);
	}

	return block;
}

resultBody.addEventListener('click', (event) => {
	const button = event.target.closest('.values-toggle');

	if (!button) {
		return;
	}

	const open = button.getAttribute('aria-expanded') !== 'true';
	const dimension = button.dataset.dimension;

	button.setAttribute('aria-expanded', String(open));
	document.getElementById(button.getAttribute('aria-controls')).hidden = !open;

	if (open) {
		openValues.add(dimension);
	}
	else {
		openValues.delete(dimension);
	}
});

// The price a ranking row used, named by its kind (DESIGN.md section 4).
function kindText(index, evaluated) {
	const product = products[index];

	if (product.kind === 'clube') {
		return 'Usando preço Clube/app.';
	}

	if (product.kind === 'atacarejo') {
		return evaluated.minQty ? `Usando preço de atacarejo, só levando ${evaluated.minQty} ou mais.` : 'Usando preço de atacarejo.';
	}

	if (product.kind === 'leve') {
		const x = product.leveX.trim();

		return `Usando Leve ${x} Pague ${product.pagueY.trim()}: ${formatMoney(evaluated.effectivePrice)} cada, levando ${x}.`;
	}

	return 'Usando preço normal.';
}

// ------------------------------------------------ cash-register prices

// A price field (data-money) holds digits only, filled from the right with
// two decimals (js/money.js). Each input event re-reads the digits from
// whatever the field now holds and writes the value back, with the caret at
// the end. That works with Gboard on Android, which sends input events but
// often no usable keydown.
function isMoney(target) {
	return target instanceof HTMLInputElement && target.hasAttribute('data-money');
}

function caretToEnd(input) {
	const end = input.value.length;

	if (input.selectionStart !== end || input.selectionEnd !== end) {
		input.setSelectionRange(end, end);
	}
}

function writeMoney(input, value) {
	input.value = value;

	if (document.activeElement === input) {
		caretToEnd(input);
	}
}

// A paste replaces the field, reading "12,99" as 12,99 and "5" as 0,05.
list.addEventListener('paste', (event) => {
	if (!isMoney(event.target)) {
		return;
	}

	event.preventDefault();
	writeMoney(event.target, pastedPrice(event.clipboardData?.getData('text') || ''));
	event.target.dispatchEvent(new Event('input', {bubbles: true}));
});

// Keep the caret at the end: a tap in the middle of 12,99 would otherwise
// put the next digit there.
for (const type of ['focusin', 'click']) {
	list.addEventListener(type, (event) => {
		if (isMoney(event.target)) {
			requestAnimationFrame(() => caretToEnd(event.target));
		}
	});
}

document.addEventListener('selectionchange', () => {
	const input = document.activeElement;

	if (isMoney(input) && input.selectionStart === input.selectionEnd) {
		caretToEnd(input);
	}
});

// -------------------------------------------------------------- events

list.addEventListener('input', (event) => {
	const field = event.target.dataset?.field;
	const card = event.target.closest('.card');

	if (!field || !card) {
		return;
	}

	if (isMoney(event.target)) {
		// Several characters at once from the keyboard (a clipboard chip on
		// Gboard) count as a paste.
		const pasted = event.inputType === 'insertText' && event.data?.length > 1;

		writeMoney(event.target, pasted ? pastedPrice(event.data) : typedPrice(event.target.value));
	}

	products[Number(card.dataset.index)][field] = event.target.value;

	if (field === 'kind') {
		showKindFields(card, event.target.value);
	}

	saveProducts(products);
	update();
});

list.addEventListener('click', (event) => {
	const button = event.target.closest('[data-action="remove"]');

	if (!button || products.length <= MIN_PRODUCTS) {
		return;
	}

	products.splice(Number(button.closest('.card').dataset.index), 1);
	saveProducts(products);
	buildCards();
});

addButton.addEventListener('click', () => {
	if (products.length >= MAX_PRODUCTS) {
		return;
	}

	// A new card starts in the last card's unit: products compared are
	// usually measured the same way.
	products.push(blankProduct(products[products.length - 1].unit));
	saveProducts(products);
	buildCards();

	const card = list.lastElementChild;

	card.scrollIntoView({behavior: 'smooth', block: 'start'});
	card.querySelector('[data-field="name"]').focus({preventScroll: true});
});

document.getElementById('clear').addEventListener('click', () => {
	if (!window.confirm('Limpar todos os produtos?')) {
		return;
	}

	clearProducts();
	openValues.clear();
	products = [blankProduct(), blankProduct()];
	buildCards();
	window.scrollTo({top: 0});
});

buildCards();

// ------------------------------------------------------ service worker

// A new version installs in the background and waits; the bar offers to
// switch, so a page never runs one version's modules with another's.
async function registerServiceWorker() {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	const bar = document.getElementById('update');
	let reloading = false;

	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (reloading) {
			window.location.reload();
		}
	});

	function offer(worker) {
		if (!worker || !navigator.serviceWorker.controller) {
			return;
		}

		bar.hidden = false;
		document.getElementById('update-button').onclick = () => {
			reloading = true;
			worker.postMessage('skip-waiting');
		};
	}

	try {
		const registration = await navigator.serviceWorker.register('sw.js');

		offer(registration.waiting);
		registration.addEventListener('updatefound', () => {
			const worker = registration.installing;

			worker?.addEventListener('statechange', () => {
				if (worker.state === 'installed') {
					offer(worker);
				}
			});
		});
	}
	catch {
		// No worker (a file:// page, a blocked browser): the app still works
		// online.
	}
}

registerServiceWorker();
