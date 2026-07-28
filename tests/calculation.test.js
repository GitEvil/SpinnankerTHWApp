import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBruchlast,
  computeBruchlastFromMeans,
  summarise,
  parseLength,
  rodKgBelowEg,
} from '../calculation.js';

test('parseLength accepts numbers, dot and comma decimals', () => {
  assert.equal(parseLength(1.5), 1.5);
  assert.equal(parseLength('1.5'), 1.5);
  assert.equal(parseLength('1,5'), 1.5);
  assert.ok(Number.isNaN(parseLength('')));
  assert.ok(Number.isNaN(parseLength('abc')));
});

test('summarise ignores empty cells', () => {
  const s = summarise(['1', '', '2', '   ', '3']);
  assert.equal(s.count, 3);
  assert.equal(s.sum, 6);
  assert.equal(s.mean, 2);
});

test('reproduces handbook Beispiel 1 (EG 0.60 m / KG 1.86 m -> 36 kN)', () => {
  const result = computeBruchlast({
    egLengths: [0.6, 0.75, 0.6, 0.55, 0.6, 0.52, 0.6, 0.7, 0.8, 0.6, 0.7, 0.2],
    kgLengths: [2.0, 2.0, 1.9, 1.7, 1.8, 1.6, 1.8, 1.9, 2.0, 1.6, 2.0, 2.0],
  });
  assert.equal(result.meanEG, 0.602); // 7,22/12 (Handbuch rundet auf 0,60)
  assert.equal(result.meanKG, 1.858); // 22,3/12
  // Handbuch liest 36 kN ab; Formel 9*0.602 + 24.5*1.257 = 36.2, abgerundet 36.
  assert.equal(result.verticalKN, 36);
  // 5*0.6 + 13.6*1.258 = 20.1, abgerundet 20.
  assert.equal(result.horizontalKN, 20);
  assert.equal(result.warnings.length, 0);
});

test('reproduces handbook Beispiel 2 (EG 1.36 m / KG 2.00 m -> 27 kN)', () => {
  const result = computeBruchlast({
    egLengths: [1.3, 1.35, 1.25, 1.4, 1.4, 1.25, 1.5, 1.3, 1.5, 1.32, 1.2, 1.5],
    kgLengths: new Array(12).fill(2.0),
  });
  assert.equal(result.meanEG, 1.356); // 16,27/12 (Handbuch rundet auf 1,36)
  assert.equal(result.meanKG, 2.0);
  // Handbuch liest 27 kN ab; Formel 9*1.356 + 24.5*0.644 = 27.99, abgerundet 27.
  assert.equal(result.verticalKN, 27);
  assert.equal(result.horizontalKN, 15);
  assert.equal(result.warnings.length, 0);
});

test('rodKgBelowEg flags rods where KG < EG', () => {
  assert.equal(rodKgBelowEg(0.6, 2.0), false);
  assert.equal(rodKgBelowEg(1.0, 1.0), false); // equal is allowed
  assert.equal(rodKgBelowEg(1.5, 1.2), true);
  assert.equal(rodKgBelowEg(1.5, ''), false); // incomplete pair
});

test('deeper final depth yields a higher breaking load', () => {
  const shallow = computeBruchlast({
    egLengths: new Array(12).fill(0.5),
    kgLengths: new Array(12).fill(1.0),
  });
  const deep = computeBruchlast({
    egLengths: new Array(12).fill(0.6),
    kgLengths: new Array(12).fill(2.0),
  });
  assert.ok(deep.verticalKN > shallow.verticalKN);
  assert.ok(deep.horizontalKN > shallow.horizontalKN);
});

test('warns when KG is smaller than EG on some rods', () => {
  const result = computeBruchlast({
    egLengths: new Array(12).fill(1.5),
    kgLengths: new Array(12).fill(1.2),
  });
  assert.ok(result.warnings.some((w) => w.includes('KG muss')));
  assert.deepEqual(result.kgBelowEgRods, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('warns when a length exceeds the rod length of 2 m', () => {
  const result = computeBruchlast({
    egLengths: new Array(12).fill(1.0),
    kgLengths: new Array(12).fill(2.5),
  });
  assert.ok(result.warnings.some((w) => w.includes('zwischen 0')));
});

test('warns when fewer than 12 rods are recorded', () => {
  const result = computeBruchlast({
    egLengths: [0.6, 0.6],
    kgLengths: [2.0, 2.0],
  });
  assert.ok(result.warnings.some((w) => w.includes('12 Stäbe')));
});

test('no input returns hasInput=false and zero load', () => {
  const result = computeBruchlast({ egLengths: [], kgLengths: [] });
  assert.equal(result.hasInput, false);
  assert.equal(result.verticalKN, 0);
});

test('means mode matches table mode for the same means (Beispiel 2)', () => {
  const means = computeBruchlastFromMeans({ meanEG: 1.36, meanKG: 2.0 });
  assert.equal(means.fromMeans, true);
  assert.equal(means.verticalKN, 27);
  assert.equal(means.horizontalKN, 15);
  assert.equal(means.governingKN, 15);
  assert.equal(means.warnings.length, 0);
});

test('means mode accepts comma decimals', () => {
  const means = computeBruchlastFromMeans({ meanEG: '0,60', meanKG: '1,86' });
  assert.equal(means.verticalKN, 36);
});

test('means mode flags KG < EG and out-of-range values', () => {
  const below = computeBruchlastFromMeans({ meanEG: 1.5, meanKG: 1.2 });
  assert.ok(below.warnings.some((w) => w.includes('KG muss')));

  const over = computeBruchlastFromMeans({ meanEG: 0.5, meanKG: 2.5 });
  assert.ok(over.warnings.some((w) => w.includes('zwischen 0')));
});

test('means mode reports incomplete when only one value is given', () => {
  const one = computeBruchlastFromMeans({ meanEG: 1.0, meanKG: '' });
  assert.equal(one.hasInput, true);
  assert.equal(one.incomplete, true);

  const none = computeBruchlastFromMeans({ meanEG: '', meanKG: '' });
  assert.equal(none.hasInput, false);
});
