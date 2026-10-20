'use strict';
const crypto = require('node:crypto');
const {Client, BigSellerError, credentials} = require('./bigseller-client');
const DAY = 86400000, OVERLAP = 15 * 60000;
const FEEDS = ['warehouses', 'recentOrders', 'inventory', 'orders', 'recentReceipts', 'returns', 'returnReceipts', 'openReturns', 'recentSettlements', 'settlements', 'products', 'movements', 'shopeeWallet', 'tiktokWallet', 'lazadaWallet'];
const SNAPSHOTS = new Set(['warehouses', 'inventory', 'products']);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const string = value => value == null ? '' : String(value);
const iso = ms => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const rows = response => {
  if (response.data == null) throw new BigSellerError('data-missing');
  if (Array.isArray(response.data)) return response.data;
  if (typeof response.data === 'object') return [response.data];
  throw new BigSellerError('data-invalid');
};
function cursor(response, previous) {
  if (typeof response.has_next !== 'boolean') throw new BigSellerError('pagination-invalid');
  if (!response.has_next) return null;
  const next = response.current_maxid ?? response.current_max_id;
  if (next == null || string(next) === string(previous)) throw new BigSellerError('pagination-stalled');
  return string(next);
}
function accountDate(ms, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}).formatToParts(ms);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}
function orderRow(row) {
  // Only operational fields are retained. Recipient name, phone and address are deliberately omitted.
  const keys = ['platform', 'platform_shop_name', 'platform_shop_id', 'bs_shop_name', 'bs_shop_id', 'order_no', 'package_no', 'order_state', 'platform_state', 'pay_type', 'order_create_time', 'pay_time', 'ship_time', 'complete_time', 'agent_name', 'tracking_no', 'send_warehouse_name', 'send_warehouse_id', 'item_list'];
  return Object.fromEntries(keys.filter(k => row[k] != null).map(k => [k, row[k]]));
}
function identity(feed, row) {
  const shop = string(row.bs_shop_id || row.platform_shop_id), platform = string(row.platform).toLowerCase();
  if (feed === 'warehouses') return row.warehouse_id == null ? null : [row.warehouse_id];
  if (feed === 'inventory') return row.warehouse_id == null || !row.sku ? null : [row.warehouse_id, row.sku];
  if (feed === 'products') return row.merchantSkuId == null ? null : [row.merchantSkuId];
  if (feed === 'orders') return !row.package_no ? null : [row.package_no];
  if (feed === 'returns') return row.id == null ? null : [row.id];
  if (feed === 'settlements') return !row.order_no || !shop || !platform ? null : [platform, shop, row.order_no];
  if (feed === 'movements') return row.record_id == null ? null : [row.record_id];
  return !row.transaction_number || !shop ? null : [shop, row.transaction_number];
}
function normalize(feed, row, now) {
  const key = identity(feed, row); if (!key) throw new BigSellerError('record-identity-missing');
  const raw = feed === 'orders' ? orderRow(row) : row;
  const record = {id: hash([feed, key]), raw, syncedAt: now};
  if (Buffer.byteLength(JSON.stringify(record)) > 700000) throw new BigSellerError('record-too-large');
  return record;
}
function validateSettings(input = {}, now = Date.now()) {
  const since = input.since || new Date(now - 30 * DAY).toISOString().slice(0, 10), timezone = input.timezone || 'Asia/Bangkok';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !Number.isFinite(Date.parse(since + 'T00:00:00Z')) || new Date(since + 'T00:00:00Z').toISOString().slice(0, 10) !== since || Date.parse(since + 'T00:00:00Z') > now || Date.parse(since) < Date.UTC(2020, 0, 1)) throw new BigSellerError('start-date-invalid');
  try { new Intl.DateTimeFormat('en', {timeZone: timezone}).format(); } catch { throw new BigSellerError('timezone-invalid'); }
  const warehouseIds = input.warehouseIds || [];
  if (!Array.isArray(warehouseIds) || warehouseIds.length > 100 || warehouseIds.some(id => typeof id !== 'string' || !/^\d{1,20}$/.test(id))) throw new BigSellerError('warehouse-ids-invalid');
  return {since, timezone, warehouseIds: [...new Set(warehouseIds)].sort()};
}

function create({db, member, config, fail, now = Date.now, clientFactory = options => new Client(options), sleep = ms => new Promise(r => setTimeout(r, ms))}) {
  const connection = db.doc('wmsInternal/connection'), lease = db.doc('wmsInternal/lease');
  const feedRef = name => db.doc('wmsFeeds/' + name);
  const canonicalFeed = feed => ({recentOrders: 'orders', recentReceipts: 'returns', recentSettlements: 'settlements', returnReceipts: 'returns', openReturns: 'returns'}[feed] || feed);
  const collection = (feed, state) => SNAPSHOTS.has(feed) ? db.collection(`wmsSnapshots/${state.revision}/rows`) : db.collection(`wmsRecords/${canonicalFeed(feed)}/rows`);
  async function exclusive(action) {
    const token = crypto.randomUUID();
    await db.runTransaction(async tx => {
      const saved = (await tx.get(lease)).data();
      if (saved?.expires > now()) fail('aborted', 'A BigSeller sync is already running. Refresh its status in a moment.');
      tx.set(lease, {token, expires: now() + 600000});
    });
    const check = async () => { const saved = (await lease.get()).data(); if (saved?.token !== token || saved.expires <= now()) throw new BigSellerError('sync-lease-expired'); };
    try { return await action(check); }
    finally { await db.runTransaction(async tx => { if ((await tx.get(lease)).data()?.token === token) tx.delete(lease); }); }
  }
  function client() {
    const settings = credentials(config());
    return clientFactory({config: settings, now, sleep, store: {
      loadTokens: async () => { const saved = (await connection.get()).data(); if (saved?.appId && saved.appId !== settings.appId) throw new BigSellerError('account-switch-not-supported'); return saved?.tokens || null; },
      saveTokens: tokens => connection.set({tokens, connectedAt: now()}, {merge: true}),
      reserve: async path => {
        const ref = db.doc('wmsInternal/rate-' + hash(path));
        const start = await db.runTransaction(async tx => { const at = Math.max(now(), (await tx.get(ref)).data()?.next || 0); tx.set(ref, {next: at + 1100}); return at; });
        if (start > now()) await sleep(start - now());
      }
    }});
  }
  async function status() {
    const [c, l, feeds, known] = await Promise.all([connection.get(), lease.get(), Promise.all(FEEDS.map(async name => ({name, ...(await feedRef(name).get()).data()}))), db.collection('wmsKnownWarehouses').limit(300).get()]);
    const saved = c.data() || {};
    return {connected: Boolean(saved.tokens), accessExpires: saved.tokens?.accessExpires || null, refreshExpires: saved.tokens?.refreshExpires || null,
      paused: saved.paused === true, settings: saved.settings || null, syncing: l.data()?.expires > now(), knownWarehouses: known.docs.map(doc => doc.data()), feeds: feeds.map(({pending, ...state}) => ({...state, pending: pending ? {startedAt: pending.startedAt, windowStart: pending.windowStart ?? null, windowEnd: pending.windowEnd ?? null} : null}))};
  }
  async function saveRows(feed, pending, input, check) {
    const normalized = input.map(row => normalize(canonicalFeed(feed), row, now()));
    const target = collection(feed, {revision: pending.id});
    for (let offset = 0; offset < normalized.length; offset += 150) {
      await check(); const batch = db.batch();
      for (const record of normalized.slice(offset, offset + 150)) batch.set(target.doc(record.id), record);
      await batch.commit();
    }
    if (['orders', 'returns'].includes(canonicalFeed(feed))) {
      const warehouses = new Map();
      for (const row of input) for (const prefix of ['send', 'accept']) {
        const id = row[prefix + '_warehouse_id'];
        if (id != null && /^\d{1,20}$/.test(string(id))) warehouses.set(string(id), {id: string(id), name: string(row[prefix + '_warehouse_name']), source: 'Synced orders and returns'});
      }
      if (warehouses.size) { await check(); const batch = db.batch(); for (const [id, data] of warehouses) batch.set(db.doc('wmsKnownWarehouses/' + id), data); await batch.commit(); }
    }
    return normalized;
  }
  async function step(feed, api, settings, check) {
    const ref = feedRef(feed), saved = (await ref.get()).data() || {}, time = now(), source = canonicalFeed(feed);
    if (!saved.pending && !saved.force && saved.lastSuccess && time - saved.lastSuccess < (['warehouses', 'products'].includes(feed) ? DAY : 10 * 60000)) return false;
    if (feed === 'openReturns') {
      let query = collection('returns', {}).orderBy('__name__').limit(50);
      if (saved.reviewCursor) query = query.startAfter(saved.reviewCursor);
      const docs = (await query.get()).docs;
      const ids = docs.filter(doc => ['WAIT_IN_WAREHOUSE', 'PART_IN_WAREHOUSE', '0', '1'].includes(string(doc.data().raw.in_warehouse_status))).map(doc => string(doc.data().raw.id));
      if (ids.length) {
        const data = rows(await api.post('returnDetails', {type: 2, order_no_list: ids}));
        if (ids.some(id => !data.some(row => string(row.id) === id))) throw new BigSellerError('return-details-incomplete');
        await saveRows('returns', {}, data, check);
      }
      await check(); await ref.set({lastSuccess: now(), reviewCursor: docs.length === 50 ? docs.at(-1).id : null, error: null}, {merge: true});
      return true;
    }
    let pending = saved.pending;
    if (!pending) {
      const start = saved.checkpoint ? Math.max(Date.parse(settings.since), saved.checkpoint - OVERLAP) : feed.startsWith('recent') ? Math.max(Date.parse(settings.since), time - 6 * 3600000) : Date.parse(settings.since + 'T00:00:00Z');
      pending = {id: crypto.randomUUID(), startedAt: time, cursor: null, count: 0,
        ...(!SNAPSHOTS.has(feed) ? {windowStart: start, windowEnd: Math.min(time - 60000, start + (feed === 'movements' ? 6 : 7) * DAY)} : {})};
      if (pending.windowEnd != null && pending.windowEnd <= start) return false;
      if (feed === 'inventory') {
        const warehouseState = (await feedRef('warehouses').get()).data();
        if (settings.warehouseIds.length) { pending.warehouses = settings.warehouseIds; pending.scope = 'Selected warehouses'; }
        else if (warehouseState?.revision) {
          const warehouseRows = await collection('warehouses', warehouseState).get();
          pending.warehouses = warehouseRows.docs.map(doc => doc.data().raw.warehouse_id);
          pending.scope = 'All discovered warehouses';
        } else {
          const known = await db.collection('wmsKnownWarehouses').limit(300).get();
          pending.warehouses = known.docs.map(doc => doc.data().id); pending.scope = 'Warehouses found in synced orders and returns';
          if (!pending.warehouses.length) {
            await ref.set({error: {code: 'warehouse-selection-required', message: 'Warehouse discovery is unavailable. Sync orders to discover shipping warehouses, or enter warehouse IDs in Connection settings.', at: now()}}, {merge: true});
            return false;
          }
        }
        pending.warehouseIndex = 0;
        if (!pending.warehouses.length) return false;
      }
      await check(); await ref.set({pending, error: null}, {merge: true});
    }
    let response, data, next;
    const dates = !SNAPSHOTS.has(feed) ? {start_date: iso(pending.windowStart), end_date: iso(pending.windowEnd)} : {};
    const page = {page_size: source === 'settlements' ? 10 : feed === 'inventory' ? 100 : 50, ...(pending.cursor != null ? {current_maxid: pending.cursor} : {})};
    if (source === 'orders') {
      response = await api.post('orders', {...page, date_type: 3, start_date: Math.floor(pending.windowStart / 1000), end_date: Math.floor(pending.windowEnd / 1000)});
      const ids = rows(response).map(row => string(row.package_id));
      if (ids.some(id => !id)) throw new BigSellerError('package-identity-missing');
      data = ids.length ? rows(await api.post('orderDetails', {type: 0, order_no_list: ids, is_group: 0})) : [];
      if (ids.some(id => !data.some(row => string(row.package_no) === id))) throw new BigSellerError('order-details-incomplete');
    } else if (source === 'returns') {
      response = await api.post('returns', {...page, date_type: feed === 'returns' ? 0 : 2, start_date: Math.floor(pending.windowStart / 1000), end_date: Math.floor(pending.windowEnd / 1000)});
      const ids = rows(response).map(row => string(row.id));
      if (ids.some(id => !id)) throw new BigSellerError('return-identity-missing');
      data = ids.length ? rows(await api.post('returnDetails', {type: 2, order_no_list: ids})) : [];
      if (ids.some(id => !data.some(row => string(row.id) === id))) throw new BigSellerError('return-details-incomplete');
    } else if (source === 'settlements') {
      response = await api.post(source, {...page, ...dates, date_type: 0});
      const ids = [...new Set(rows(response).map(row => string(row.order_no)))];
      if (ids.some(id => !id)) throw new BigSellerError('order-identity-missing');
      data = ids.length ? rows(await api.post('settlementDetails', {order_no: ids, group_type: 0})) : [];
      if (ids.some(id => !data.some(row => string(row.order_no) === id))) throw new BigSellerError('settlement-details-incomplete');
      const seen = new Set();
      for (const row of data) { const key = JSON.stringify(identity(source, row)); if (seen.has(key)) throw new BigSellerError('settlement-record-identity-ambiguous'); seen.add(key); }
    } else if (feed === 'inventory') {
      response = await api.post(feed, {...page, warehouse_id: pending.warehouses[pending.warehouseIndex]}); data = rows(response);
    } else if (feed === 'products') {
      // Live API uses current_maxid; the parameter table's current_max_id is ignored.
      response = await api.post(feed, page); data = rows(response);
    } else if (feed === 'movements') {
      const {current_maxid, ...params} = page;
      // Live API requires dates without time. Include both documented cursor spellings;
      // stalled-cursor validation prevents repeated pages from being published.
      response = await api.post(feed, {...params, start_date: accountDate(pending.windowStart, settings.timezone).slice(0, 10), end_date: accountDate(pending.windowEnd, settings.timezone).slice(0, 10), ...(current_maxid != null ? {current_max_id: current_maxid, current_maxid} : {})}); data = rows(response);
    } else {
      response = await api.post(feed, {...page, ...dates, ...(feed.endsWith('Wallet') ? {date_type: 0} : {})}); data = rows(response);
    }
    next = cursor(response, pending.cursor);
    await saveRows(feed, pending, data, check);
    pending = {...pending, count: pending.count + data.length, cursor: next};
    if (feed === 'inventory') {
      const totals = {...(pending.totals || {})};
      for (const key of ['onhand', 'available', 'allocated', 'promotion', 'on_the_way']) {
        if (totals[key] === null) continue;
        for (const row of data) {
          const value = row[key];
          if (value == null || value === '' || !Number.isSafeInteger(Number(value))) { totals[key] = null; break; }
          totals[key] = (totals[key] || 0) + Number(value);
        }
      }
      pending.totals = totals;
    }
    let complete = next == null;
    if (complete && feed === 'inventory' && pending.warehouseIndex + 1 < pending.warehouses.length) {
      pending.warehouseIndex++; pending.cursor = null; complete = false;
    }
    await check();
    if (!complete) await ref.set({pending, error: null}, {merge: true});
    else {
      const publication = {pending: null, lastSuccess: now(), error: null, lastWindowRows: pending.count, force: false};
      if (SNAPSHOTS.has(feed)) { publication.revision = pending.id; publication.rowCount = pending.count; publication.previousRevision = saved.revision || null; }
      else publication.checkpoint = pending.windowEnd;
      if (feed === 'inventory') { publication.totals = pending.totals || {}; publication.warehouseCount = pending.warehouses.length; publication.scope = pending.scope; }
      await ref.set(publication, {merge: true});
      // Keep the current and immediately previous full snapshots; remove only older staging data.
      if (SNAPSHOTS.has(feed) && saved.previousRevision) await db.recursiveDelete(db.doc('wmsSnapshots/' + saved.previousRevision));
    }
    return true;
  }
  async function sync(check) {
    const saved = (await connection.get()).data();
    if (!saved?.tokens) fail('failed-precondition', 'An administrator needs to connect BigSeller first.');
    if (saved.paused) return status();
    const api = client(), settings = validateSettings(saved.settings, now()), deadline = now() + 400000;
    const failed = new Set(); let work = 0;
    for (let round = 0; round < 4 && now() < deadline; round++) {
      for (const feed of FEEDS) {
        if (failed.has(feed) || now() >= deadline) continue;
        try { if (await step(feed, api, settings, check)) work++; }
        catch (e) {
          if (!(e instanceof BigSellerError)) throw e;
          failed.add(feed); await check(); await feedRef(feed).set({error: {message: e.message, code: e.code, at: now()}}, {merge: true});
        }
      }
      if (!work) break;
    }
    return status();
  }
  async function page(input) {
    const feed = input.feed;
    if (!FEEDS.includes(feed)) fail('invalid-argument', 'Choose a WMS section.');
    const saved = (await feedRef(feed).get()).data() || {};
    if (SNAPSHOTS.has(feed) && !saved.revision) return {rows: [], nextCursor: null, published: false, lastSuccess: null};
    if (input.revision && input.revision !== saved.revision) fail('aborted', 'Inventory changed. Refresh this section to continue.');
    if (input.cursor != null && !/^[a-f\d]{64}$/.test(input.cursor)) fail('invalid-argument', 'Invalid page cursor.');
    let query = collection(feed, saved).orderBy('__name__').limit(101);
    if (input.cursor) query = query.startAfter(input.cursor);
    const result = await query.get(), docs = []; let bytes = 0;
    for (const doc of result.docs.slice(0, 100)) {
      const size = Buffer.byteLength(JSON.stringify(doc.data()));
      if (docs.length && bytes + size > 600000) break;
      docs.push(doc); bytes += size;
    }
    const recentName = {orders: 'recentOrders', returns: 'recentReceipts', settlements: 'recentSettlements'}[feed];
    const recent = recentName ? (await feedRef(recentName).get()).data() : null;
    return {feed, rows: docs.map(doc => doc.data()), nextCursor: result.docs.length > docs.length ? docs.at(-1).id : null, revision: saved.revision || null, published: Boolean(saved.lastSuccess || recent?.lastSuccess), lastSuccess: Math.max(saved.lastSuccess || 0, recent?.lastSuccess || 0) || null, recentCheckpoint: recent?.checkpoint || null};
  }
  async function handle(request) {
    const op = request.data?.op || 'status';
    await member(request, ['status', 'page'].includes(op) ? undefined : ['admin']);
    try {
      if (op === 'status' || op === 'page') { const result = op === 'status' ? await status() : await page(request.data); await member(request); return result; }
      const mutate = async action => { await exclusive(action); return status(); };
      if (op === 'sync') return mutate(check => sync(check));
      if (op === 'settings') return mutate(async check => {
        const saved = (await connection.get()).data(), settings = validateSettings(request.data, now());
        if (!saved?.settings || saved.settings.since !== settings.since || saved.settings.timezone !== settings.timezone) fail('failed-precondition', 'Keep the existing history start and account time zone. Warehouse selection can be updated here.');
        await check(); await member(request, ['admin']); await connection.set({settings}, {merge: true});
        const inventory = (await feedRef('inventory').get()).data();
        await feedRef('inventory').set({pending: null, force: true}, {merge: true});
        if (inventory?.pending?.id) await db.recursiveDelete(db.doc('wmsSnapshots/' + inventory.pending.id));
      });
      if (op === 'connect') return mutate(async check => {
        const settings = validateSettings(request.data, now()), saved = (await connection.get()).data();
        const appId = credentials(config()).appId;
        if (saved?.appId && saved.appId !== appId) fail('failed-precondition', 'Connecting a different BigSeller account requires a separate data migration.');
        if (saved?.settings && JSON.stringify(saved.settings) !== JSON.stringify(settings)) fail('failed-precondition', 'Keep the existing history start and account time zone when reconnecting.');
        await client().connect(); await check(); await member(request, ['admin']);
        await connection.set({settings, appId, paused: false}, {merge: true}); return status();
      });
      if (op === 'pause' || op === 'resume') return mutate(async () => { await member(request, ['admin']); await connection.set({paused: op === 'pause'}, {merge: true}); });
      fail('invalid-argument', 'Unknown WMS operation.');
    } catch (e) { if (e instanceof BigSellerError) fail('failed-precondition', e.message); throw e; }
  }
  return {handle, scheduled: () => exclusive(check => sync(check))};
}
module.exports = {create, FEEDS, normalize, identity, cursor, rows, validateSettings, accountDate};
