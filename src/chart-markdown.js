const CHART_TYPES = new Set(['bar', 'line', 'pie', 'doughnut', 'polar', 'radar']);
const MAX_LABELS = 12;

export function normalizeChartDefinition(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Chart data mesti dalam format object.' };
  }

  const type = input.type === 'circle' ? 'doughnut' : String(input.type || 'bar').toLowerCase();
  if (!CHART_TYPES.has(type)) {
    return { ok: false, error: 'Jenis chart tidak disokong.' };
  }

  const rawLabels = Array.isArray(input.labels) ? input.labels : [];
  const rawValues = Array.isArray(input.values) ? input.values : [];
  if (rawLabels.length < 2) {
    return { ok: false, error: 'Chart memerlukan sekurang-kurangnya dua data.' };
  }
  if (rawLabels.length > MAX_LABELS) {
    return { ok: false, error: `Chart menyokong maksimum ${MAX_LABELS} data.` };
  }
  if (rawLabels.length !== rawValues.length) {
    return { ok: false, error: 'Setiap label mesti mempunyai satu nilai.' };
  }
  if (type === 'radar' && rawLabels.length < 3) {
    return { ok: false, error: 'Radar chart memerlukan sekurang-kurangnya tiga data.' };
  }

  const labels = rawLabels.map(label => String(label ?? '').trim());
  if (labels.some(label => !label)) {
    return { ok: false, error: 'Label chart tidak boleh kosong.' };
  }

  const values = rawValues.map(value => Number(value));
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    return { ok: false, error: 'Nilai chart mesti nombor positif atau sifar.' };
  }
  if (['pie', 'doughnut', 'polar'].includes(type) && !values.some(value => value > 0)) {
    return { ok: false, error: 'Pie, donut dan polar memerlukan sekurang-kurangnya satu nilai positif.' };
  }

  const title = String(input.title || 'Chart').trim().slice(0, 120) || 'Chart';
  return {
    ok: true,
    chart: { type, title, labels, values }
  };
}

export function parseChartDefinition(source) {
  try {
    return normalizeChartDefinition(JSON.parse(String(source || '').trim()));
  } catch {
    return { ok: false, error: 'Format data chart tidak sah.' };
  }
}

export function serializeChartBlock(chart) {
  const normalized = normalizeChartDefinition(chart);
  if (!normalized.ok) throw new Error(normalized.error);
  return `\`\`\`chart\n${JSON.stringify(normalized.chart)}\n\`\`\``;
}

export function getChartFractions(values) {
  const numericValues = values.map(value => Number(value));
  const max = Math.max(...numericValues, 0);
  if (!max) return numericValues.map(() => 0);
  const scaled = numericValues.map(value => value / max);
  const total = scaled.reduce((sum, value) => sum + value, 0);
  return scaled.map(value => value / total);
}

function pointOnCircle(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
}

export function buildChartArcPath(cx, cy, outerRadius, startAngle, endAngle, innerRadius = 0) {
  const sweep = endAngle - startAngle;
  const outerStart = pointOnCircle(cx, cy, outerRadius, startAngle);
  const outerEnd = pointOnCircle(cx, cy, outerRadius, endAngle);
  if (sweep >= Math.PI * 2 - 1e-8) {
    const outerMiddle = pointOnCircle(cx, cy, outerRadius, startAngle + Math.PI);
    if (!innerRadius) {
      return `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 1 1 ${outerMiddle.x} ${outerMiddle.y} A ${outerRadius} ${outerRadius} 0 1 1 ${outerStart.x} ${outerStart.y} Z`;
    }
    const innerStart = pointOnCircle(cx, cy, innerRadius, startAngle);
    const innerMiddle = pointOnCircle(cx, cy, innerRadius, startAngle + Math.PI);
    return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 1 1 ${outerMiddle.x} ${outerMiddle.y} A ${outerRadius} ${outerRadius} 0 1 1 ${outerStart.x} ${outerStart.y} L ${innerStart.x} ${innerStart.y} A ${innerRadius} ${innerRadius} 0 1 0 ${innerMiddle.x} ${innerMiddle.y} A ${innerRadius} ${innerRadius} 0 1 0 ${innerStart.x} ${innerStart.y} Z`;
  }

  const largeArc = sweep > Math.PI ? 1 : 0;
  if (!innerRadius) {
    return `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
  }
  const innerEnd = pointOnCircle(cx, cy, innerRadius, endAngle);
  const innerStart = pointOnCircle(cx, cy, innerRadius, startAngle);
  return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
}