import assert from 'node:assert/strict';
import test from 'node:test';
import { BARCODE_TIMEOUT_MS, barcodeToAnalysis, lookupBarcode, parseBarcodeProduct } from '../src/lib/barcode.ts';

function inputSet(per = '100g', overrides = {}) {
  return {
    per, per_quantity: 100, per_unit: per === '100ml' ? 'ml' : 'g',
    preparation: 'as_sold', source: 'packaging',
    nutrients: {
      'energy-kcal': { value: 200, unit: 'kcal' }, proteins: { value: 5.3, unit: 'g' },
      carbohydrates: { value: 30.2, unit: 'g' }, fat: { value: 7.1, unit: 'g' },
    }, ...overrides,
  };
}
function product(...sets) { return { product_name: 'Test food', nutrition: { input_sets: sets } }; }
function parse(p) { return parseBarcodeProduct('12345678', p); }
function response(p) { return Response.json({ status: 'success', result: { id: 'product_found' }, product: p }); }

test('scales from per-100ml when a serving repeats the per-100 values (Coca-Cola regression)', () => {
  const nutrients = { 'energy-kcal': { value: 42 }, proteins: { value: 0 }, carbohydrates: { value: 10.6 }, fat: { value: 0 } };
  const p = parse(product(inputSet('100ml', { nutrients }), inputSet('serving', { nutrients, per_quantity: 330, per_unit: 'ml' })));
  assert.equal(p.perLabel, 'per serving (330 ml)');
  assert.equal(barcodeToAnalysis(p, 1).total.calories, 139);
  assert.equal(barcodeToAnalysis(p, 1).total.carbs_g, 35);
  assert.match(p.nutritionNote, /recalculated/);
});

test('keeps precision through serving multipliers and labels per-100ml correctly', () => {
  const p = parse(product(inputSet('100ml')));
  assert.equal(p.perLabel, 'per 100 ml');
  assert.equal(p.protein_g, 5.3);
  assert.equal(barcodeToAnalysis(p, 3).total.protein_g, 16);
  assert.equal(barcodeToAnalysis(p, 0.5).total.calories, 100);
});

test('derives a measured serving from product metadata, without assuming ml equals g', () => {
  const p = product(inputSet());
  p.serving_size = '1 piece (25 g)';
  assert.equal(parse(p).calories, 50);
  p.serving_size = '1 cup (250 ml)';
  assert.equal(parse(p).perLabel, 'per 100 g');
  p.serving_size = undefined;
  p.serving_quantity = 250;
  assert.equal(parse(p).perLabel, 'per 100 g');
});

test('supports complete measured serving-only labels and incomplete servings with a complete base', () => {
  const serving = inputSet('serving', { per_quantity: 50 });
  assert.equal(parse(product(serving)).perLabel, 'per serving (50 g)');
  serving.nutrients = {};
  assert.equal(parse(product(inputSet(), serving)).calories, 100);
  assert.throws(() => parse(product(serving)), /incomplete/);
});

test('rejects missing, negative, non-finite and malformed nutrients without inventing zeros', () => {
  for (const field of ['energy-kcal', 'proteins', 'carbohydrates', 'fat']) {
    for (const value of [undefined, null, '', -1, Infinity, NaN, '10 g', '12bad', true]) {
      const set = inputSet(); set.nutrients[field].value = value;
      assert.throws(() => parse(product(set)), /incomplete/, `${field}=${value}`);
    }
  }
});

test('accepts explicit zero nutrition and numeric strings; converts kJ to kcal', () => {
  const set = inputSet();
  for (const nutrient of Object.values(set.nutrients)) nutrient.value = 0;
  assert.equal(parse(product(set)).calories, 0);
  set.nutrients.proteins.value = '0,3';
  assert.equal(parse(product(set)).protein_g, 0.3);
  delete set.nutrients['energy-kcal'];
  set.nutrients['energy-kj'] = { value: '418.4', unit: 'kJ' };
  assert.equal(Math.round(parse(product(set)).calories), 100);
});

test('rejects estimated/prepared data, unit mismatches and implausible per-100 values', () => {
  assert.throws(() => parse(product(inputSet('100g', { source: 'estimate' }))), /incomplete/);
  assert.throws(() => parse(product(inputSet('100g', { preparation: 'prepared' }))), /incomplete/);
  assert.throws(() => parse(product(inputSet('100ml', { per_unit: 'g' }))), /incomplete/);
  assert.throws(() => parse(product(inputSet('100g', { per_quantity: 50 }))), /incomplete/);
  const set = inputSet(); set.nutrients['energy-kcal'].value = 10000;
  assert.throws(() => parse(product(set)), /incomplete/);
  set.nutrients['energy-kcal'].value = 200; set.nutrients.proteins.unit = 'mg';
  assert.throws(() => parse(product(set)), /incomplete/);
});

test('aggregate fallback requires all macros and declared nutrition sources', () => {
  const p = product();
  const aggregate = inputSet();
  for (const n of Object.values(aggregate.nutrients)) n.source = 'packaging';
  p.nutrition.aggregated_set = aggregate;
  assert.equal(parse(p).calories, 200);
  delete aggregate.nutrients['energy-kcal'];
  assert.throws(() => parse(p), /incomplete/);
  aggregate.nutrients['energy-kcal'] = { value: 200, source: 'estimate' };
  assert.throws(() => parse(p), /incomplete/);
});

test('does not relabel aggregate millilitre inputs as grams', () => {
  const p = product();
  const aggregate = inputSet('100g');
  for (const n of Object.values(aggregate.nutrients)) Object.assign(n, { source: 'packaging', source_per: '100ml' });
  p.nutrition.aggregated_set = aggregate;
  assert.throws(() => parse(p), /incomplete/);
  p.nutrition.input_sets.push(inputSet('100ml'));
  assert.equal(parse(p).perLabel, 'per 100 ml');
});

test('saving rejects invalid serving multipliers and nutrition', () => {
  const p = parse(product(inputSet()));
  for (const servings of [0, -1, NaN, Infinity, Number.MAX_VALUE]) {
    assert.throws(() => barcodeToAnalysis(p, servings), /valid serving/);
  }
  assert.throws(() => barcodeToAnalysis({ ...p, calories: NaN }, 1), /complete nutrition/);
});

test('lookup separates missing products from incomplete nutrition and requests the v3 nutrition schema', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(new URL(url).searchParams.get('fields').includes('nutrition'), true);
    return response(product(inputSet()));
  });
  assert.equal((await lookupBarcode('12345678')).calories, 200);
  globalThis.fetch.mock.mockImplementation(async () => new Response(null, { status: 404 }));
  assert.equal(await lookupBarcode('00000000'), null);
  globalThis.fetch.mock.mockImplementation(async () => response(product(inputSet('100g', { nutrients: {} }))));
  await assert.rejects(lookupBarcode('12345678'), /incomplete/);
});

test('network, HTTP, malformed JSON and unexpected envelopes have actionable errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  await assert.rejects(lookupBarcode('12345678'), /connection/);
  globalThis.fetch.mock.mockImplementation(async () => new Response('down', { status: 503 }));
  await assert.rejects(lookupBarcode('12345678'), /Please try again/);
  globalThis.fetch.mock.mockImplementation(async () => new Response('<html>'));
  await assert.rejects(lookupBarcode('12345678'), /unreadable/);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ status: 'failure' }));
  await assert.rejects(lookupBarcode('12345678'), /unexpected/);
});

test('lookup deadline covers stalled response bodies, not just response headers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let readingBody = false;
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    requestSignal = signal;
    return { status: 200, ok: true, json: () => {
      readingBody = true;
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    } };
  });
  const pending = assert.rejects(lookupBarcode('12345678'), /too long/);
  await Promise.resolve();
  assert.equal(readingBody, true);
  t.mock.timers.tick(BARCODE_TIMEOUT_MS);
  await pending;
  assert.equal(requestSignal.aborted, true);
});

test('caller cancellation aborts in-flight requests and a pre-cancelled request never fetches', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const controller = new AbortController();
  const pending = assert.rejects(lookupBarcode('12345678', controller.signal), { name: 'AbortError' });
  controller.abort();
  await pending;
  await assert.rejects(lookupBarcode('12345678', controller.signal), { name: 'AbortError' });
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});
