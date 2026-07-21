// Berechnung der Bruchlast (Traglast) für Spinnanker Type XII
// ----------------------------------------------------------------------------
// Diese Datei bildet das offizielle Traglastdiagramm (Bild 20 / Bild 24,
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
// Eingabekonvention:
//   Je Stab werden die im Eilgang (EG) und im Kraftgang (KG) eingedrehten
//   Längen erfasst. Beide sind Abschnitte desselben 2-m-Stabes, daher gilt
//   je Stab:  EG + KG <= 2 m (Stablänge). Ein kleinerer Wert bedeutet, dass
//   der Stab nicht vollständig eingedreht werden konnte.
//
// Ablesekonstruktion aus der Anleitung (Bild 24):
//   1. Mittlere EG-Länge auf der EG-Kurve antragen -> Punkt A
//   2. Von A eine Parallele zur KG-Kurve ziehen
//   3. Um die zusätzlich im Kraftgang eingedrehte Länge (= MittelKG)
//      weiterlaufen und die Last ablesen
//   => Bruchlast = Steigung_EG * MittelEG + Steigung_KG * MittelKG

export const CURVE_SLOPES = {
  vertical: { eg: 9.0, kg: 24.5 }, // V: vertikale Zugrichtung [kN/m]
  horizontal: { eg: 5.0, kg: 13.6 }, // H: horizontale Zugrichtung [kN/m]
};

export const ROD_LENGTH_M = 2.0; // Stablänge / Mindest-Einbaulänge
export const EXPECTED_RODS = 12; // Stäbe je Ankerplatte

// Prüft für einen Stab, ob EG + KG die Stablänge überschreitet.
export function rodExceedsLength(egValue, kgValue) {
  const e = parseLength(egValue);
  const k = parseLength(kgValue);
  if (!Number.isFinite(e) || !Number.isFinite(k)) return false;
  return e + k > ROD_LENGTH_M + 1e-9;
}

// Wandelt eine Eingabe (Zahl oder Text mit Komma/Punkt) in eine Zahl um.
export function parseLength(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (value === null || value === undefined) return NaN;
  const cleaned = String(value).trim().replace(',', '.');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
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

// Kernberechnung: aus den 12 EG- und 12 KG-Stablängen die Bruchlast bestimmen.
export function computeBruchlast({ egLengths = [], kgLengths = [] } = {}) {
  const eg = summarise(egLengths);
  const kg = summarise(kgLengths);

  const meanEG = eg.mean;
  const meanKG = kg.mean;

  const loadFor = (slopes) => slopes.eg * meanEG + slopes.kg * meanKG;
  const verticalKN = loadFor(CURVE_SLOPES.vertical);
  const horizontalKN = loadFor(CURVE_SLOPES.horizontal);

  const warnings = [];
  const allLengths = [...egLengths, ...kgLengths]
    .map(parseLength)
    .filter(Number.isFinite);

  if (allLengths.some((n) => n < 0 || n > ROD_LENGTH_M)) {
    warnings.push(
      `Stablängen müssen zwischen 0 und ${ROD_LENGTH_M.toFixed(1)} m liegen.`,
    );
  }

  // Je Stab darf EG + KG die Stablänge (2 m) nicht überschreiten.
  const rodCount = Math.max(egLengths.length, kgLengths.length);
  const overlong = [];
  for (let i = 0; i < rodCount; i += 1) {
    const e = parseLength(egLengths[i]);
    const k = parseLength(kgLengths[i]);
    if (Number.isFinite(e) && Number.isFinite(k) && e + k > ROD_LENGTH_M + 1e-9) {
      overlong.push(i + 1);
    }
  }
  if (overlong.length) {
    warnings.push(
      `EG + KG darf je Stab ${ROD_LENGTH_M.toFixed(1)} m nicht überschreiten `
        + `(betroffen: Stab ${overlong.join(', ')}).`,
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

  const round1 = (n) => Number(n.toFixed(1));
  return {
    meanEG: Number(meanEG.toFixed(3)),
    meanKG: Number(meanKG.toFixed(3)),
    sumEG: Number(eg.sum.toFixed(3)),
    sumKG: Number(kg.sum.toFixed(3)),
    countEG: eg.count,
    countKG: kg.count,
    verticalKN: round1(verticalKN),
    horizontalKN: round1(horizontalKN),
    // Für eine schräge Abspannung ist der kleinere (horizontale) Wert konservativ.
    governingKN: round1(Math.min(verticalKN, horizontalKN)),
    overlongRods: overlong,
    warnings,
    hasInput: eg.count > 0 || kg.count > 0,
  };
}
