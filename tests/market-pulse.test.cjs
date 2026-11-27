// Exercise the real TSX component with React server rendering, no test-runner deps.
// Run: node --test tests/market-pulse.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
const cache = new Map()
function load(relative) {
  const filename = path.join(root, relative)
  if (cache.has(filename)) return cache.get(filename)
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  })
  const module = { exports: {} }
  const localRequire = name => name === '@/lib/types' ? load('lib/types.ts')
    : name === './Icons' ? load('components/Icons.tsx') : require(name)
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports)
  cache.set(filename, module.exports)
  return module.exports
}
const BenchmarkBar = load('components/BenchmarkBar.tsx').default
const fields = ['day_pct', 'week_pct', 'month_pct', 'quarter_pct', 'half_year_pct', 'ytd_pct', 'year_pct', 'five_year_pct']
const periods = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y']
const tickers = ['^GSPC', '^IXIC', '^DJI', 'EFA', 'DX-Y.NYB', 'BTC-USD']
const fixtures = tickers.map((ticker, i) => ({
  id: i + 1, ticker, name: `fixture-${i}`, updated_at: '2026-01-01T00:00:00Z',
  ...Object.fromEntries(fields.map((field, j) => [field, j % 2 ? -j - 1.25 : j + 1.25])),
}))
const render = (benchmarks = fixtures, period = '1M') => renderToStaticMarkup(React.createElement(BenchmarkBar, { benchmarks, period }))

test('renders the original four and DXY/BTC as six unchanged-style tiles', () => {
  const html = render()
  for (const label of ['S&amp;P 500', 'Nasdaq', 'Dow', 'Intl Dev', 'DXY', 'BTC']) assert.ok(html.includes(`>${label}</p>`), label)
  assert.equal((html.match(/class="bench-tile /g) || []).length, 6)
  assert.match(html, /grid-cols-2 sm:grid-cols-3 lg:grid-cols-6/)
  assert.match(html, /rounded-\[20px\]/)
  assert.match(html, /not live/)
  assert.match(html, /BTC trades 24\/7/)
})
test('every period selects and formats its actual return for all six tiles', () => {
  periods.forEach((period, i) => {
    const value = fixtures[0][fields[i]]
    const expected = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
    const html = render(fixtures, period)
    assert.equal(html.split(expected).length - 1, 6, period)
  })
})
test('null stays a dash, zero stays +0.00%, negatives retain their sign', () => {
  const data = fixtures.map(row => ({ ...row, month_pct: null }))
  data[4].month_pct = 0
  data[5].month_pct = -2.5
  const html = render(data)
  assert.equal((html.match(/>—<\/p>/g) || []).length, 4)
  assert.match(html, /\+0\.00%/)
  assert.match(html, /-2\.50%/)
  assert.doesNotMatch(html, /NaN|undefined/)
})
test('empty and pre-migration four-row datasets remain supported', () => {
  assert.equal(render([]), '')
  assert.equal((render(fixtures.slice(0, 4)).match(/class="bench-tile /g) || []).length, 4)
})
