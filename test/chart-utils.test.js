import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChartConfig, renderChartHtml, serializeChartBlock } from '../src/chart-utils.js';

test('parseChartConfig reads JSON chart definition and normalizes dataset values', () => {
  const config = parseChartConfig({
    type: 'bar',
    title: 'Sales',
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      { label: 'Product A', values: [10, 20, 15] },
      { label: 'Product B', values: [8, 16, 12] }
    ]
  });

  assert.equal(config.type, 'bar');
  assert.deepEqual(config.labels, ['Jan', 'Feb', 'Mar']);
  assert.equal(config.datasets.length, 2);
  assert.equal(config.datasets[1].label, 'Product B');
  assert.deepEqual(config.datasets[0].values, [10, 20, 15]);
});

test('serializeChartBlock produces a portable chart block for markdown content', () => {
  const block = serializeChartBlock({
    type: 'pie',
    title: 'Traffic share',
    labels: ['Organic', 'Paid', 'Referral'],
    datasets: [{ label: 'Visits', values: [55, 30, 15] }]
  });

  assert.match(block, /^:::chart\s*\n/);
  assert.match(block, /"type":"pie"/);
  assert.match(block, /"labels":\["Organic","Paid","Referral"\]/);
});

test('renderChartHtml keeps SVG markup for view-mode rendering', () => {
  const html = renderChartHtml({
    type: 'bar',
    title: 'Revenue',
    labels: ['Q1', 'Q2', 'Q3'],
    datasets: [{ label: 'Sales', values: [12, 18, 15] }]
  });

  assert.match(html, /<svg/);
  assert.match(html, /chart-card/);
  assert.match(html, /Revenue/);
});
