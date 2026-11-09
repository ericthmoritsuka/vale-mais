// The current comparison, kept in localStorage so it survives closing the
// app. Every read and write is wrapped: a private window, cleared site data,
// or a full disk makes storage throw or come back empty, and the app then
// starts from two blank products instead of failing.

const KEY = 'vale-mais-comparar';

// The fields a product card holds, all kept as the text typed.
export const FIELDS = ['name', 'price', 'pack', 'size', 'unit', 'kind', 'minQty', 'leveX', 'pagueY', 'tipo', 'tagPrice'];

export const MAX_PRODUCTS = 6;

export function blankProduct(unit = 'g') {
	return {kind: 'normal', leveX: '', minQty: '', name: '', pack: '', pagueY: '', price: '', size: '', tagPrice: '', tipo: '', unit};
}

// A saved product with only known fields, each a string, so an old or
// damaged save cannot put anything else into the page.
export function cleanProduct(saved) {
	const product = blankProduct();

	if (!saved || typeof saved !== 'object') {
		return product;
	}

	for (const field of FIELDS) {
		if (typeof saved[field] === 'string') {
			product[field] = saved[field].slice(0, 200);
		}
	}

	return product;
}

// The saved products, or null when there is nothing usable.
export function loadProducts(storage = globalThis.localStorage) {
	try {
		const data = JSON.parse(storage.getItem(KEY));

		if (!data || !Array.isArray(data.products) || !data.products.length) {
			return null;
		}

		return data.products.slice(0, MAX_PRODUCTS).map(cleanProduct);
	}
	catch {
		return null;
	}
}

export function saveProducts(products, storage = globalThis.localStorage) {
	try {
		storage.setItem(KEY, JSON.stringify({products, version: 1}));

		return true;
	}
	catch {
		return false;
	}
}

export function clearProducts(storage = globalThis.localStorage) {
	try {
		storage.removeItem(KEY);
	}
	catch {
		// Nothing saved, or storage is off: either way nothing to clear.
	}
}
