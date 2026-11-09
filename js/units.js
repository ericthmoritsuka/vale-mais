// Units, number parsing, and pt-BR formatting for the calculator
// (DESIGN.md section 3). Pure functions: no DOM, no storage, so Node tests
// can import them.

// Each unit a person can pick, the dimension it measures, and how many base
// units one of it is. Mass is compared in kg and volume in L, so g and ml
// are a thousandth of their base.
export const UNITS = {
	folhas: {dimension: 'sheets', factor: 1},
	g: {dimension: 'mass', factor: 0.001},
	kg: {dimension: 'mass', factor: 1},
	L: {dimension: 'volume', factor: 1},
	m: {dimension: 'length', factor: 1},
	ml: {dimension: 'volume', factor: 0.001},
	un: {dimension: 'count', factor: 1},
};

// The order the unit menu lists them in.
export const UNIT_ORDER = ['g', 'kg', 'ml', 'L', 'un', 'm', 'folhas'];

// How each dimension is compared and named. `per` is how many base units
// one price is quoted for: sheets are priced per 100, the rest per 1.
// `word` finishes "mais barato por ...".
export const DIMENSIONS = {
	count: {base: 'un', label: 'un', per: 1, word: 'unidade'},
	length: {base: 'm', label: 'm', per: 1, word: 'metro'},
	mass: {base: 'kg', label: 'kg', per: 1, word: 'quilo'},
	sheets: {base: 'folhas', label: '100 folhas', per: 100, word: '100 folhas'},
	volume: {base: 'L', label: 'L', per: 1, word: 'litro'},
};

// A number typed the Brazilian way or the English way: "12,99", "12.99",
// "1.299,90", "1,299.90", "R$ 7", " 0,5 ". When both separators appear,
// the last one is the decimal mark. A single comma is decimal. A single dot
// is decimal too ("1.5" L, "0.500" kg), because a phone keyboard often has
// only the dot; two or more dots with no comma are thousands ("1.299.000").
// Returns null for anything else, and for a negative number.
export function parseNumber(value) {
	if (typeof value === 'number') {
		return Number.isFinite(value) && value >= 0 ? value : null;
	}

	if (typeof value !== 'string') {
		return null;
	}

	let text = value.replace(/R\$/gi, '').replace(/\s+/g, '');

	if (!text || !/^[0-9.,]+$/.test(text) || !/[0-9]/.test(text)) {
		return null;
	}

	const lastComma = text.lastIndexOf(',');
	const lastDot = text.lastIndexOf('.');
	const commas = (text.match(/,/g) || []).length;
	const dots = (text.match(/\./g) || []).length;

	if (commas && dots) {
		const decimal = lastComma > lastDot ? ',' : '.';
		const group = decimal === ',' ? '.' : ',';

		if (text.split(decimal).length !== 2) {
			return null;
		}

		const [whole, fraction] = text.split(decimal);

		if (!validGroups(whole, group)) {
			return null;
		}

		text = whole.split(group).join('') + '.' + fraction;
	}
	else if (commas > 1) {
		return null;
	}
	else if (commas === 1) {
		text = text.replace(',', '.');
	}
	else if (dots > 1) {
		if (!validGroups(text, '.')) {
			return null;
		}

		text = text.split('.').join('');
	}

	if (text.startsWith('.') || text.endsWith('.')) {
		text = text.startsWith('.') ? '0' + text : text.slice(0, -1);
	}

	const number = Number(text);

	return Number.isFinite(number) ? number : null;
}

// "1.299" with "." as the group mark: the first group has 1 to 3 digits and
// every later one exactly 3.
function validGroups(text, group) {
	const parts = text.split(group);

	if (parts.length === 1) {
		return /^[0-9]*$/.test(text);
	}

	return /^[0-9]{1,3}$/.test(parts[0]) && parts.slice(1).every((part) => /^[0-9]{3}$/.test(part));
}

// A number in pt-BR with the given number of decimals: 1299.9 → "1.299,90".
function ptBR(value, decimals) {
	return new Intl.NumberFormat('pt-BR', {
		maximumFractionDigits: decimals,
		minimumFractionDigits: decimals,
	}).format(value);
}

// The decimals a money value needs: two from R$ 1 up, and below that enough
// for three significant digits, so R$ 0,0608 is not shown as R$ 0,06 and a
// tiny value is never R$ 0,00. Trailing zeros past the second are dropped.
function moneyDecimals(value) {
	const size = Math.abs(value);

	if (size >= 1 || size === 0) {
		return 2;
	}

	let decimals = Math.max(2, 2 - Math.floor(Math.log10(size)));

	while (decimals > 2 && Number(size.toFixed(decimals - 1)) === Number(size.toFixed(decimals))) {
		decimals--;
	}

	return decimals;
}

// "R$ 21,90", "R$ 0,0608", "R$ 1.299,90".
export function formatMoney(value) {
	return 'R$ ' + ptBR(value, moneyDecimals(value));
}

// A quantity with up to three decimals and no trailing zeros: 1.2 → "1,2",
// 360 → "360", 1200 → "1.200".
export function formatQuantity(value) {
	return new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 3}).format(value);
}

// A percent: whole from 10 up ("13%"), one decimal below ("2,3%", "4%").
export function formatPercent(value) {
	const decimals = value >= 10 ? 0 : 1;

	return new Intl.NumberFormat('pt-BR', {maximumFractionDigits: decimals}).format(value) + '%';
}

// The unit price label for a dimension: "R$/kg", "R$/100 folhas".
export function priceUnitLabel(dimension) {
	return 'R$/' + DIMENSIONS[dimension].label;
}

// The unit a dimension is named by in a sentence: "kg", "folhas".
export function unitName(dimension) {
	return dimension === 'sheets' ? 'folhas' : DIMENSIONS[dimension].label;
}

// "R$ 0,0608/m", "R$ 2,35/100 folhas".
export function formatUnitPrice(value, dimension) {
	return formatMoney(value) + '/' + DIMENSIONS[dimension].label;
}

// A size in its base unit: 6 × 200 ml is 1.2 (L), 12 × 30 m is 360 (m).
export function baseQuantity(pack, size, unit) {
	return pack * size * UNITS[unit].factor;
}
