'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), {JSDOM} = require('../backend/node_modules/jsdom');
const flush = () => new Promise(resolve => setTimeout(resolve, 10));
const state = {connected: true, paused: false, syncing: false, settings: {since: '2026-10-01', timezone: 'Asia/Bangkok', warehouseIds: []}, feeds: [{name: 'inventory', revision: 'snapshot', rowCount: 1, warehouseCount: 1, scope: 'Selected warehouses', lastSuccess: Date.now(), totals: {onhand: 20, available: 15, allocated: 5, on_the_way: 3}}]};
function harness(mock = {}) {
  const dom = new JSDOM(fs.readFileSync(require.resolve('../wms.html'), 'utf8'), {url: 'https://nakamaauto.com/wms/?embedded=1', runScripts: 'outside-only'}), w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; }; w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  let receive; const calls = [];
  const api = {start: next => { receive = next; }, call: async (name, args) => { calls.push(args); if (mock.call) return mock.call(name, args); if (args.op === 'status') return structuredClone(state); return {rows: [{id: 'record', raw: {sku: '<img src=x onerror=alert(1)>', sku_name: 'Wiper', warehouse_name: 'Main', onhand: 20, available: 15, allocated: 5, promotion: 0, on_the_way: 3}}], published: true, nextCursor: null, lastSuccess: Date.now()}; }};
  const source = fs.readFileSync(require.resolve('../assets/wms.js'), 'utf8').split("  if (document.documentElement.dataset.embedded !== 'true')")[0] + '})();';
  vm.runInContext(source, dom.getInternalVMContext()); const instance = w.NKMWms.mount(api);
  return {dom, w, calls, instance, receive: next => receive(next)};
}
test('viewer sees stock but not connection/sync controls, source values stay text, sign-out clears data', async () => {
  const {dom, w, receive} = harness(); receive({user: {uid: 'viewer'}, role: 'viewer'}); await flush();
  assert.equal(w.document.getElementById('metric-onhand').textContent, '20'); assert.equal(w.document.getElementById('sync').hidden, true); assert.equal(w.document.getElementById('connection-settings').hidden, true);
  assert.equal(w.document.querySelector('#records-body img'), null); assert.match(w.document.getElementById('records-body').textContent, /<img/);
  w.document.querySelector('.wms-row-link').click(); assert.equal(w.document.getElementById('record-dialog').open, true);
  receive(null); assert.equal(w.document.getElementById('records-body').textContent, ''); assert.equal(w.document.getElementById('record-details').textContent, ''); assert.equal(w.document.getElementById('record-dialog').open, false); assert.equal(w.document.getElementById('metric-onhand').textContent, '—'); dom.window.close();
});
test('delayed data is discarded after account revocation', async () => {
  let finish; const {dom, w, receive} = harness({call: async (name, args) => args.op === 'status' ? state : new Promise(resolve => { finish = resolve; })});
  receive({user: {uid: 'a'}, role: 'admin'}); await flush(); receive({user: {uid: 'a'}, blocked: true});
  finish({rows: [{raw: {sku: 'SHOULD-NOT-APPEAR'}}], published: true}); await flush(); assert.equal(w.document.getElementById('records-body').textContent, ''); assert.equal(w.document.getElementById('sync').hidden, true); dom.window.close();
});
test('tabs support keyboard navigation and filter only the loaded page', async () => {
  const {dom, w, calls, receive} = harness(); receive({user: {uid: 'admin'}, role: 'admin'}); await flush();
  const first = w.document.getElementById('tab-inventory'); first.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})); await flush(); assert.equal(w.document.getElementById('tab-orders').getAttribute('aria-selected'), 'true'); assert.equal(calls.at(-1).feed, 'orders');
  const search = w.document.getElementById('search'); search.value = 'unmatched'; search.dispatchEvent(new w.Event('input')); assert.match(w.document.getElementById('records-body').textContent, /No matches on this page/); assert.equal(w.document.getElementById('sync').hidden, false); dom.window.close();
});
test('management shell opens the WMS route and removes it when access is lost', () => {
  const dom = new JSDOM('<main></main><section id="wms-view"></section>', {url: 'https://nakamaauto.com/management/', runScripts: 'outside-only'}), w = dom.window;
  vm.runInContext(fs.readFileSync(require.resolve('../assets/workspace-shell.js'), 'utf8'), dom.getInternalVMContext()); let access = true;
  const shell = w.NKMWorkspace.create({session: () => ({user: {uid: 'a'}}), allowed: () => access, api: () => ({}), navigate: () => {}});
  shell.open('wms'); const frame = w.document.querySelector('iframe'); assert.match(frame.src, /\/wms\/\?embedded=1/); assert.equal(frame.title, 'WMS & Orders workspace'); shell.open('wms'); assert.equal(w.document.querySelectorAll('iframe').length, 1);
  access = false; shell.session(null); assert.equal(w.document.querySelectorAll('iframe').length, 0); dom.window.close();
  const management = new JSDOM(fs.readFileSync(require.resolve('../management.html'), 'utf8')).window.document; assert.equal(management.querySelectorAll('nav [data-view="wms"]').length, 2); management.defaultView.close();
});
