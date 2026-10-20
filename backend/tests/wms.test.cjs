'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {Client, sign, parseJson, credentials, tokenData, BigSellerError} = require('../functions/lib/bigseller-client');
const {create, normalize, cursor, validateSettings, FEEDS, accountDate} = require('../functions/lib/wms');
const database = require('./helpers/wms-db.cjs');
const sample = {appId: 'ABCDE123', appKey: '2a58e0625824e1061c9482c53c881b3307e75bd85a6c6b2cf39ecdd50fc94589'};
const time = Date.parse('2026-10-20T05:00:00Z'), tokens = {accessToken: 'private-access', refreshToken: 'private-refresh', accessExpires: time / 1000 + 7 * 86400, refreshExpires: time / 1000 + 180 * 86400};
const success = data => new Response(JSON.stringify({code: 0, success: true, error_code: null, data}), {status: 200});
test('both vendor signing vectors match, including GET encoding and bundle arrays', () => {
  assert.equal(sign(sample.appId, sample.appKey, '/api/auth/v1/get_code', {app_id: sample.appId, redirect_url: 'https://bigseller.com/callback', timestamp: 1756901303, state: 'abcdefg'}, true), 'b67e2d50aee98fd68eda0aac12c76946fcf44c96cdf507ec85eaa840ee1665b4');
  assert.equal(sign(sample.appId, sample.appKey, '/api/order/v1/get_order_details', {type: 1, order_no_list: ['OD5062367', 'OD5062368'], is_group: 0}), 'cdac2d3c42c4279e26233908b4a2d544ffd9826195c9aa708a44f77c586e6ae5');
});
test('large IDs and decimal amounts survive response parsing without precision loss', () => {
  const result = parseJson('{"id":7495895704539335381,"amount":123456789012345.67,"quantity":5,"text":"id:7495895704539335381"}');
  assert.equal(result.id, '7495895704539335381'); assert.equal(result.amount, '123456789012345.67'); assert.equal(result.quantity, 5); assert.equal(result.text, 'id:7495895704539335381');
});
test('credentials restrict hosts and token normalization accepts both documented spellings', () => {
  assert.throws(() => credentials({...sample, host: 'https://example.com'}), /host-invalid/);
  const raw = {accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, accessTokenExpireIn: tokens.accessExpires, refreshTokenExpireIn: tokens.refreshExpires};
  assert.deepEqual(tokenData(raw), tokens);
  assert.deepEqual(tokenData({access_token: tokens.accessToken, refresh_token: tokens.refreshToken, access_token_expire_in: tokens.accessExpires, refresh_token_expire_in: tokens.refreshExpires}), tokens);
  assert.throws(() => tokenData({...raw, accessTokenExpireIn: 604800}), /token-response-invalid/);
});
test('actual nullable-success responses are accepted, explicit failures are rejected safely', async () => {
  const store = {loadTokens: async () => tokens, reserve: async () => {}}, api = new Client({config: sample, store, now: () => time, fetchImpl: async () => new Response('{"code":0,"success":null,"error_code":null,"data":[],"has_next":false}')});
  assert.deepEqual((await api.post('orders', {})).data, []);
  api.fetch = async () => new Response('{"code":1,"success":false,"error_code":"40101020","msg":"private-access private-refresh","request_id":"safe-reference"}');
  await assert.rejects(api.post('orders', {}), error => /40101020/.test(error.message) && !/private-access|private-refresh/.test(error.message));
  await assert.rejects(api.post('https://example.com', {}), /interface-invalid/);
});
test('throttled calls reserve a fresh rate slot for each retry', async () => {
  let attempts = 0, reservations = 0;
  const api = new Client({config: sample, now: () => time, sleep: async () => {}, store: {reserve: async () => { reservations++; }, loadTokens: async () => tokens}, fetchImpl: async () => ++attempts === 1 ? new Response('{"success":false,"error_code":"10100002"}') : success([])});
  await api.post('products', {}); assert.equal(attempts, 2); assert.equal(reservations, 2);
});
test('refresh rotates private tokens before business requests and uses the old access header', async () => {
  let saved, calls = [];
  const api = new Client({config: sample, now: () => time, store: {reserve: async () => {}, loadTokens: async () => ({...tokens, accessExpires: time / 1000 + 60}), saveTokens: async value => { saved = value; }}, fetchImpl: async (url, opts) => {
    calls.push({url, opts}); return url.includes('refresh_access_token') ? success({accessToken: 'rotated-access', refreshToken: 'rotated-refresh', accessTokenExpireIn: tokens.accessExpires, refreshTokenExpireIn: tokens.refreshExpires}) : success([]);
  }});
  await api.post('products', {}); assert.equal(calls[0].opts.headers['x-bs-access-token'], tokens.accessToken); assert.equal(calls[1].opts.headers['x-bs-access-token'], 'rotated-access'); assert.equal(saved.refreshToken, 'rotated-refresh');
});
test('authorization never follows redirects and rejects forged callback state', async () => {
  let saved, followed = false;
  const api = new Client({config: sample, now: () => time, store: {reserve: async () => {}, saveTokens: async value => { saved = value; }}, fetchImpl: async (url, options) => {
    if (url.includes('get_code?')) { assert.equal(options.redirect, 'manual'); const state = new URL(url).searchParams.get('state'); return new Response(null, {status: 302, headers: {location: 'https://nakamaauto.com/management/?auth_code=single-use&state=' + state}}); }
    if (!url.includes('get_access_token')) followed = true;
    return success({access_token: tokens.accessToken, refresh_token: tokens.refreshToken, access_token_expire_in: tokens.accessExpires, refresh_token_expire_in: tokens.refreshExpires});
  }});
  await api.connect(); assert.equal(saved.accessToken, tokens.accessToken); assert.equal(followed, false);
  api.fetch = async () => new Response(null, {status: 302, headers: {location: 'https://nakamaauto.com/management/?auth_code=code&state=forged'}});
  await assert.rejects(api.connect(), /authorization-state-invalid/);
});
test('pagination and settings reject unsafe or ambiguous inputs; movement dates use account timezone', () => {
  assert.throws(() => cursor({has_next: true, current_maxid: '5'}, '5'), /pagination-stalled/);
  assert.throws(() => cursor({data: []}), /pagination-invalid/);
  assert.throws(() => validateSettings({since: '2026-02-30'}, time), /start-date-invalid/);
  assert.throws(() => validateSettings({warehouseIds: ['../../secret']}, time), /warehouse-ids-invalid/);
  assert.equal(accountDate(time, 'Asia/Bangkok'), '2026-10-20 12:00:00');
  const row = normalize('orders', {package_no: 'BS1', recipient_name: 'Private Name', recipient_phone: '123', recipient_address: 'Private Address', item_list: []}, time);
  assert.equal(row.raw.recipient_name, undefined); assert.equal(row.raw.package_no, 'BS1');
});
function harness(api, extra = {}) {
  const seed = {'wmsInternal/connection': {tokens, settings: {since: '2026-10-01', timezone: 'Asia/Bangkok', warehouseIds: ['1']}}};
  for (const feed of FEEDS) seed['wmsFeeds/' + feed] = {lastSuccess: time};
  Object.assign(seed, extra); const db = database(seed), fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
  const member = async (request, roles = ['viewer', 'importer', 'admin']) => { if (!request.auth || !roles.includes(request.auth.role)) fail('permission-denied', 'No access.'); return request.auth; };
  return {db, service: create({db, member, fail, config: () => sample, now: () => time, clientFactory: () => api, sleep: async () => {}})};
}
const admin = data => ({auth: {role: 'admin', uid: 'admin'}, data});
test('viewer can read status without tokens but cannot connect, sync, pause or change settings', async () => {
  const {service} = harness({});
  const viewer = {auth: {role: 'viewer'}, data: {op: 'status'}}, state = await service.handle(viewer);
  assert.equal(state.connected, true); assert.ok(!JSON.stringify(state).includes(tokens.accessToken)); assert.ok(!JSON.stringify(state).includes(tokens.refreshToken));
  for (const op of ['connect', 'sync', 'pause', 'settings']) await assert.rejects(service.handle({...viewer, data: {op}}), error => error.code === 'permission-denied');
});
test('failed inventory pages retain the previous publication and retry at the saved cursor', async () => {
  let failed = true, calls = [];
  const {db, service} = harness({post: async (feed, body) => { calls.push(body); if (body.current_maxid === '50' && failed) throw new BigSellerError('test-failure'); return body.current_maxid ? {data: [{warehouse_id: 1, sku: 'B', onhand: 7, available: 6, allocated: 1, promotion: 0, on_the_way: 2}], has_next: false} : {data: [{warehouse_id: 1, sku: 'A', onhand: 3, available: 3, allocated: 0, promotion: 0, on_the_way: 0}], has_next: true, current_maxid: 50}; }}, {'wmsFeeds/inventory': {revision: 'previous', rowCount: 1}, 'wmsSnapshots/previous/rows/old': {raw: {sku: 'OLD'}}});
  await service.handle(admin({op: 'sync'}));
  let state = db.data.get('wmsFeeds/inventory'); assert.equal(state.revision, 'previous'); assert.equal(state.pending.cursor, '50'); assert.equal(state.lastSuccess, undefined);
  failed = false; await service.handle(admin({op: 'sync'})); state = db.data.get('wmsFeeds/inventory'); assert.notEqual(state.revision, 'previous'); assert.equal(state.pending, null); assert.equal(state.rowCount, 2); assert.equal(state.totals.onhand, 10); assert.equal(calls.filter(b => !b.current_maxid).length, 1);
});
test('order detail failures never advance the time checkpoint and replay replaces packages once', async () => {
  let failDetails = true;
  const {db, service} = harness({post: async feed => { if (feed === 'orders') return {data: [{package_id: 'BS1'}], has_next: false}; if (failDetails) throw new BigSellerError('test-failure'); return {data: [{package_no: 'BS1', order_no: 'ORDER1', send_warehouse_id: 44, send_warehouse_name: 'Main', recipient_name: 'Private', item_list: []}]}; }}, {'wmsFeeds/orders': {}});
  await service.handle(admin({op: 'sync'})); assert.equal(db.data.get('wmsFeeds/orders').checkpoint, undefined);
  failDetails = false; await service.handle(admin({op: 'sync'})); assert.ok(db.data.get('wmsFeeds/orders').checkpoint > Date.parse('2026-10-01'));
  const records = [...db.data.keys()].filter(key => key.startsWith('wmsRecords/orders/rows/')); assert.equal(records.length, 1); assert.equal(db.data.get(records[0]).raw.recipient_name, undefined); assert.equal(db.data.get('wmsKnownWarehouses/44').name, 'Main');
});
test('snapshot pages bind to the published revision and do not expose staging rows', async () => {
  const {service} = harness({}, {'wmsFeeds/inventory': {revision: 'published', lastSuccess: time}, ['wmsSnapshots/published/rows/' + 'a'.repeat(64)]: {raw: {sku: 'VISIBLE'}}, ['wmsSnapshots/staging/rows/' + 'b'.repeat(64)]: {raw: {sku: 'STAGING'}}});
  const response = await service.handle(admin({op: 'page', feed: 'inventory'})); assert.equal(response.rows.length, 1); assert.equal(response.rows[0].raw.sku, 'VISIBLE');
  await assert.rejects(service.handle(admin({op: 'page', feed: 'inventory', revision: 'stale'})), error => error.code === 'aborted');
  await assert.rejects(service.handle(admin({op: 'page', feed: 'inventory', cursor: 'bad'})), error => error.code === 'invalid-argument');
});
test('duplicate unified settlement identities block checkpointing instead of overwriting records', async () => {
  const row = {platform: 'shopee', bs_shop_id: '1', order_no: 'ORDER1', platform_income: '100.00'};
  const {db, service} = harness({post: async feed => feed === 'settlements' ? {data: [{order_no: 'ORDER1'}], has_next: false} : {data: [row, row]}}, {'wmsFeeds/settlements': {}});
  await service.handle(admin({op: 'sync'})); const saved = db.data.get('wmsFeeds/settlements'); assert.equal(saved.checkpoint, undefined); assert.equal(saved.error.code, 'settlement-record-identity-ambiguous');
});
test('overlapping manual syncs share one lease and returned status reports completion after release', async () => {
  let release, started;
  const waiting = new Promise(resolve => { started = resolve; });
  const {service} = harness({post: async () => { started(); await new Promise(resolve => { release = resolve; }); return {data: [], has_next: false}; }}, {'wmsFeeds/products': {}});
  const first = service.handle(admin({op: 'sync'})); await waiting;
  await assert.rejects(service.handle(admin({op: 'sync'})), error => error.code === 'aborted');
  release(); const done = await first; assert.equal(done.syncing, false);
});
test('open returns are re-read by internal ID even when the original order is older than recent windows', async () => {
  const id = 'a'.repeat(64), calls = [];
  const {service, db} = harness({post: async (name, body) => { calls.push({name, body}); return {data: [{id: 'RETURN1', in_warehouse_status: 'ALL_IN_WAREHOUSE', actual_stock_in: 1}]}; }}, {'wmsFeeds/openReturns': {}, ['wmsRecords/returns/rows/' + id]: {raw: {id: 'RETURN1', in_warehouse_status: 'WAIT_IN_WAREHOUSE'}}});
  await service.handle(admin({op: 'sync'})); assert.equal(calls[0].name, 'returnDetails'); assert.equal(calls[0].body.type, 2); assert.deepEqual(calls[0].body.order_no_list, ['RETURN1']); assert.ok(db.data.get('wmsFeeds/openReturns').lastSuccess);
});
test('secret provisioning extracts the credential card without running the CLI', () => {
  const {extractDocument} = require('../scripts/configure-bigseller.cjs');
  const config = extractDocument('<h2>Access credentials · Partner</h2><table><tr><td>app_id</td><td>' + sample.appId + '</td></tr><tr><td>app_key</td><td>' + sample.appKey + '</td></tr></table><h2>1. Overall Introduction</h2>');
  assert.equal(config.appId, sample.appId); assert.equal(config.appKey, sample.appKey); assert.throws(() => extractDocument('<p>Unrelated document</p>'), /not found/);
});
