(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const I = root.NKMInsights, R = root.NKMReport;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  const pct = value => value === null ? 'Unavailable' : (value * 100).toFixed(1) + '%';
  const label = value => nkmStoreLabel(value);
  let productMetric = 'gmv';
  const ids = ['action-grid', 'weekday-chart', 'lifecycle-mini', 'basis-note', 'health-summary',
    'lifecycle-chart', 'pending-summary', 'health-store-rows', 'store-comparison-rows',
    'store-comparison-note', 'product-summary', 'product-chart', 'source-grid', 'source-coverage'];
  function clear() { for (const id of ids) $(id).replaceChildren(); }
  function mini(el, cards) {
    el.innerHTML = cards.map(([name, value, note]) => `<article><span>${esc(name)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('');
  }
  function lifecycle(el, health, compact = false) {
    el.innerHTML = health.groups.filter(group => !compact || group.orders > 0).map(group => {
      const share = I.ratio(group.gmv, health.total.gmv);
      return `<div class="value-row" ${NKMCharts.details(group.label,[["Order value",money.format(group.gmv)],["Orders",number.format(group.orders)],["Value share",pct(share)],["Order share",pct(I.ratio(group.orders,health.total.orders))]],group.note+" All statuses are included in the denominator; values are not verified refunds or payouts.")}><div><span>${esc(group.label)}</span><b>${money.format(group.gmv)}</b></div><div class="value-track"><i class="bucket-${group.key}" style="width:${share === null ? 0 : Math.max(0, share * 100)}%"></i></div><small>${number.format(group.orders)} orders${compact ? '' : ' · ' + esc(group.note)}</small></div>`;
    }).join('') || '<p>No orders match this period.</p>';
  }
  function sources({ state, history, allowed, dataset, range }) {
    if (!allowed) { clear(); return; }
    const months = [...(state?.months || [])].sort();
    const definitions = [
      ['Order exports', months.length ? 'Available' : 'No imports', 'Daily order value, orders, units, AOV, stores and order statuses. Product totals support the selected order dates.', months.length > 0],
      ['Advertising', 'Not connected', 'Ad spend, clicks, impressions, attributed conversions and advertising return require advertising reports or an authorized API connection.', false],
      ['Settlements and costs', 'Not connected', 'Net payout and contribution profit require actual fees, settlement transactions, refunds, shipping charges and product costs.', false],
      ['Store traffic', 'Not connected', 'Visitors, product views and conversion funnels require platform traffic reports. Orders alone cannot establish conversion rates.', false],
      ['Inventory', 'Not connected', 'Available stock and stock coverage require inventory snapshots and an agreed SKU mapping.', false]
    ];
    $('source-grid').innerHTML = definitions.map(([name, status, text, available]) => `<article class="source-card"><div><h3>${esc(name)}</h3><span class="source-state ${available ? 'available' : ''}">${esc(status)}</span></div><p>${esc(text)}</p></article>`).join('');
    const last = [...history].filter(item => Number.isFinite(Number(item.time))).sort((a, b) => Number(b.time) - Number(a.time))[0];
    const latest = (dataset?.daily || []).map(row => row.date).sort().at(-1);
    const missing = range ? R.months(range).filter(month => !months.includes(month)) : [];
    $('source-coverage').innerHTML = `<div class="coverage-facts"><p><b>Imported report months</b><span>${months.length ? esc(months.join(', ')) : 'No report months available'}</span></p><p><b>Latest recorded import</b><span>${last ? esc(new Date(Number(last.time)).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })) + ' Bangkok time' : 'No import history available'}</span></p><p><b>Latest order date in loaded reports</b><span>${esc(latest || 'Unavailable')}</span></p><p><b>Selected period</b><span>${range ? esc(range.from + ' to ' + range.to) : 'No period selected'}</span></p><p><b>Months without reports</b><span>${range ? missing.length ? esc(missing.join(', ')) : 'None in the selected period' : 'Choose a period'}</span></p></div><div class="notice">An imported month does not prove every day or store was exported. A blank day means no imported orders, not confirmed zero sales. Check export date coverage before using comparisons.</div>`;
  }
  function render({ dataset, range, rows, prior, context, basis }) {
    const health = I.lifecycle(context), total = R.totals(rows);
    const stores = I.byStore(rows, prior, context, dataset.comparisonAvailable);
    const basisNames = { all: 'All order value', active: 'Active order value', completed: 'Completed order value' };
    $('basis-note').textContent = basisNames[basis] + '. ' + ({
      all: 'Includes canceled and returned orders. It is not net revenue or profit.',
      active: 'Includes Completed, To Ship, Shipped and Unpaid. Other statuses are excluded. It is not recognized revenue.',
      completed: 'Completed orders only. Fees, costs and actual payouts have not been deducted.'
    }[basis]);
    lifecycle($('lifecycle-mini'), health, true);
    lifecycle($('lifecycle-chart'), health);
    mini($('health-summary'), [
      ['Completed orders', pct(health.completedRate), number.format(health.completed.orders) + ' of ' + number.format(health.total.orders) + ' orders'],
      ['Cancellation rate', pct(health.cancelRate), number.format(health.canceled.orders) + ' canceled orders'],
      ['Return / refund rate', pct(health.returnRate), number.format(health.returned.orders) + ' orders in this status'],
      ['To Ship', number.format(health.toShip.orders), money.format(health.toShip.gmv) + ' order value']
    ]);
    $('pending-summary').innerHTML = `<div class="pending-facts"><strong>${number.format(health.agedToShip.orders)}</strong><div><h3>To Ship orders placed more than 7 days ago</h3><p>${money.format(health.agedToShip.gmv)} order value · Oldest To Ship order: ${esc(health.oldestToShip || 'None in this period')}</p></div></div>`;
    const allStores = I.byStore(context, [], context, false).sort((a, b) => (b.health.cancelRate || 0) - (a.health.cancelRate || 0) || b.orders - a.orders);
    $('health-store-rows').innerHTML = allStores.map(row => `<tr><td>${esc(label(row.store))}</td><td>${number.format(row.health.total.orders)}</td><td>${number.format(row.health.completed.orders)}</td><td>${number.format(row.health.toShip.orders)}</td><td>${number.format(row.health.canceled.orders)}</td><td>${pct(row.health.cancelRate)}</td><td>${number.format(row.health.returned.orders)}</td><td>${pct(row.health.returnRate)}</td></tr>`).join('') || '<tr><td colspan="8">No matching orders.</td></tr>';
    const sort = $('store-sort').value;
    stores.sort((a, b) => (sort === 'cancelRate' ? (b.health.cancelRate ?? -1) - (a.health.cancelRate ?? -1) : (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity)) || b.gmv - a.gmv);
    $('store-comparison-rows').innerHTML = stores.map(row => `<tr><td>${esc(label(row.store))}</td><td><b>${money.format(row.gmv)}</b></td><td>${row.priorGmv === null ? 'Unavailable' : money.format(row.priorGmv)}</td><td class="${row.growth > 0 ? 'positive-value' : row.growth < 0 ? 'negative-value' : ''}">${row.delta === null ? 'Unavailable' : (row.delta > 0 ? '+' : '') + money.format(row.delta)}<small class="cell-note">${row.delta === null ? 'No comparison' : row.growth === null ? 'No prior value baseline' : (row.growth > 0 ? '+' : '') + pct(row.growth)}</small></td><td>${number.format(row.orders)}</td><td>${row.aov === null ? 'Unavailable' : money.format(row.aov)}</td><td>${pct(row.health.cancelRate)}</td><td>${pct(row.health.returnRate)}</td></tr>`).join('') || '<tr><td colspan="8">No matching stores.</td></tr>';
    $('store-comparison-note').textContent = dataset.comparisonAvailable ? 'Comparisons use the same sales basis and filters, based on imported records. Prior-only stores remain visible. Export coverage has not been independently verified.' : 'Prior-period comparisons are unavailable because reports are missing, could not load, or have no imported orders.';
    const weekdays = I.weekdays(rows, range, dataset.importedMonths);
    const max = Math.max(...weekdays.map(day => day.average || 0), 1);
    $('weekday-chart').innerHTML = weekdays.map(day => `<div class="weekday-row" ${NKMCharts.details(day.label,[["Average value / day",day.average===null?"Unavailable":money.format(day.average)],["Total order value",money.format(day.gmv)],["Orders",number.format(day.orders)],["Calendar days",String(day.days)]],"Average uses calendar weekdays within imported months, including dates with no imported orders. It is not average value per order.")}><b>${day.label}</b><div class="value-track"><i style="width:${Math.max(0, (day.average || 0) / max * 100)}%"></i></div><span>${day.average === null ? 'Unavailable' : money.format(day.average)}</span><small>${day.days} ${day.days === 1 ? 'day' : 'days'}</small></div>`).join('');
    const cards = [];
    const missing = dataset.missingMonths || [];
    if (missing.length) cards.push(['Check report coverage', missing.join(', ') + ' has no imported report.', 'Totals include only available reports. Upload the missing periods before comparing performance.', 'imports']);
    if (health.canceled.orders + health.returned.orders > 0) cards.push(['Review canceled and returned orders', money.format(health.canceled.gmv + health.returned.gmv) + ' of order value sits in these statuses.', 'This is not a verified loss or refund amount. Use Completed only when reviewing completed order value.', 'health']);
    if (health.agedToShip.orders) cards.push(['Review older To Ship orders', number.format(health.agedToShip.orders) + ' orders were placed more than 7 days ago.', 'Refresh the export and check fulfillment before deciding they are delayed.', 'health']);
    const leaders = [...stores].sort((a, b) => b.gmv - a.gmv);
    if (leaders[0] && total.gmv > 0) cards.push(['Watch store concentration', label(leaders[0].store) + ' contributes ' + pct(leaders[0].gmv / total.gmv) + ' of selected order value.', 'Compare order quality and performance across stores before shifting resources.', 'stores']);
    const movers = [...stores].filter(row => row.delta !== null && row.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    if (movers[0]) cards.push(['Largest store value movement', label(movers[0].store) + ': ' + (movers[0].delta > 0 ? '+' : '') + money.format(movers[0].delta) + ' versus the prior period.', 'Review orders and AOV together. An increase does not establish advertising effectiveness or profit.', 'stores']);
    cards.push(['Complete your profitability picture', 'Ad spend, actual fees, settlements and product costs are not connected.', 'These sources are needed before advertising return or contribution profit can be calculated.', 'sources']);
    $('action-grid').innerHTML = cards.slice(0, 6).map(([title, evidence, action, target]) => `<article class="action-card"><h3>${esc(title)}</h3><p class="action-evidence">${esc(evidence)}</p><p>${esc(action)}</p><button class="text-button" data-view="${target}">Review ${target === 'sources' ? 'data coverage' : target === 'health' ? 'order health' : target} →</button></article>`).join('');
  }
  function renderProducts({ rows, available, unverified }) {
    if (!available) { $('product-summary').replaceChildren(); $('product-chart').innerHTML = '<p class="chart-empty">Product totals are unavailable. Refresh to retry.</p>'; return; }
    const result = I.products(rows);
    mini($('product-summary'), [
      ['Products / SKUs', number.format(result.count), 'Unique SKU and product-name combinations'],
      ['Top 5 value share', pct(result.topFiveShare), 'Concentration by selected order value'],
      ['Leading product', result.items[0]?.sku || 'Unavailable', result.items[0] ? money.format(result.items[0].gmv) + ' selected order value' : 'No matching products']
    ]);
    document.querySelector('[data-product-metric="units"]').disabled = unverified;
    if (unverified && productMetric === 'units') productMetric = 'gmv';
    for (const button of document.querySelectorAll('[data-product-metric]')) button.setAttribute('aria-pressed', String(button.dataset.productMetric === productMetric));
    const ranked = [...result.items].sort((a, b) => b[productMetric] - a[productMetric]).slice(0, 8);
    const max = Math.max(...ranked.map(row => row[productMetric]), 1);
    $('product-chart').innerHTML = ranked.map((row, index) => `<div class="ranked-row" ${NKMCharts.details(row.sku,[["Product",row.product],["Rank",String(index+1)],["Order value",money.format(row.gmv)],["Units",unverified?"Unverified":number.format(row.units)],["SKU orders",number.format(row.orders)],["Value share",pct(row.share)]],"SKU totals for the selected dates. Orders may contain multiple products; SKU order counts cannot be summed as total orders.")}><div><span><b class="rank">${index + 1}</b>${esc(row.sku)}</span><b>${productMetric === 'gmv' ? money.format(row.gmv) : number.format(row.units) + ' units'}</b></div><p class="product-chart-name">${esc(row.product)}</p><div class="rank-track"><i style="width:${Math.max(0, row[productMetric] / max * 100)}%"></i></div><small>${pct(row.share)} of selected product value · ${unverified ? 'Units unverified' : row.unitValue === null ? 'No unit-value baseline' : money.format(row.unitValue) + ' value per unit'}</small></div>`).join('') || '<p class="chart-empty">No matching products.</p>';
  }
  root.NKMInsightUI = { render, sources, clear, renderProducts, setProductMetric: value => { productMetric = value; } };
})(typeof self !== 'undefined' ? self : globalThis);
