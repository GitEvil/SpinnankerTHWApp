import {
  computeBruchlast,
  computeBruchlastFromMeans,
  parseLength,
  summarise,
  rodKgBelowEg,
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
const fillKgButton = document.querySelector('#fillKgButton');
const modeTableBtn = document.querySelector('#modeTable');
const modeMeansBtn = document.querySelector('#modeMeans');
const tableMode = document.querySelector('#tableMode');
const meansMode = document.querySelector('#meansMode');
const meanEgInput = document.querySelector('#meanEgInput');
const meanKgInput = document.querySelector('#meanKgInput');

let currentMode = 'table'; // 'table' | 'means'

// Beispiel 1 aus dem Handbuch (Bild 21/22): Mittel EG 0,60 m, Mittel KG 1,86 m
// -> vertikaler Designwiderstand 36 kN. KG ist die Endtiefe (nach Kraftgang).
const EXAMPLE_EG = [0.6, 0.75, 0.6, 0.55, 0.6, 0.52, 0.6, 0.7, 0.8, 0.6, 0.7, 0.2];
const EXAMPLE_KG = [2.0, 2.0, 1.9, 1.7, 1.8, 1.6, 1.8, 1.9, 2.0, 1.6, 2.0, 2.0];

function fmt(value, digits = 2) {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Baut die 12 Eingabezeilen (je Stab EG- und KG-Tiefe) auf.
function buildRows() {
  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= EXPECTED_RODS; i += 1) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <th scope="row">${i}</th>
      <td>
        <input type="text" inputmode="decimal" enterkeyhint="next" class="eg-input"
          data-index="${i}" aria-label="Stab ${i} Eilgang [m]"
          placeholder="0,00" />
      </td>
      <td>
        <input type="text" inputmode="decimal" enterkeyhint="next" class="kg-input"
          data-index="${i}" aria-label="Stab ${i} Kraftgang [m]"
          placeholder="2,00" />
      </td>
    `;
    fragment.appendChild(tr);
  }
  rodRows.appendChild(fragment);
}

function allInputs() {
  // Dokumentreihenfolge: Stab1-EG, Stab1-KG, Stab2-EG, … – ideal fürs Tabben.
  return Array.from(document.querySelectorAll('.eg-input, .kg-input'));
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

function readMeans() {
  return { meanEG: meanEgInput.value, meanKG: meanKgInput.value };
}

// Zwischen Tabellen- und Schnellmodus umschalten.
function setMode(mode) {
  currentMode = mode;
  const isTable = mode === 'table';
  tableMode.hidden = !isTable;
  meansMode.hidden = isTable;
  modeTableBtn.classList.toggle('is-active', isTable);
  modeMeansBtn.classList.toggle('is-active', !isTable);
  modeTableBtn.setAttribute('aria-pressed', String(isTable));
  modeMeansBtn.setAttribute('aria-pressed', String(!isTable));
  clearResult();
  if (!isTable) meanEgInput.focus();
}

// Live-Prüfung der beiden Mittelwert-Felder (Bereich 0..2 m, KG ≥ EG).
function validateMeans() {
  const outOfRange = (el) => {
    const n = parseLength(el.value);
    return el.value.trim() !== '' && (!Number.isFinite(n) || n < 0 || n > ROD_LENGTH_M);
  };
  const kgBelow = rodKgBelowEg(meanEgInput.value, meanKgInput.value);
  meanEgInput.classList.toggle('invalid', outOfRange(meanEgInput) || kgBelow);
  meanKgInput.classList.toggle('invalid', outOfRange(meanKgInput) || kgBelow);
}

// Enter/Return springt zum nächsten Feld – schnellere Eingabe am Tablet/Handy.
function handleEnter(event) {
  if (event.key !== 'Enter') return;
  const target = event.target;

  // Schnellmodus: EG -> KG -> berechnen.
  if (target === meanEgInput) {
    event.preventDefault();
    meanKgInput.focus();
    meanKgInput.select();
    return;
  }
  if (target === meanKgInput) {
    event.preventDefault();
    form.requestSubmit();
    return;
  }

  // Tabellenmodus: Feld für Feld weiterspringen, am Ende berechnen.
  if (!target.classList.contains('eg-input') && !target.classList.contains('kg-input')) return;
  event.preventDefault();
  const inputs = allInputs();
  const idx = inputs.indexOf(target);
  const next = inputs[idx + 1];
  if (next) {
    next.focus();
    next.select();
  } else {
    form.requestSubmit();
  }
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

  // Ungültige Werte markieren: Bereich 0..2 m sowie KG ≥ EG je Stab.
  const egInputs = document.querySelectorAll('.eg-input');
  const kgInputs = document.querySelectorAll('.kg-input');
  const outOfRange = (el) => {
    const n = parseLength(el.value);
    return el.value.trim() !== '' && (!Number.isFinite(n) || n < 0 || n > ROD_LENGTH_M);
  };
  egInputs.forEach((egEl, i) => {
    const kgEl = kgInputs[i];
    const kgBelow = rodKgBelowEg(egEl.value, kgEl.value);
    egEl.classList.toggle('invalid', outOfRange(egEl) || kgBelow);
    kgEl.classList.toggle('invalid', outOfRange(kgEl) || kgBelow);
  });
}

function renderResult(result) {
  verticalValue.textContent = String(result.verticalKN);
  horizontalValue.textContent = String(result.horizontalKN);

  resultSummary.textContent =
    `Bei einer mittleren Stablänge von ${fmt(result.meanEG)} m (EG) und `
    + `${fmt(result.meanKG)} m (KG) beträgt die Bruchlast `
    + `${result.verticalKN} kN vertikal bzw. `
    + `${result.horizontalKN} kN horizontal.`;

  const meanRows = result.fromMeans
    ? `
      <li>Mittelwert EG: <strong>${fmt(result.meanEG)} m</strong></li>
      <li>Mittelwert KG: <strong>${fmt(result.meanKG)} m</strong></li>`
    : `
      <li>Mittelwert EG: <strong>${fmt(result.meanEG)} m</strong>
        (Summe ${fmt(result.sumEG)} m / ${result.countEG} Stäbe)</li>
      <li>Mittelwert KG: <strong>${fmt(result.meanKG)} m</strong>
        (Summe ${fmt(result.sumKG)} m / ${result.countKG} Stäbe)</li>`;
  detailList.innerHTML = `${meanRows}
    <li>Maßgebend (konservativ): <strong>${result.governingKN} kN</strong></li>`;

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

function clearResult() {
  verticalValue.textContent = '–';
  horizontalValue.textContent = '–';
  detailList.innerHTML = '';
  warningBox.hidden = true;
  warningBox.innerHTML = '';
  resultSummary.textContent =
    'Werte eintragen und „Bruchlast berechnen“ drücken.';
}

function calculate(event) {
  if (event) event.preventDefault();
  const result = currentMode === 'means'
    ? computeBruchlastFromMeans(readMeans())
    : computeBruchlast(readInputs());

  if (!result.hasInput) {
    clearResult();
    resultSummary.textContent = currentMode === 'means'
      ? 'Bitte die Mittelwerte für EG und KG eintragen.'
      : 'Bitte zuerst mindestens eine Stablänge eintragen.';
    return;
  }
  if (result.incomplete) {
    clearResult();
    resultSummary.textContent = 'Bitte beide Mittelwerte (EG und KG) eintragen.';
    return;
  }
  renderResult(result);
}

// Leere KG-Felder mit der vollen Stablänge (2,0 m) füllen. Häufigster Fall:
// der Stab wurde im Kraftgang bis zur vollen Tiefe eingedreht. Bereits
// eingetragene Werte bleiben unangetastet.
function fillKgRemaining() {
  document.querySelectorAll('.kg-input').forEach((el) => {
    if (el.value.trim() === '') el.value = fmt(ROD_LENGTH_M);
  });
  updateFooter();
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
  meanEgInput.value = '';
  meanKgInput.value = '';
  meanEgInput.classList.remove('invalid');
  meanKgInput.classList.remove('invalid');
  updateFooter();
  clearResult();
}

buildRows();
form.addEventListener('input', () => {
  updateFooter();
  validateMeans();
});
form.addEventListener('keydown', handleEnter);
form.addEventListener('submit', calculate);
exampleButton.addEventListener('click', fillExample);
resetButton.addEventListener('click', resetForm);
fillKgButton.addEventListener('click', fillKgRemaining);
modeTableBtn.addEventListener('click', () => setMode('table'));
modeMeansBtn.addEventListener('click', () => setMode('means'));
updateFooter();

// Service Worker nur bei echtem Hosting (http/https) registrieren – beim
// direkten Öffnen der Einzeldatei (file://) gibt es keinen Service Worker.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline-Funktion optional – Fehler bewusst ignorieren */
    });
  });
}
