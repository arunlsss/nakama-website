'use strict';
const fs = require('node:fs'), path = require('node:path'), {spawnSync} = require('node:child_process');
const {credentials} = require('../functions/lib/bigseller-client');
function extractDocument(html) {
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const start = text.indexOf('Access credentials ·'), end = text.indexOf('1. Overall Introduction', start);
  if (start < 0 || end < 0) throw Error('The BigSeller credential card was not found in this document.');
  const card = text.slice(start, end), appId = card.match(/app_id\s+([A-Za-z0-9_-]{3,100})\b/)?.[1], appKey = card.match(/app_key\s+([a-f\d]{64})\b/i)?.[1];
  return credentials({appId, appKey});
}
function main(args) {
  const value = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; }, project = value('--project');
  require('./project.cjs')(project);
  const document = value('--document'), json = value('--credentials');
  if (Boolean(document) === Boolean(json)) throw Error('Supply --document /path/to/BigSeller.html OR --credentials /path/to/private-config.json, plus --project nakama-sales.');
  const config = document ? extractDocument(fs.readFileSync(path.resolve(document), 'utf8')) : credentials(fs.readFileSync(path.resolve(json), 'utf8'));
  const directory = path.join(__dirname, '../private'); fs.mkdirSync(directory, {recursive: true, mode: 0o700});
  const temporary = fs.mkdtempSync(path.join(directory, 'secret-')), file = path.join(temporary, 'config.json');
  try {
    fs.writeFileSync(file, JSON.stringify(config), {mode: 0o600});
    const result = spawnSync(process.execPath, [require.resolve('firebase-tools/lib/bin/firebase.js'), 'functions:secrets:set', 'NKM_BIGSELLER_CONFIG', '--project', project, '--data-file', file], {cwd: path.join(__dirname, '..'), stdio: 'inherit'});
    if (result.error || result.status !== 0) throw Error('BigSeller secret setup failed. Check your Firebase project permissions and try again.');
    console.log('BigSeller configuration saved securely. Deploy nkmWms and nkmWmsSchedule, then connect from WMS & Orders.');
  } finally { fs.rmSync(temporary, {recursive: true, force: true}); }
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = {extractDocument};
