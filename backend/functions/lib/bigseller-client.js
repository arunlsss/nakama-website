'use strict';
const crypto = require('node:crypto');
const PATHS = Object.freeze({
  orders: '/api/order/v1/get_order_ids', orderDetails: '/api/order/v1/get_order_details',
  returns: '/api/order/v1/get_inwarehouse_order_ids', returnDetails: '/api/order/v1/get_inwarehouse_order_details',
  settlements: '/api/data/v1/get_settlement_order_ids', settlementDetails: '/api/data/v1/get_settlement_order_details',
  warehouses: '/api/inventory/v1/get_warehouse_list', inventory: '/api/inventory/v1/get_inventory_list_detail',
  products: '/api/inventory/v1/get_commodity_sku_list', movements: '/api/inventory/v1/get_inventory_record',
  shopeeWallet: '/api/data/v1/get_shopee_wallet_transactions', tiktokWallet: '/api/data/v1/get_tiktok_wallet_transactions',
  lazadaWallet: '/api/data/v1/get_lazada_wallet_transactions', rate: '/api/data/v1/get_rate',
  ...Object.fromEntries(['shopee', 'tiktok', 'lazada'].flatMap(platform => [
    [platform + 'Details', `/api/data/v1/get_${platform}_settlement_order_details`],
    [platform + 'SkuDetails', `/api/data/v1/get_${platform}_settlement_order_sku_details`]
  ]))
});
class BigSellerError extends Error {
  constructor(code, requestId = '') {
    super(`BigSeller request failed (${String(code).replace(/[^\w-]/g, '').slice(0, 40)}${requestId ? '; reference ' + String(requestId).replace(/[^\w-]/g, '').slice(0, 100) : ''}).`);
    this.code = String(code); this.requestId = requestId;
  }
}
function sign(appId, appKey, path, params, encode = false) {
  const value = v => typeof v === 'string' ? v : JSON.stringify(v);
  const pairs = Object.keys(params).filter(k => k !== 'sign' && params[k] != null && value(params[k]) !== '')
    .sort().map(k => k + '=' + (encode ? encodeURIComponent(value(params[k])) : value(params[k])));
  return crypto.createHmac('sha256', appKey).update(appId + path + '/' + pairs.join('&')).digest('hex');
}
// Preserve int64 identifiers and decimal money before JSON.parse can round them.
function parseJson(text) {
  return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => {
    if (token[0] === '"') return token;
    if (/[.eE]/.test(token) || !Number.isSafeInteger(Number(token))) return JSON.stringify(token);
    return token;
  }));
}
function credentials(value) {
  let config;
  try { config = typeof value === 'string' ? JSON.parse(value) : value; } catch { throw new BigSellerError('configuration-invalid'); }
  if (!config || !/^[A-Za-z0-9_-]{3,100}$/.test(config.appId || '') || !/^[a-f\d]{64}$/i.test(config.appKey || '')) throw new BigSellerError('configuration-required');
  const host = config.host || 'https://open-platform.bigseller.com';
  if (!['https://open-platform.bigseller.com', 'https://open-platform.bigseller.pro'].includes(host)) throw new BigSellerError('host-invalid');
  return {appId: config.appId, appKey: config.appKey, host};
}
function tokenData(data) {
  const accessToken = data?.accessToken ?? data?.access_token, refreshToken = data?.refreshToken ?? data?.refresh_token;
  const accessExpires = Number(data?.accessTokenExpireIn ?? data?.access_token_expire_in);
  const refreshExpires = Number(data?.refreshTokenExpireIn ?? data?.refresh_token_expire_in);
  if (typeof accessToken !== 'string' || !accessToken || typeof refreshToken !== 'string' || !refreshToken || !Number.isFinite(accessExpires) || accessExpires < 1e9 || !Number.isFinite(refreshExpires) || refreshExpires < 1e9) throw new BigSellerError('token-response-invalid');
  return {accessToken, refreshToken, accessExpires, refreshExpires};
}
class Client {
  constructor({config, store, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now}) {
    this.config = credentials(config); this.store = store; this.fetch = fetchImpl; this.sleep = sleep; this.now = now;
  }
  async transport(path, body, token, attempt = 0) {
    await this.store.reserve(path);
    const {appId, appKey, host} = this.config;
    const signature = sign(appId, appKey, path, body);
    const isExchange = path === '/api/auth/v1/get_access_token';
    let response;
    try {
      response = await this.fetch(host + path, {method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25000),
        headers: {'Content-Type': 'application/json; charset=utf-8', 'x-bs-app-id': appId, ...(token ? {'x-bs-access-token': token} : {}), ...(!isExchange ? {'x-bs-sign': signature} : {})},
        body: JSON.stringify(isExchange ? {...body, sign: signature} : body)});
    } catch { throw new BigSellerError('connection-unavailable'); }
    let result;
    try { result = parseJson(await response.text()); } catch { throw new BigSellerError('response-invalid'); }
    const code = String(result.error_code || response.status);
    if ((response.status === 429 || response.status >= 500 || ['10100002', '40101014'].includes(code)) && attempt < 2) {
      await this.sleep(1500 * 2 ** attempt + Math.floor(Math.random() * 300));
      return this.transport(path, body, token, attempt + 1);
    }
    const succeeded = result.success === true || (result.success == null && [0, 200].includes(result.code));
    if (!response.ok || !succeeded || result.error_code) throw new BigSellerError(code, result.request_id);
    return result;
  }
  async connect() {
    const {appId, appKey, host} = this.config, path = '/api/auth/v1/get_code';
    const state = crypto.randomBytes(24).toString('hex'), callback = 'https://nakamaauto.com/management/';
    const params = {app_id: appId, redirect_url: callback, timestamp: Math.floor(this.now() / 1000), state};
    const query = new URLSearchParams({...params, sign: sign(appId, appKey, path, params, true)});
    await this.store.reserve(path);
    let response;
    try { response = await this.fetch(host + path + '?' + query, {redirect: 'manual', signal: AbortSignal.timeout(25000)}); }
    catch { throw new BigSellerError('connection-unavailable'); }
    const location = response.headers.get('location');
    if (response.status !== 302 || !location) throw new BigSellerError('authorization-redirect-required');
    let redirect;
    try { redirect = new URL(location); } catch { throw new BigSellerError('authorization-redirect-invalid'); }
    if (redirect.origin + redirect.pathname !== callback || redirect.searchParams.get('state') !== state || !redirect.searchParams.get('auth_code')) throw new BigSellerError('authorization-state-invalid');
    // The redirect is inspected server-side and never followed or exposed to the browser.
    const result = await this.transport('/api/auth/v1/get_access_token', {app_id: appId, auth_code: redirect.searchParams.get('auth_code')});
    const tokens = tokenData(result.data); await this.store.saveTokens(tokens); return tokens;
  }
  async tokens(force = false) {
    let tokens = await this.store.loadTokens();
    if (!tokens) throw new BigSellerError('connect-required');
    if (force || tokens.accessExpires * 1000 < this.now() + 86400000) {
      if (tokens.refreshExpires * 1000 <= this.now()) throw new BigSellerError('reconnect-required');
      const result = await this.transport('/api/auth/v1/refresh_access_token', {refresh_token: tokens.refreshToken}, tokens.accessToken);
      tokens = tokenData(result.data); await this.store.saveTokens(tokens);
    }
    return tokens;
  }
  async post(name, body) {
    const path = PATHS[name]; if (!path) throw new BigSellerError('interface-invalid');
    const tokens = await this.tokens();
    try { return await this.transport(path, body, tokens.accessToken); }
    catch (e) {
      if (e.code !== '40101005') throw e;
      return this.transport(path, body, (await this.tokens(true)).accessToken);
    }
  }
}
module.exports = {Client, PATHS, BigSellerError, sign, parseJson, credentials, tokenData};
