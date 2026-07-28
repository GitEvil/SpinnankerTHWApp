// Berechnung der Bruchlast (Traglast) für Spinnanker Type XII
// ----------------------------------------------------------------------------
// Diese Datei bildet das offizielle Traglastdiagramm (Bild 20/22/24,
// "Designwiderstand Spinnanker XII / 1400 HTC") als Formel ab, damit das
// Ablesen im Koordinatensystem entfällt.
//
// Geltungsbereich der Kurven (laut Diagramm):
//   - Spinnanker Type XII
//   - Mindest-Einbaulänge 2 m (Stablänge 2000 mm)
//   - Bodenklasse 4
//   - Ein-/Ausdrehmaschine 1400 HTC
//
// Die vier Geraden im Diagramm gehen alle durch den Ursprung. Ihre Steigungen
// (Last je Meter Stablänge) wurden aus dem Originaldiagramm ausgemessen:
//   EG-V = 9,0   EG-H = 5,0   KG-V = 24,5   KG-H = 13,6   [kN/m]
//
// Eingabekonvention (laut Handbuch, Abschnitt 4.4/4.5):
//   Der Stab wird zuerst im Eilgang (EG) eingedreht bis der Eilgang blockiert,
//   danach im Kraftgang (KG) bis zur Endtiefe. Erfasst wird je Stab:
//     EG = Tiefe am Ende der Eilgang-Phase
//     KG = Endtiefe insgesamt (nach dem Kraftgang)
//   Daher gilt je Stab:  EG ≤ KG ≤ 2 m.
//
// Ablesekonstruktion aus dem Handbuch (Abschnitt 4.7, Bild 22/24):
//   1. Auf der EG-Kurve bis zur mittleren EG-Länge gehen           -> Punkt A
//   2. Von A eine Parallele zur KG-Kurve ziehen
//   3. Auf dieser bis zur mittleren KG-Länge weiterlaufen
//   4. Senkrecht zur Achse -> Designwiderstand ablesen
//   => Bruchlast = Steigung_EG · MittelEG + Steigung_KG · (MittelKG − MittelEG)
//
// Das Ergebnis wird konservativ auf ganze kN abgerundet – das entspricht dem
// Ablesen im Diagramm und reproduziert die Handbuch-Beispiele exakt
// (Beispiel 1: 36 kN, Beispiel 2: 27 kN).

export const CURVE_SLOPES = {
  vertical: { eg: 9.0, kg: 24.5 }, // V: vertikale Zugrichtung [kN/m]
  horizontal: { eg: 5.0, kg: 13.6 }, // H: horizontale Zugrichtung [kN/m]
};

export const ROD_LENGTH_M = 2.0; // Stablänge / max. Einbautiefe
export const EXPECTED_RODS = 12; // Stäbe je Ankerplatte

// Wandelt eine Eingabe (Zahl oder Text mit Komma/Punkt) in eine Zahl um.
export function parseLength(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (value === null || value === undefined) return NaN;
  const cleaned = String(value).trim().replace(',', '.');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

// Prüft für einen Stab, ob KG kleiner als EG ist (physikalisch unplausibel:
// der Kraftgang dreht den Stab tiefer, daher muss KG ≥ EG sein).
export function rodKgBelowEg(egValue, kgValue) {
  const e = parseLength(egValue);
  const k = parseLength(kgValue);
  if (!Number.isFinite(e) || !Number.isFinite(k)) return false;
  return k + 1e-9 < e;
}

// Summe, Mittelwert und Anzahl der ausgefüllten Werte einer Reihe.
export function summarise(values) {
  const nums = values.map(parseLength).filter((n) => Number.isFinite(n));
  const sum = nums.reduce((acc, n) => acc + n, 0);
  return {
    count: nums.length,
    sum,
    mean: nums.length ? sum / nums.length : 0,
  };
}

// Bruchlast aus den beiden Mittelwerten (in m) berechnen. Konservativ auf ganze
// kN abgerundet (entspricht dem Ablesen im Diagramm).
function resistanceFromMeans(meanEG, meanKG) {
  const kgDelta = Math.max(meanKG - meanEG, 0);
  const loadFor = (slopes) => slopes.eg * meanEG + slopes.kg * kgDelta;
  const verticalKN = Math.floor(loadFor(CURVE_SLOPES.vertical));
  const horizontalKN = Math.floor(loadFor(CURVE_SLOPES.horizontal));
  return { verticalKN, horizontalKN, governingKN: Math.min(verticalKN, horizontalKN) };
}

// Schnellmodus: Bruchlast direkt aus den beiden Mittelwerten (ohne Einzelstäbe).
export function computeBruchlastFromMeans({ meanEG, meanKG } = {}) {
  const e = parseLength(meanEG);
  const k = parseLength(meanKG);
  const eOk = Number.isFinite(e);
  const kOk = Number.isFinite(k);
  const hasInput = eOk || kOk;
  const complete = eOk && kOk;

  const warnings = [];
  if ([e, k].some((n) => Number.isFinite(n) && (n < 0 || n > ROD_LENGTH_M))) {
    warnings.push(
      `Mittelwerte müssen zwischen 0 und ${ROD_LENGTH_M.toFixed(1)} m liegen.`,
    );
  }
  if (complete && k + 1e-9 < e) {
    warnings.push(
      'Mittelwert KG muss ≥ Mittelwert EG sein '
        + '(Kraftgang dreht tiefer als Eilgang).',
    );
  }

  const result = resistanceFromMeans(eOk ? e : 0, kOk ? k : 0);
  return {
    meanEG: eOk ? Number(e.toFixed(3)) : 0,
    meanKG: kOk ? Number(k.toFixed(3)) : 0,
    ...result,
    warnings,
    hasInput,
    incomplete: hasInput && !complete,
    fromMeans: true,
  };
}

// Kernberechnung: aus den 12 EG- und 12 KG-Stablängen die Bruchlast bestimmen.
export function computeBruchlast({ egLengths = [], kgLengths = [] } = {}) {
  const eg = summarise(egLengths);
  const kg = summarise(kgLengths);

  const meanEG = eg.mean;
  const meanKG = kg.mean;
  const { verticalKN, horizontalKN, governingKN } = resistanceFromMeans(meanEG, meanKG);

  const warnings = [];
  const allLengths = [...egLengths, ...kgLengths]
    .map(parseLength)
    .filter(Number.isFinite);

  if (allLengths.some((n) => n < 0 || n > ROD_LENGTH_M)) {
    warnings.push(
      `Stablängen müssen zwischen 0 und ${ROD_LENGTH_M.toFixed(1)} m liegen.`,
    );
  }

  // Je Stab muss KG ≥ EG sein (Kraftgang dreht tiefer als Eilgang).
  const rodCount = Math.max(egLengths.length, kgLengths.length);
  const kgBelowEgRods = [];
  for (let i = 0; i < rodCount; i += 1) {
    if (rodKgBelowEg(egLengths[i], kgLengths[i])) kgBelowEgRods.push(i + 1);
  }
  if (kgBelowEgRods.length) {
    warnings.push(
      `KG muss je Stab ≥ EG sein (Kraftgang dreht tiefer als Eilgang). `
        + `Bitte prüfen: Stab ${kgBelowEgRods.join(', ')}.`,
    );
  }

  if (
    (eg.count > 0 || kg.count > 0)
    && (eg.count !== EXPECTED_RODS || kg.count !== EXPECTED_RODS)
  ) {
    warnings.push(
      `Je Ankerplatte sind ${EXPECTED_RODS} Stäbe vorgesehen `
        + `(erfasst: EG ${eg.count}, KG ${kg.count}).`,
    );
  }

  return {
    meanEG: Number(meanEG.toFixed(3)),
    meanKG: Number(meanKG.toFixed(3)),
    sumEG: Number(eg.sum.toFixed(3)),
    sumKG: Number(kg.sum.toFixed(3)),
    countEG: eg.count,
    countKG: kg.count,
    verticalKN,
    horizontalKN,
    // Für eine schräge Abspannung ist der kleinere (horizontale) Wert konservativ.
    governingKN,
    kgBelowEgRods,
    warnings,
    hasInput: eg.count > 0 || kg.count > 0,
  };
}
