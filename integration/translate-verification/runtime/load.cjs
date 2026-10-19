'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const refuse = () => { throw new Error('Forbidden: real network, storage or chapter-specific presentation in verification bundle'); };

/** Execute exact transpiled Norya modules, with explicit environmental boundaries. */
function domain(fetcher = refuse) {
  const cache = new Map();
  const context = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, URLSearchParams,
    AbortSignal, fetch: fetcher, console, setTimeout, clearTimeout });
  const storage = { getItem: refuse, setItem: refuse, removeItem: refuse };
  function load(name) {
    if (name === 'react-native') return { Platform: { OS: 'verification-no-storage' } };
    if (name === '@react-native-async-storage/async-storage') return storage;
    if (name === './displayCorrections') return { sourcePresentation: refuse };
    const base = name.replace(/^\.\//, '');
    if (!/^[A-Za-z]+$/.test(base)) throw new Error('Unexpected module ' + name);
    if (cache.has(base)) return cache.get(base).exports;
    const filename = path.join(__dirname, 'domain', base + '.cjs');
    const module = { exports: {} }; cache.set(base, module);
    const script = new vm.Script('(function(require,module,exports){\n' + fs.readFileSync(filename, 'utf8') + '\n})', { filename });
    script.runInContext(context)(load, module, module.exports);
    return module.exports;
  }
  return { bridge: load('translateBridge'), client: load('translateClient'), load };
}
function proxy() {
  const module = { exports: {} };
  // No process.env and no real fetch available. Tests must supply fictional config + transport.
  const context = vm.createContext({ module, exports: module.exports, URL, Buffer, AbortSignal, fetch: refuse });
  new vm.Script(fs.readFileSync(path.join(__dirname, '../source/server/translate.cjs'), 'utf8'),
    { filename: 'source/server/translate.cjs' }).runInContext(context);
  return module.exports;
}
module.exports = { domain, proxy };
