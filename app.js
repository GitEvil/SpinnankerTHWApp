import {
  computeBruchlast,
  parseLength,
  summarise,
  rodExceedsLength,
  ROD_LENGTH_M,
  EXPECTED_RODS,
} from './calculation.js';

const form = document.querySelector('#protocolForm');
const rodRows = document.querySelector('#rodRows');
const sumEGEl = document.querySelector('#sumEG');
const sumKGEl = document.querySelector('#sumKG');
const meanEGEl = document.querySelector('#meanEG');
const meanKGEl = document.querySelector('#meanKG');
const verticalValue = document.querySelector('#verticalValue');
const horizontalValue = document.querySelector('#horizontalValue');
const resultSummary = document.querySelector('#resultSummary');
const detailList = document.querySelector('#detailList');
const warningBox = document.querySelector('#warningBox');
const exampleButton = document.querySelector('#exampleButton');
const resetButton = document.querySelector('#resetButton');

// Beispiel aus der Anleitung (Bild 24): Mittel EG 1,36 m, Gesamtlänge 2,00 m.
// EG- und KG-Abschnitte ergänzen sich hier je Stab zur vollen Stablänge (2 m),
// d. h. Mittel KG = 0,64 m. Ergebnis: 27,9 kN vertikal.
const EXAMPLE_EG = [1.30, 1.42, 1.35, 1.40, 1.28, 1.45, 1.33, 1.38, 1.36, 1.30, 1.44, 1.31];
const EXAMPLE_KG = EXAMPLE_EG.map((eg) => Number((ROD_LENGTH_M - eg).toFixed(2)));

function fmt(value, digits = 2) {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Baut die 12 Eingabezeilen (je Stab EG + KG) auf.
function buildRows() {
  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= EXPECTED_RODS; i += 1) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <th scope="row">${i}</th>
      <td>
        <input type="text" inputmode="decimal" class="eg-input"
          data-index="${i}" aria-label="Stab ${i} Eilgang [m]"
          placeholder="0,00" />
      </td>
      <td>
        <input type="text" inputmode="decimal" class="kg-input"
          data-index="${i}" aria-label="Stab ${i} Kraftgang [m]"
          placeholder="0,00" />
      </td>
    `;
    fragment.appendChild(tr);
  }
  rodRows.appendChild(fragment);
}

function readColumn(selector) {
  return Array.from(document.querySelectorAll(selector)).map((el) => el.value);
}

function readInputs() {
  return {
    egLengths: readColumn('.eg-input'),
    kgLengths: readColumn('.kg-input'),
  };
}

// Aktualisiert live Summe und Mittelwert unter der Tabelle.
function updateFooter() {
  const { egLengths, kgLengths } = readInputs();
  const eg = summarise(egLengths);
  const kg = summarise(kgLengths);
  sumEGEl.textContent = eg.count ? `${fmt(eg.sum)} m` : '–';
  sumKGEl.textContent = kg.count ? `${fmt(kg.sum)} m` : '–';
  meanEGEl.textContent = eg.count ? `${fmt(eg.mean)} m` : '–';
  meanKGEl.textContent = kg.count ? `${fmt(kg.mean)} m` : '–';

  // Ungültige Werte direkt markieren (Bereich 0..2 m sowie EG + KG ≤ 2 m).
  const egInputs = document.querySelectorAll('.eg-input');
  const kgInputs = document.querySelectorAll('.kg-input');
  const outOfRange = (el) => {
    const n = parseLength(el.value);
    return el.value.trim() !== '' && (!Number.isFinite(n) || n < 0 || n > ROD_LENGTH_M);
  };
  egInputs.forEach((egEl, i) => {
    const kgEl = kgInputs[i];
    const pairOverlong = rodExceedsLength(egEl.value, kgEl.value);
    egEl.classList.toggle('invalid', outOfRange(egEl) || pairOverlong);
    kgEl.classList.toggle('invalid', outOfRange(kgEl) || pairOverlong);
  });
}

function renderResult(result) {
  verticalValue.textContent = fmt(result.verticalKN, 1);
  horizontalValue.textContent = fmt(result.horizontalKN, 1);

  resultSummary.textContent =
    `Bei einer mittleren Stablänge von ${fmt(result.meanEG)} m (EG) und `
    + `${fmt(result.meanKG)} m (KG) beträgt die Bruchlast `
    + `${fmt(result.verticalKN, 1)} kN vertikal bzw. `
    + `${fmt(result.horizontalKN, 1)} kN horizontal.`;

  detailList.innerHTML = `
    <li>Mittelwert EG: <strong>${fmt(result.meanEG)} m</strong>
      (Summe ${fmt(result.sumEG)} m / ${result.countEG} Stäbe)</li>
    <li>Mittelwert KG: <strong>${fmt(result.meanKG)} m</strong>
      (Summe ${fmt(result.sumKG)} m / ${result.countKG} Stäbe)</li>
    <li>Maßgebend (konservativ): <strong>${fmt(result.governingKN, 1)} kN</strong></li>
  `;

  if (result.warnings.length) {
    warningBox.hidden = false;
    warningBox.innerHTML = `<strong>Hinweis:</strong><ul>${result.warnings
      .map((w) => `<li>${w}</li>`)
      .join('')}</ul>`;
  } else {
    warningBox.hidden = true;
    warningBox.innerHTML = '';
  }
}

function calculate(event) {
  if (event) event.preventDefault();
  const result = computeBruchlast(readInputs());
  if (!result.hasInput) {
    resultSummary.textContent =
      'Bitte zuerst mindestens eine Stablänge eintragen.';
    return;
  }
  renderResult(result);
}

function fillExample() {
  document.querySelectorAll('.eg-input').forEach((el, i) => {
    el.value = fmt(EXAMPLE_EG[i]);
  });
  document.querySelectorAll('.kg-input').forEach((el, i) => {
    el.value = fmt(EXAMPLE_KG[i]);
  });
  updateFooter();
  calculate();
}

function resetForm() {
  document.querySelectorAll('.eg-input, .kg-input').forEach((el) => {
    el.value = '';
    el.classList.remove('invalid');
  });
  updateFooter();
  verticalValue.textContent = '–';
  horizontalValue.textContent = '–';
  detailList.innerHTML = '';
  warningBox.hidden = true;
  resultSummary.textContent =
    'Tragen Sie die Stablängen ein und drücken Sie „Bruchlast berechnen“.';
}

buildRows();
form.addEventListener('input', updateFooter);
form.addEventListener('submit', calculate);
exampleButton.addEventListener('click', fillExample);
resetButton.addEventListener('click', resetForm);
updateFooter();
