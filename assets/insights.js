(function (root) {
  'use strict';
  const R = root.NKMReport || (typeof require === 'function' && require('./report'));
  const buckets = [
    ['completed', 'Completed', 'Completed'],
    ['inProgress', 'In progress', 'To Ship, Shipped and Unpaid'],
    ['canceled', 'Canceled', 'Canceled order value'],
    ['returned', 'Return & Refund', 'Order value, not the actual refund amount'],
    ['other', 'Other statuses', 'Statuses without a known sales classification']
  ];
  const category = status => status === 'Completed' ? 'completed'
    : ['To Ship', 'Shipped', 'Unpaid'].includes(status) ? 'inProgress'
    : status === 'Canceled' ? 'canceled'
    : status === 'Return & Refund' ? 'returned' : 'other';
  const eligible = row => !row.excluded && row.status !== 'Platform Processing';
  function basis(rows, value = 'all') {
    return rows.filter(row => eligible(row) && (value === 'all'
      || value === 'completed' && category(row.status) === 'completed'
      || value === 'active' && ['completed', 'inProgress'].includes(category(row.status))));
  }
  const ratio = (n, d) => d > 0 ? n / d : null;
  function lifecycle(rows, today = R.today()) {
    rows = rows.filter(eligible);
    const total = R.totals(rows);
    const groups = buckets.map(([key, label, note]) => ({
      key, label, note, ...R.totals(rows.filter(row => category(row.status) === key))
    }));
    const get = key => groups.find(group => group.key === key);
    // This is age since order placement, not shipping lateness or an SLA breach.
    const open = rows.filter(row => row.status === 'To Ship');
    const aged = open.filter(row => row.date < R.shift(today, -7));
    return {
      total, groups, completed: get('completed'), inProgress: get('inProgress'),
      canceled: get('canceled'), returned: get('returned'), other: get('other'),
      cancelRate: ratio(get('canceled').orders, total.orders),
      returnRate: ratio(get('returned').orders, total.orders),
      completedRate: ratio(get('completed').orders, total.orders),
      toShip: R.totals(open), agedToShip: R.totals(aged),
      oldestToShip: open.map(row => row.date).sort()[0] || null
    };
  }
  function byStore(rows, prior, context, comparisonAvailable) {
    const map = new Map();
    for (const row of rows.filter(eligible)) {
      if (!map.has(row.store)) map.set(row.store, { store: row.store, gmv: 0, orders: 0, units: 0 });
      const current = map.get(row.store);
      for (const metric of ['gmv', 'orders', 'units']) current[metric] += row[metric];
    }
    // Retain prior-only stores so a disappearance is visible rather than hidden.
    if (comparisonAvailable) for (const row of prior.filter(eligible)) {
      if (!map.has(row.store)) map.set(row.store, { store: row.store, gmv: 0, orders: 0, units: 0 });
    }
    return [...map.values()].map(row => {
      const before = R.totals(prior.filter(x => eligible(x) && x.store === row.store));
      return { ...row, aov: ratio(row.gmv, row.orders), priorGmv: comparisonAvailable ? before.gmv : null,
        delta: comparisonAvailable ? row.gmv - before.gmv : null,
        growth: comparisonAvailable && before.gmv > 0 ? (row.gmv - before.gmv) / before.gmv : null,
        health: lifecycle(context.filter(x => x.store === row.store)) };
    }).sort((a, b) => b.gmv - a.gmv || a.store.localeCompare(b.store));
  }
  function weekdays(rows, range, importedMonths) {
    const days = Array.from({ length: 7 }, (_, i) => ({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], gmv: 0, orders: 0, days: 0
    }));
    const allowed = new Set(importedMonths || R.months(range));
    for (const month of R.months(range)) {
      if (!allowed.has(month)) continue;
      const from = range.from > month + '-01' ? range.from : month + '-01';
      const to = range.to < R.monthEnd(month) ? range.to : R.monthEnd(month);
      for (let date = from; date <= to; date = R.shift(date, 1)) {
        days[(new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7].days++;
      }
    }
    for (const row of rows.filter(eligible)) {
      if (row.date < range.from || row.date > range.to || !allowed.has(row.date.slice(0, 7))) continue;
      const group = days[(new Date(row.date + 'T00:00:00Z').getUTCDay() + 6) % 7];
      group.gmv += row.gmv; group.orders += row.orders;
    }
    return days.map(day => ({ ...day, average: ratio(day.gmv, day.days), averageOrders: ratio(day.orders, day.days) }));
  }
  function products(rows) {
    const map = new Map();
    for (const row of rows.filter(eligible)) {
      const key = JSON.stringify([row.sku, row.product]);
      if (!map.has(key)) map.set(key, { ...row, gmv: 0, orders: 0, units: 0 });
      const item = map.get(key);
      for (const metric of ['gmv', 'orders', 'units']) item[metric] += row[metric];
    }
    const items = [...map.values()].sort((a, b) => b.gmv - a.gmv || a.sku.localeCompare(b.sku));
    const total = items.reduce((sum, item) => sum + item.gmv, 0);
    return { items: items.map(item => ({ ...item, share: ratio(item.gmv, total), unitValue: ratio(item.gmv, item.units) })),
      total, count: items.length, topFiveShare: ratio(items.slice(0, 5).reduce((sum, item) => sum + item.gmv, 0), total) };
  }
  const api = { category, basis, ratio, lifecycle, byStore, weekdays, products };
  root.NKMInsights = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
