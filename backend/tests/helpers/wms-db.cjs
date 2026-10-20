'use strict';
// Small deterministic Firestore substitute for exercising sync recovery and publication boundaries.
module.exports = function memoryDatabase(seed = {}) {
  const data = new Map(Object.entries(seed).map(([key, value]) => [key, structuredClone(value)]));
  let tail = Promise.resolve();
  const snapshot = path => ({id: path.split('/').at(-1), exists: data.has(path), data: () => structuredClone(data.get(path))});
  const apply = ops => { for (const [op, ref, value, options] of ops) { if (op === 'delete') data.delete(ref.path); else data.set(ref.path, options?.merge ? {...data.get(ref.path), ...structuredClone(value)} : structuredClone(value)); } };
  const doc = path => ({path, get: async () => snapshot(path), set: async (value, options) => apply([['set', {path}, value, options]])});
  function collection(path, start = '', limit = Infinity) {
    return {doc: id => doc(path + '/' + id), orderBy: () => collection(path, start, limit), startAfter: id => collection(path, id, limit), limit: n => collection(path, start, n),
      get: async () => ({docs: [...data.keys()].filter(key => key.startsWith(path + '/') && key.slice(path.length + 1).split('/').length === 1 && key.split('/').at(-1) > start).sort().slice(0, limit).map(snapshot)})};
  }
  function writer() { const ops = []; return {get: ref => ref.get(), set: (ref, value, options) => { ops.push(['set', ref, value, options]); }, delete: ref => { ops.push(['delete', ref]); }, commit: async () => apply(ops)}; }
  return {data, doc, collection, batch: writer, recursiveDelete: async ref => { for (const key of data.keys()) if (key === ref.path || key.startsWith(ref.path + '/')) data.delete(key); },
    runTransaction: fn => { const promise = tail.then(async () => { const tx = writer(), result = await fn(tx); await tx.commit(); return result; }); tail = promise.catch(() => {}); return promise; }};
};
