const CHART_TYPES = new Set(['bar', 'line', 'pie', 'circle', 'doughnut', 'radar']);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeChartType(type) {
  const normalized = String(type ?? 'bar').trim().toLowerCase();
  return CHART_TYPES.has(normalized) ? normalized : 'bar';
}

export function parseChartConfig(input) {
  const raw = typeof input === 'string' ? (() => {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  })() : (input || {});

  const labels = Array.isArray(raw.labels) ? raw.labels.map((label) => String(label ?? '')) : [];
  const datasetEntries = Array.isArray(raw.datasets) ? raw.datasets : [];
  const datasets = datasetEntries.map((dataset, index) => {
    const values = Array.isArray(dataset?.values) ? dataset.values.map((value) => normalizeNumber(value, 0)) : [];
    return {
      label: String(dataset?.label ?? `Series ${index + 1}`),
      values
    };
  });

  const resolvedLabels = labels.length
    ? labels.map((label, index) => label.trim() || `Item ${index + 1}`)
    : (datasets[0]?.values?.length
      ? Array.from({ length: datasets[0].values.length }, (_, index) => `Item ${index + 1}`)
      : ['A']);

  const maxLength = Math.max(resolvedLabels.length, ...datasets.map((dataset) => dataset.values.length), 1);
  const finalLabels = Array.from({ length: maxLength }, (_, index) => resolvedLabels[index] || `Item ${index + 1}`);

  const finalDatasets = datasets.length
    ? datasets.map((dataset) => ({
        label: dataset.label || 'Series',
        values: Array.from({ length: maxLength }, (_, index) => normalizeNumber(dataset.values[index], 0))
      }))
    : [{ label: 'Total', values: Array.from({ length: maxLength }, (_, index) => (index % 2 === 0 ? 12 : 18)) }];

  return {
    type: normalizeChartType(raw.type),
    title: String(raw.title || 'Chart').trim() || 'Chart',
    labels: finalLabels,
    datasets: finalDatasets
  };
}

export function serializeChartBlock(config) {
  return `:::chart\n${JSON.stringify(parseChartConfig(config))}\n:::\n`;
}

function polarToCartesian(cx, cy, r, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians)
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

function buildLegend(chart) {
  const colors = ['#2f6fed', '#4cc9f0', '#f72585', '#f4a261', '#2ec4b6', '#ffb703', '#8ac926', '#b5179e'];
  return chart.datasets.map((dataset, index) => `
    <div class="chart-legend-item">
      <span class="chart-legend-swatch" style="background:${colors[index % colors.length]};"></span>
      <span>${escapeHtml(dataset.label)}</span>
    </div>
  `).join('');
}

function renderBarChart(chart) {
  const width = 420;
  const height = 220;
  const padding = { top: 18, right: 18, bottom: 40, left: 42 };
  const seriesCount = chart.datasets.length || 1;
  const groupWidth = (width - padding.left - padding.right) / Math.max(chart.labels.length, 1);
  const maxValue = Math.max(...chart.datasets.flatMap((dataset) => dataset.values), 1);
  const colors = ['#2f6fed', '#4cc9f0', '#f72585', '#f4a261', '#2ec4b6'];

  const bars = chart.labels.map((label, index) => {
    const x0 = padding.left + index * groupWidth;
    const slotWidth = groupWidth / Math.max(seriesCount, 1);
    return chart.datasets.map((dataset, seriesIndex) => {
      const value = Number(dataset.values[index] || 0);
      const barHeight = (value / maxValue) * (height - padding.top - padding.bottom);
      const x = x0 + seriesIndex * slotWidth + slotWidth * 0.14;
      const y = height - padding.bottom - barHeight;
      const widthValue = slotWidth * 0.7;
      return `<rect x="${x}" y="${y}" width="${widthValue}" height="${barHeight}" rx="6" fill="${colors[seriesIndex % colors.length]}" opacity="0.9"></rect>`;
    }).join('');
  }).join('');

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = (maxValue / 4) * i;
    const y = height - padding.bottom - ((value / maxValue) * (height - padding.top - padding.bottom));
    return `<line x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}" stroke="rgba(31,35,40,.12)" stroke-width="1" />`;
  }).join('');

  const labelsMarkup = chart.labels.map((label, index) => {
    const x = padding.left + index * groupWidth + groupWidth / 2;
    return `<text x="${x}" y="${height - 12}" text-anchor="middle" font-size="10" fill="#6b7280">${escapeHtml(label)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.title)}" class="chart-svg chart-svg-bar">
      ${gridLines}
      ${bars}
      ${labelsMarkup}
    </svg>
  `;
}

function renderLineChart(chart) {
  const width = 420;
  const height = 220;
  const padding = { top: 18, right: 18, bottom: 40, left: 42 };
  const maxValue = Math.max(...chart.datasets.flatMap((dataset) => dataset.values), 1);
  const colors = ['#2f6fed', '#4cc9f0', '#f72585', '#f4a261'];

  const seriesMarkup = chart.datasets.map((dataset, seriesIndex) => {
    const points = dataset.values.map((value, index) => {
      const x = padding.left + (index / Math.max(chart.labels.length - 1, 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((Number(value) || 0) / maxValue) * (height - padding.top - padding.bottom);
      return `${x},${y}`;
    }).join(' ');

    return `
      <polyline points="${points}" fill="none" stroke="${colors[seriesIndex % colors.length]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${dataset.values.map((value, index) => {
        const x = padding.left + (index / Math.max(chart.labels.length - 1, 1)) * (width - padding.left - padding.right);
        const y = height - padding.bottom - ((Number(value) || 0) / maxValue) * (height - padding.top - padding.bottom);
        return `<circle cx="${x}" cy="${y}" r="4" fill="${colors[seriesIndex % colors.length]}" />`;
      }).join('')}
    `;
  }).join('');

  const labelsMarkup = chart.labels.map((label, index) => {
    const x = padding.left + (index / Math.max(chart.labels.length - 1, 1)) * (width - padding.left - padding.right);
    return `<text x="${x}" y="${height - 12}" text-anchor="middle" font-size="10" fill="#6b7280">${escapeHtml(label)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.title)}" class="chart-svg chart-svg-line">
      ${seriesMarkup}
      ${labelsMarkup}
    </svg>
  `;
}

function renderPieChart(chart) {
  const width = 320;
  const height = 220;
  const cx = 120;
  const cy = 110;
  const radius = 82;
  const colors = ['#2f6fed', '#4cc9f0', '#f72585', '#f4a261', '#2ec4b6', '#ffb703'];
  const total = Math.max(chart.datasets.reduce((sum, dataset) => sum + dataset.values.reduce((inner, value) => inner + (Number(value) || 0), 0), 0), 1);
  let cumulative = 0;

  const slices = chart.datasets.flatMap((dataset, datasetIndex) =>
    dataset.values.map((value, valueIndex) => {
      const sliceValue = Number(value) || 0;
      const angle = (sliceValue / total) * 360;
      const startAngle = cumulative;
      cumulative += angle;
      const endAngle = cumulative;
      const isCircle = chart.type === 'circle';
      const innerRadius = isCircle ? 46 : 0;
      const outerRadius = radius;
      const start = polarToCartesian(cx, cy, outerRadius, endAngle);
      const end = polarToCartesian(cx, cy, outerRadius, startAngle);
      const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
      const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
      const largeArcFlag = angle > 180 ? 1 : 0;
      const path = [
        'M', start.x, start.y,
        'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
        'L', innerEnd.x, innerEnd.y,
        'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
        'Z'
      ].join(' ');
      const fill = colors[(datasetIndex + valueIndex) % colors.length];
      return `<path d="${path}" fill="${fill}" opacity="0.9"></path>`;
    })
  ).join('');

  const centerText = chart.datasets.length ? chart.datasets[0].values.reduce((sum, value) => sum + (Number(value) || 0), 0) : 0;
  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.title)}" class="chart-svg chart-svg-pie">
      <g transform="translate(0, 0)">${slices}</g>
      <circle cx="${cx}" cy="${cy}" r="${chart.type === 'circle' ? 38 : 0}" fill="white"></circle>
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="18" font-weight="700" fill="#1f2328">${centerText}</text>
      <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="10" fill="#6b7280">Total</text>
    </svg>
  `;
}

export function renderChartHtml(config) {
  const chart = parseChartConfig(config);
  const seriesSummary = chart.datasets.map((dataset) => `${dataset.label}: ${dataset.values.join(', ')}`).join(' | ');

  let chartSvg = renderBarChart(chart);
  if (chart.type === 'line') chartSvg = renderLineChart(chart);
  if (chart.type === 'pie' || chart.type === 'circle' || chart.type === 'doughnut') chartSvg = renderPieChart(chart);

  return `
    <div class="chart-card" data-chart-title="${escapeHtml(chart.title)}" data-chart-type="${escapeHtml(chart.type)}" data-chart-config="${encodeURIComponent(JSON.stringify(chart))}">
      <div class="chart-header">
        <h3>${escapeHtml(chart.title)}</h3>
      </div>
      ${chartSvg}
      <div class="chart-legend">${buildLegend(chart)}</div>
      <div class="chart-meta">${escapeHtml(seriesSummary)}</div>
    </div>
  `;
}
