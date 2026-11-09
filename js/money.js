// Cash-register price entry: the price fields take digits only and fill
// from the right with two implied decimals, so "324" is 3,24 and "89" is
// 0,89, and nobody has to find the comma on the phone keyboard. Pure
// functions over strings, so Node tests can import them; app.js wires them
// to the price and tag price fields.

import {parseNumber} from './units.js';

// R$ 999.999,99.
export const MAX_DIGITS = 8;

const FORMAT = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 2, minimumFractionDigits: 2});

// The cents typed, as a digit string: every non-digit dropped (comma, dot,
// minus, spaces), leading zeros dropped, and only the first MAX_DIGITS kept,
// so a ninth digit typed at the end does nothing.
export function centsDigits(text) {
	return String(text ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
}

// The field's text for a digit string: "" stays empty (an unfilled price
// keeps the product incomplete), "8" is "0,08", "129990" is "1.299,90".
export function formatDigits(digits) {
	return digits ? FORMAT.format(Number(digits) / 100) : '';
}

// What the field shows after a keystroke, from whatever it holds: "3,245"
// (a digit typed after 3,24) is "32,45", "3,2" (a backspace) is "0,32".
export function typedPrice(text) {
	return formatDigits(centsDigits(text));
}

// What the field shows after a paste. A comma or a dot followed by one or
// two digits at the end is a decimal mark ("12,99", "12.9", "R$ 1.299,90");
// anything else counts as digits typed ("5" is 0,05, "1.299" is 12,99).
// The paste replaces the field.
export function pastedPrice(text) {
	const value = String(text ?? '').trim();
	const decimal = /^(.*)[.,](\d{1,2})$/.exec(value);

	if (decimal) {
		return formatDigits(centsDigits(decimal[1].replace(/\D/g, '') + decimal[2].padEnd(2, '0')));
	}

	return typedPrice(value);
}

// A price saved before cash-register entry (v1 kept the text as typed:
// "21,90", "22.50", "7", "1.299,90") or after it ("0,89"), as the field
// shows it now. Text that is not a price is empty.
export function storedPrice(text) {
	const number = parseNumber(text);

	if (number === null || number === 0) {
		return '';
	}

	return formatDigits(centsDigits(String(Math.round(number * 100))));
}
