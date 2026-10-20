(function () {
  'use strict';
  const $ = id => document.getElementById(id), fmt = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
  const date = value => { if (!value) return '—'; const parsed = new Date(typeof value === 'number' ? value : String(value).replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z')); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('en-GB', {timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short'}) : '—'; };
  const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : fmt.format(Number(value));
  const money = (amount, currency) => amount == null || amount === '' ? '—' : (currency || 'Currency not supplied') + ' ' + String(amount);
  const title = value => String(value).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, c => c.toUpperCase());
  const sumUnits = (list, key) => !Array.isArray(list) || list.some(row => row[key] == null || row[key] === '' || !Number.isSafeInteger(Number(row[key]))) ? null : list.reduce((n, row) => n + Number(row[key]), 0);
  const inbound = value => ({WAIT_IN_WAREHOUSE: 'Not received', PART_IN_WAREHOUSE: 'Partly received', ALL_IN_WAREHOUSE: 'Fully received', NOT_IN_WAREHOUSE: 'Not returned to stock', 0: 'Not received', 1: 'Partly received', 2: 'Fully received', 3: 'Not returned to stock'}[value] || value);
  const definitions = {
    inventory: {name: 'Warehouse inventory', note: 'On hand includes available, allocated and promotion-reserved units.', columns: ['SKU / product', 'Warehouse', 'On hand', 'Available', 'Allocated', 'Promotion', 'On the way'], values: r => [r.sku, r.warehouse_name || r.warehouse_id, ...['onhand', 'available', 'allocated', 'promotion', 'on_the_way'].map(k => number(r[k]))], secondary: r => r.sku_name},
    orders: {name: 'Orders & packages', note: 'Each row is one ERP package. Split packages can belong to the same marketplace order.', columns: ['Order / package', 'Store', 'Marketplace', 'Order status', 'Created · Bangkok', 'Item units', 'Warehouse'], values: r => [r.order_no, r.bs_shop_name || r.platform_shop_name, r.platform, r.platform_state || r.order_state, date(Number(r.order_create_time) * 1000), number(sumUnits(r.item_list, 'item_quantity')), r.send_warehouse_name], secondary: r => r.package_no},
    returns: {name: 'Returns & receipts', note: 'Return receipt activity does not provide cancellation reasons or a complete cancellation history.', columns: ['Order / return', 'Store', 'Receipt status', 'Required units', 'Received units', 'Receiving warehouse'], values: r => [r.order_no || r.id, r.bs_shop_name || r.platform_shop_name, inbound(r.in_warehouse_status), number(sumUnits(r.sku_list, 'required_stock_in')), number(sumUnits(r.sku_list, 'actual_stock_in')), r.accept_warehouse_name], secondary: r => r.return_id || r.package_no},
    settlements: {name: 'Store settlements', note: 'Product sales are after discounts and promotions. Settlement income differs from Nakama GMV and profit.', columns: ['Order', 'Store', 'Marketplace', 'Product sales', 'Settlement income', 'Refund amount', 'Status'], values: r => [r.order_no, r.bs_shop_name || r.platform_shop_name, r.platform, money(r.sale_amount, r.currency), money(r.platform_income, r.currency), money(r.return_refund, r.currency), r.sett_status != null && r.sett_status !== '' ? ({0: 'Settled', 1: 'Unsettled'}[r.sett_status] || String(r.sett_status)) : 'Not supplied']},
    products: {name: 'Product catalog', note: 'Reference prices are catalog settings, not the prices paid on individual orders.', columns: ['SKU / product', 'Category', 'Brand', 'Type', 'Reference cost', 'Reference price'], values: r => [r.sku, r.categoryName, r.brand, ({1: 'Single SKU', 2: 'Bundle'}[r.skuType] || '—'), r.referenceCostPrice, r.referenceSalePrice], secondary: r => r.title},
    movements: {name: 'Stock movements', note: 'Manual adjustments, transfers, stock counts and cancelled parcels returned to stock. This is not a complete stock ledger.', columns: ['SKU / product', 'Warehouse', 'Before', 'Change', 'After', 'Recorded', 'Reference'], values: r => [r.sku, r.warehouse_name, number(r.original_stock), r.changed_stock, number(r.new_stock), r.create_time, r.common_no || r.record_id], secondary: r => r.sku_name}
  };
  for (const platform of ['shopee', 'tiktok', 'lazada']) definitions[platform + 'Wallet'] = {name: title(platform) + ' wallet', note: 'Wallet transactions are cash movements. Withdrawals and transfers are not additional order sales.', columns: ['Transaction', 'Store', 'Type', 'Amount', 'Status', 'Transaction time · UTC'], values: r => [r.transaction_number, r.bs_shop_name || r.platform_shop_name, r.transaction_tab_type || r.transaction_type, money(r.transaction_amount, r.currency), r.transaction_state, r.transaction_time]};
  function mount(api) {
    let session = null, state = null, feed = 'inventory', records = [], response = null, pages = [null], index = 0, generation = 0, sessionGeneration = 0, busy = false, loadingPage = false, timer;
    const allowed = () => Boolean(session?.user && !session.blocked && !session.loading), admin = () => allowed() && session.role === 'admin';
    const message = text => { $('wms-error').hidden = !text; $('wms-error').textContent = text || ''; };
    const request = data => api.call('nkmWms', data, ['sync', 'connect'].includes(data.op) ? 560000 : 70000);
    function controls() {
      $('refresh').disabled = !allowed() || busy;
      $('sync').hidden = !admin(); $('sync').disabled = busy || !state?.connected || state?.paused || state?.syncing;
      $('connection-settings').hidden = !admin(); $('connect').disabled = !admin() || busy || state?.syncing;
      $('connect').textContent = state?.connected ? 'Reconnect account' : 'Connect BigSeller';
      $('save-settings').hidden = !state?.connected; $('save-settings').disabled = !admin() || busy || state?.syncing;
      $('pause').hidden = !state?.connected; $('pause').disabled = !admin() || busy || state?.syncing; $('pause').textContent = state?.paused ? 'Resume automatic sync' : 'Pause automatic sync';
      $('history-start').readOnly = Boolean(state?.settings); $('account-timezone').readOnly = Boolean(state?.settings);
      $('previous').disabled = busy || loadingPage || index === 0; $('next').disabled = busy || loadingPage || !response?.nextCursor;
      $('export').disabled = !allowed() || !records.length || busy;
    }
    function renderStatus() {
      if (!allowed() || !state) return;
      const errors = state.feeds.filter(f => f.error), badge = $('connection-badge');
      badge.textContent = !state.connected ? 'Not connected' : state.syncing ? 'Syncing…' : state.paused ? 'Sync paused' : errors.length ? 'Some feeds need attention' : 'Connected';
      badge.dataset.state = state.connected && !state.paused && !errors.length ? 'good' : 'attention';
      $('connect-empty').hidden = state.connected;
      $('connection-guidance').textContent = admin() ? 'Choose a history start date and connect the account in Connection settings.' : 'Ask a Nakama administrator to connect BigSeller.';
      const inventory = state.feeds.find(f => f.name === 'inventory');
      for (const [id, key] of [['onhand', 'onhand'], ['available', 'available'], ['allocated', 'allocated'], ['incoming', 'on_the_way']]) $('metric-' + id).textContent = inventory?.revision ? number(inventory.totals?.[key]) : '—';
      $('stock-scope').textContent = inventory?.revision ? `${inventory.scope} · ${inventory.warehouseCount} warehouses · ${inventory.rowCount} SKU / warehouse positions · Last complete snapshot ${date(inventory.lastSuccess)} · Bangkok time` : 'Warehouse totals appear after a complete inventory sync.';
      $('sync-overview').textContent = state.syncing ? 'Sync in progress' : errors.length ? `${errors.length} feeds need attention` : state.paused ? 'Automatic sync paused' : 'Scheduled every 10 minutes';
      $('sync-feeds').replaceChildren();
      for (const item of state.feeds) {
        const row = document.createElement('div'); row.className = 'wms-feed'; row.dataset.error = String(Boolean(item.error));
        const name = document.createElement('b'); name.textContent = definitions[item.name]?.name || title(item.name);
        const stamp = document.createElement('span'); stamp.textContent = item.pending ? 'Syncing a history window…' : item.lastSuccess ? 'Last success ' + date(item.lastSuccess) : 'Waiting for first sync';
        const note = document.createElement('small'); note.textContent = item.error?.message || (item.checkpoint ? 'Updates checked through ' + date(item.checkpoint) : item.revision ? item.rowCount + ' records in the published snapshot' : 'No complete data published yet');
        row.append(name, stamp, note); $('sync-feeds').append(row);
      }
      if (state.settings) { $('history-start').value = state.settings.since; $('account-timezone').value = state.settings.timezone; $('warehouse-ids').value = (state.settings.warehouseIds || []).join(', '); }
      controls();
    }
    function visible() {
      const search = $('search').value.trim().toLocaleLowerCase();
      const list = records.filter(row => !search || JSON.stringify(row.raw).toLocaleLowerCase().includes(search));
      if ($('sort').value === 'name') list.sort((a, b) => String(definitions[feed].values(a.raw)[0]).localeCompare(String(definitions[feed].values(b.raw)[0]), undefined, {numeric: true}));
      return list;
    }
    function renderRows() {
      const definition = definitions[feed], list = visible();
      $('records-title').textContent = definition.name; $('records-note').textContent = definition.note;
      $('records-panel').setAttribute('aria-labelledby', 'tab-' + feed);
      for (const button of document.querySelectorAll('[data-feed]')) { const selected = button.dataset.feed === feed; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; }
      $('records-head').replaceChildren(); const head = document.createElement('tr');
      for (const label of definition.columns) { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; head.append(cell); } $('records-head').append(head);
      $('records-body').replaceChildren();
      for (const record of list) {
        const tr = document.createElement('tr'), values = definition.values(record.raw);
        for (const [i, value] of values.entries()) {
          const td = document.createElement('td');
          if (i === 0) { const button = document.createElement('button'); button.type = 'button'; button.className = 'wms-row-link'; button.textContent = value == null || value === '' ? 'View record' : String(value); button.onclick = () => details(record); td.append(button); const secondary = definition.secondary?.(record.raw); if (secondary) { const small = document.createElement('small'); small.textContent = secondary; td.append(small); } }
          else td.textContent = value == null || value === '' ? '—' : String(value);
          tr.append(td);
        }
        $('records-body').append(tr);
      }
      if (!list.length) { const tr = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = definition.columns.length; cell.className = 'wms-empty'; cell.textContent = loadingPage ? 'Loading records…' : $('search').value ? 'No matches on this page. Clear the search or move to another page.' : !state?.connected ? 'Connect BigSeller to see your operations here.' : state.feeds.find(f => f.name === feed)?.error?.message || (!response?.published ? 'No complete sync yet. Check Sync activity for progress.' : 'No records in the synced history.'); tr.append(cell); $('records-body').append(tr); }
      $('page-count').textContent = list.length + ' of ' + records.length + ' records on this page'; $('page-label').textContent = 'Page ' + (index + 1);
      const status = state?.feeds.find(f => f.name === feed);
      $('feed-note').textContent = response?.recentCheckpoint ? 'Recent updates checked through ' + date(response.recentCheckpoint) + '. Older history starts ' + state.settings.since + ' and loads separately; check Sync activity for its progress.' : status?.checkpoint ? 'History starts ' + state.settings.since + '. Updates checked through ' + date(status.checkpoint) + '. Records can update while a sync is in progress.' : response?.lastSuccess ? 'Snapshot completed ' + date(response.lastSuccess) + '. Bangkok time.' : 'Data stays unavailable until the feed completes its first sync.';
      controls();
    }
    function details(record) {
      function fields(value, depth = 0) {
        const holder = document.createElement('div'), grid = document.createElement('dl'); grid.className = 'wms-detail-grid'; holder.append(grid);
        if (depth > 6) { holder.textContent = 'Additional nested data'; return holder; }
        for (const [key, val] of Object.entries(value || {})) {
          if (val && typeof val === 'object') {
            const group = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = Array.isArray(value) ? 'Item ' + (Number(key) + 1) : title(key); group.append(summary, fields(val, depth + 1)); holder.append(group);
          } else { const term = document.createElement('dt'), content = document.createElement('dd'); term.textContent = title(key); content.textContent = val == null || val === '' ? 'Not supplied' : String(val); grid.append(term, content); }
        }
        return holder;
      }
      $('record-title').textContent = definitions[feed].values(record.raw)[0] || 'Record details'; $('record-details').replaceChildren(fields(record.raw)); $('record-dialog').showModal();
    }
    async function loadPage(reset = false) {
      if (!allowed()) return;
      const current = ++generation, user = session.user.uid;
      if (reset) { pages = [null]; index = 0; response = null; }
      records = []; loadingPage = true; renderRows();
      try {
        const result = await request({op: 'page', feed, cursor: pages[index], revision: response?.revision || null});
        if (current !== generation || !allowed() || session.user.uid !== user) return;
        records = result.rows; response = result; renderRows();
      } catch (error) { if (current === generation && allowed()) { response = null; records = []; message(error.message); } }
      finally { if (current === generation && allowed()) { loadingPage = false; renderRows(); } }
    }
    async function refresh() {
      if (!allowed()) return;
      const current = sessionGeneration;
      message(''); busy = true; controls();
      try { const result = await request({op: 'status'}); if (current !== sessionGeneration || !allowed()) return; state = result; renderStatus(); await loadPage(true); }
      catch (error) { if (current === sessionGeneration && allowed()) message(error.code === 'functions/not-found' ? 'The WMS service is not deployed yet. Ask your administrator to deploy the WMS backend.' : error.message); }
      finally { if (current === sessionGeneration) { busy = false; renderRows(); controls(); } }
    }
    async function mutate(op, extra = {}) {
      if (!admin() || busy) return;
      const current = sessionGeneration; busy = true; message(''); $('wms-message').textContent = op === 'sync' ? 'Syncing BigSeller. You can leave this section and check progress later.' : 'Updating connection…'; controls();
      try { const result = await request({op, ...extra}); if (current !== sessionGeneration || !allowed()) return; state = result; renderStatus(); await loadPage(true); $('wms-message').textContent = op === 'sync' ? 'Sync pass finished. Larger history windows continue on the next scheduled pass.' : op === 'connect' ? 'BigSeller connected. Select Sync now to load the first records.' : 'Connection updated.'; }
      catch (error) { if (current === sessionGeneration && allowed()) { message(error.message); $('wms-message').textContent = ''; } }
      finally { if (current === sessionGeneration) { busy = false; renderRows(); controls(); } }
    }
    function settings() { return {since: $('history-start').value, timezone: $('account-timezone').value.trim(), warehouseIds: $('warehouse-ids').value.split(/[,\s]+/).filter(Boolean)}; }
    $('history-start').value = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    $('refresh').onclick = refresh; $('sync').onclick = () => mutate('sync');
    $('connection-form').onsubmit = event => { event.preventDefault(); mutate('connect', settings()); };
    $('save-settings').onclick = () => mutate('settings', settings()); $('pause').onclick = () => mutate(state?.paused ? 'resume' : 'pause');
    $('search').oninput = renderRows; $('sort').onchange = renderRows;
    $('next').onclick = () => { if (!busy && response?.nextCursor) { pages[index + 1] = response.nextCursor; index++; loadPage(); } };
    $('previous').onclick = () => { if (!busy && index > 0) { index--; loadPage(); } };
    const tabs = [...document.querySelectorAll('[data-feed]')];
    function select(button) { feed = button.dataset.feed; $('search').value = ''; message(''); loadPage(true); }
    for (const button of tabs) { button.onclick = () => select(button); button.onkeydown = event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const position = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(button) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[position].focus(); select(tabs[position]); }; }
    $('close-details').onclick = () => $('record-dialog').close();
    $('export').onclick = () => {
      if (!allowed()) return;
      const cell = value => { let text = String(value ?? ''); if (/^[\u0000-\u0020]*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
      const text = [definitions[feed].columns, ...visible().map(record => definitions[feed].values(record.raw))].map(row => row.map(cell).join(',')).join('\r\n');
      const a = document.createElement('a'), url = URL.createObjectURL(new Blob(['\ufeff' + text], {type: 'text/csv;charset=utf-8'})); a.href = url; a.download = 'nakama-wms-' + feed + '-page-' + (index + 1) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    function sessionChanged(next) {
      sessionGeneration++; generation++; session = next; records = []; response = null; state = null; busy = false; loadingPage = false; clearInterval(timer);
      $('record-details').replaceChildren(); if ($('record-dialog').open) $('record-dialog').close();
      for (const id of ['metric-onhand', 'metric-available', 'metric-allocated', 'metric-incoming']) $(id).textContent = '—';
      $('records-body').replaceChildren(); $('sync-feeds').replaceChildren(); $('connection-badge').textContent = 'Access required'; $('connection-badge').removeAttribute('data-state'); $('wms-message').textContent = ''; $('stock-scope').textContent = ''; $('feed-note').textContent = ''; $('sync-overview').textContent = ''; message(''); controls();
      if (allowed()) { refresh(); timer = setInterval(() => { if (!busy && document.visibilityState === 'visible' && index === 0 && !$('search').value && !$('record-dialog').open && !$('connection-settings').open) refresh(); }, 60000); }
    }
    window.addEventListener('pagehide', () => { clearInterval(timer); sessionGeneration++; generation++; }, {once: true});
    api.start(sessionChanged, error => message(error.message));
    return {sessionChanged, refresh};
  }
  window.NKMWms = {mount};
  if (document.documentElement.dataset.embedded !== 'true') { location.replace('/management/#wms'); return; }
  import('./cloud.js?v=wms-20261020').then(mount).catch(() => { $('wms-error').hidden = false; $('wms-error').textContent = 'WMS could not open. Refresh Management and try again.'; });
})();
