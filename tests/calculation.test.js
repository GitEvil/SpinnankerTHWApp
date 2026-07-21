import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBruchlast,
  summarise,
  parseLength,
  rodExceedsLength,
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

test('reproduces the documented example (Bild 24): EG 1.36 m + KG 0.64 m ≈ 27 kN', () => {
  // EG- und KG-Abschnitte ergänzen sich je Stab zur vollen Stablänge (2 m).
  const result = computeBruchlast({
    egLengths: new Array(12).fill(1.36),
    kgLengths: new Array(12).fill(0.64),
  });

  assert.equal(result.meanEG, 1.36);
  assert.equal(result.meanKG, 0.64);
  // Diagramm-Ablesung ~27 kN; Formel liefert 27,9 kN (innerhalb Ablesetoleranz).
  assert.ok(
    result.verticalKN >= 27 && result.verticalKN <= 29,
    `verticalKN=${result.verticalKN}`,
  );
  // Formel: 9*1.36 + 24.5*0.64 = 27.92
  assert.equal(result.verticalKN, 27.9);
  // Formel: 5*1.36 + 13.6*0.64 = 15.5
  assert.equal(result.horizontalKN, 15.5);
  assert.equal(result.governingKN, 15.5);
  assert.equal(result.warnings.length, 0);
});

test('rodExceedsLength enforces EG + KG <= 2 m', () => {
  assert.equal(rodExceedsLength(1.4, 0.6), false); // exactly 2.0
  assert.equal(rodExceedsLength(1.4, 0.7), true); // 2.1
  assert.equal(rodExceedsLength(1.4, ''), false); // incomplete pair
});

test('deeper embedment yields a higher breaking load', () => {
  const shallow = computeBruchlast({
    egLengths: new Array(12).fill(0.8),
    kgLengths: new Array(12).fill(0.4),
  });
  const deep = computeBruchlast({
    egLengths: new Array(12).fill(1.4),
    kgLengths: new Array(12).fill(0.6),
  });
  assert.ok(deep.verticalKN > shallow.verticalKN);
  assert.ok(deep.horizontalKN > shallow.horizontalKN);
});

test('warns when EG + KG exceeds the rod length of 2 m', () => {
  const result = computeBruchlast({
    egLengths: new Array(12).fill(1.4),
    kgLengths: new Array(12).fill(0.8),
  });
  assert.ok(result.warnings.some((w) => w.includes('EG + KG')));
  assert.deepEqual(result.overlongRods, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('warns when a single length exceeds 2 m', () => {
  const result = computeBruchlast({
    egLengths: new Array(12).fill(2.5),
    kgLengths: new Array(12).fill(0),
  });
  assert.ok(result.warnings.some((w) => w.includes('zwischen 0')));
});

test('warns when fewer than 12 rods are recorded', () => {
  const result = computeBruchlast({
    egLengths: [1.2, 1.3],
    kgLengths: [2.0, 2.0],
  });
  assert.ok(result.warnings.some((w) => w.includes('12 Stäbe')));
});

test('no input returns hasInput=false and zero load', () => {
  const result = computeBruchlast({ egLengths: [], kgLengths: [] });
  assert.equal(result.hasInput, false);
  assert.equal(result.verticalKN, 0);
});
