// Runs learner JavaScript in a throw-away Web Worker (no access to the page, cookies or storage).
// Captures console output, waits for timers/promises to finish, supports check(actual, expected) tests,
// and kills the worker after a time limit so infinite loops can't freeze the page.

export type LogLine = { kind: 'log' | 'warn' | 'error' | 'info'; text: string }
export type TestResult = { ok: boolean; label: string; actual: string; expected: string }
export type JsRun = { logs: LogLine[]; tests: TestResult[]; error?: string; timedOut?: boolean; ms: number }

const WORKER_SRC = `
const out = [];
const fmt = (v, depth = 0) => {
  if (typeof v === 'string') return depth ? JSON.stringify(v) : v;
  if (typeof v === 'function') return v.name ? '[Function: ' + v.name + ']' : '[Function (anonymous)]';
  if (typeof v === 'symbol' || typeof v === 'bigint') return v.toString() + (typeof v === 'bigint' ? 'n' : '');
  if (v === undefined) return 'undefined';
  if (v instanceof Error) return v.name + ': ' + v.message;
  if (v instanceof Map) return 'Map(' + v.size + ') {' + [...v].map(([k, x]) => fmt(k, 1) + ' => ' + fmt(x, 1)).join(', ') + '}';
  if (v instanceof Set) return 'Set(' + v.size + ') {' + [...v].map((x) => fmt(x, 1)).join(', ') + '}';
  if (v instanceof Promise) return 'Promise { <pending> }';
  if (Array.isArray(v)) return depth > 3 ? '[Array]' : '[' + v.map((x) => fmt(x, depth + 1)).join(', ') + ']';
  if (v && typeof v === 'object') {
    if (depth > 3) return '[Object]';
    const body = Object.keys(v).map((k) => k + ': ' + fmt(v[k], depth + 1)).join(', ');
    return '{ ' + body + ' }';
  }
  return String(v);
};
for (const kind of ['log', 'info', 'warn', 'error']) console[kind] = (...a) => out.push({ kind, text: a.map((x) => fmt(x)).join(' ') });
console.table = (d) => out.push({ kind: 'log', text: fmt(d) });

let pending = 0;
const _st = setTimeout, _ct = clearTimeout, _si = setInterval, _ci = clearInterval;
const live = new Set();
self.setTimeout = (fn, ms, ...args) => { pending++; const id = _st(() => { live.delete(id); pending--; fn(...args); }, ms); live.add(id); return id; };
self.clearTimeout = (id) => { if (live.delete(id)) pending--; _ct(id); };
self.setInterval = (fn, ms, ...args) => { pending++; const id = _si(fn, ms, ...args); live.add(id); return id; };
self.clearInterval = (id) => { if (live.delete(id)) pending--; _ci(id); };
self.fetch = () => Promise.reject(new Error('Network calls are turned off in the practice runner.'));

const tests = [];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (actual, expected, label) => tests.push({ ok: same(actual, expected), label: label || '', actual: fmt(actual, 1), expected: fmt(expected, 1) });

onmessage = async (e) => {
  let error;
  try { await (new Function('check', '"use strict";\\nreturn (async () => {\\n' + e.data + '\\n})()'))(check); }
  catch (err) { error = (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err)); }
  // Let timers and promise callbacks finish (max ~2.5 s).
  const t0 = Date.now();
  while (pending > 0 && Date.now() - t0 < 2500) await new Promise((r) => _st(r, 20));
  await new Promise((r) => _st(r, 0));
  postMessage({ logs: out, tests, error });
};`

let workerUrl: string | null = null

export function runJs(code: string, tests = '', limitMs = 4000): Promise<JsRun> {
  workerUrl ??= URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))
  const started = performance.now()
  return new Promise((resolve) => {
    let worker: Worker
    try { worker = new Worker(workerUrl!) }
    catch { resolve({ logs: [], tests: [], error: 'This browser blocked the code runner. Try Chrome or Edge.', ms: 0 }); return }
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ logs: [], tests: [], timedOut: true, ms: Math.round(performance.now() - started) })
    }, limitMs)
    worker.onmessage = ({ data }) => {
      clearTimeout(timer); worker.terminate()
      resolve({ ...data, ms: Math.round(performance.now() - started) })
    }
    worker.onerror = (e) => {
      clearTimeout(timer); worker.terminate()
      resolve({ logs: [], tests: [], error: e.message || 'Syntax error in your code.', ms: 0 })
      e.preventDefault()
    }
    worker.postMessage(tests ? code + '\n;\n' + tests : code)
  })
}
