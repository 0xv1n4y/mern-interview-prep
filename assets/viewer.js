// Interview Prep viewer: renders the Markdown in <script id="doc"> into a three-column docs page.
// Authoring syntax (keeps the content files small):
//   ## Section                      -> section heading (listed under "On this page")
//   ### Question text {basic|mid|adv} -> collapsible question card with a "done" checkbox
//   :::quick / :::say / :::tip / :::warn / :::proj / :::note / :::ts ... :::   -> coloured answer boxes
//   ```mermaid ... ```              -> diagram
//   :::practice  (```js starter``` + ```js tests```) :::  -> editor with Run button
//   :::hint ... :::  /  :::solution ... :::               -> click-to-reveal hints

// [group, [[file, label, icon, ready], ...]]: set ready to true when a document is added.
const GROUPS = [
  ["Start here", [["index.html", "Your interview plan", "🎯", true]]],
  ["Languages", [["01-javascript.html", "JavaScript", "🟨", true], ["01b-typescript.html", "TypeScript ⭐", "🔷", true]]],
  ["Frontend & backend", [["02-react.html", "React", "⚛️", true], ["03-node-express.html", "Node & Express", "🟩", true], ["06-backend-essentials.html", "Backend essentials", "🧱", false]]],
  ["Databases", [["04-mongodb.html", "MongoDB", "🍃", true], ["05-postgresql.html", "PostgreSQL", "🐘", true]]],
  ["Coding rounds", [["07-dsa.html", "DSA", "🧮", false], ["08-machine-coding.html", "Machine coding", "🛠️", false]]],
  ["Your story", [["09-my-projects.html", "My projects ⭐", "📁", true], ["10-hr.html", "HR & behavioural ⭐", "🤝", true]]],
];

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: progress just won't persist */ } },
};

function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}

const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const isDark = () => document.documentElement.dataset.theme !== "light";

// --- 1. Pre-process custom blocks into HTML that marked will pass through ---
function preprocess(md, practices) {
  let hintN = 0;
  return md.replace(/^:::(\w+)[^\n]*\n([\s\S]*?)\n:::[ \t]*$/gm, (_, type, inner) => {
    if (type === "practice") {
      const starter = (inner.match(/```js starter\n([\s\S]*?)```/) || [])[1] || "";
      const tests = (inner.match(/```js tests\n([\s\S]*?)```/) || [])[1] || "";
      practices.push({ starter, tests });
      hintN = 0;
      return `<div class="practice" data-i="${practices.length - 1}"></div>`;
    }
    if (type === "hint") return `<details class="reveal"><summary>💡 Hint ${++hintN}</summary><div>\n\n${inner}\n\n</div></details>`;
    if (type === "solution") hintN = 0;   // next question's hints start again at 1
    if (type === "solution") return `<details class="reveal solution"><summary>✅ Show solution</summary><div>\n\n${inner}\n\n</div></details>`;
    if (type === "quick") inner = inner.replace(/\n(?=\S)/g, "\n\n");   // answer and "Why" on separate lines
    return `<div class="box ${type}">\n\n${inner}\n\n</div>`;
  });
}

// --- 2. Group each ### question and the content after it into a card ---
function buildCards(root, docId) {
  const level = { basic: ["basic", "🟢 Basic"], mid: ["mid", "🟡 Intermediate"], adv: ["adv", "🔴 Advanced"] };
  [...root.querySelectorAll("h3")].forEach((h3) => {
    let text = h3.innerHTML, diff = null;
    const m = text.match(/\s*\{(basic|mid|adv)\}\s*$/);
    if (m) { diff = m[1]; text = text.replace(m[0], ""); }
    const id = slug(text);
    const card = document.createElement("details");
    card.className = "q"; card.id = id; card.dataset.diff = diff || "";
    const key = `ip:${docId}:${id}`;
    const tag = diff ? `<span class="tag ${level[diff][0]}">${level[diff][1]}</span>` : "";
    card.innerHTML = `<summary><span class="title">${text}</span>${tag}<label class="done-box"><input type="checkbox"> Done</label></summary><div class="body"></div>`;
    const body = card.querySelector(".body");
    let n = h3.nextSibling;
    while (n && !(n.nodeType === 1 && /^H[123]$/.test(n.tagName))) { const next = n.nextSibling; body.appendChild(n); n = next; }
    h3.replaceWith(card);
    const box = card.querySelector(".done-box input");
    box.checked = store.get(key) === "1";
    card.classList.toggle("is-done", box.checked);
    card.querySelector(".done-box").addEventListener("click", (e) => e.stopPropagation());
    box.addEventListener("change", () => { store.set(key, box.checked ? "1" : "0"); card.classList.toggle("is-done", box.checked); updateProgress(); });
  });
}

// --- 3. Practice editors: run code + tests in a worker with a time limit ---
function buildPractice(root, practices, docId) {
  root.querySelectorAll(".practice").forEach((el) => {
    const p = practices[+el.dataset.i];
    const key = `ip:${docId}:code:${el.dataset.i}`;
    el.innerHTML = `<textarea spellcheck="false" aria-label="Your code"></textarea>
      <div class="row"><button class="btn run">▶ Run tests</button><button class="btn ghost reset">Reset code</button></div>
      <pre class="output" aria-live="polite">Write your solution, then press Run tests.</pre>`;
    const ta = el.querySelector("textarea"), out = el.querySelector(".output");
    ta.value = store.get(key) ?? p.starter;
    ta.addEventListener("input", () => store.set(key, ta.value));
    ta.addEventListener("keydown", (e) => { if (e.key === "Tab") { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText("  ", s, ta.selectionEnd, "end"); } });
    el.querySelector(".reset").onclick = () => { ta.value = p.starter; store.set(key, p.starter); out.textContent = "Code reset to the starting template."; };
    el.querySelector(".run").onclick = () => runTests(ta.value, p.tests, out);
  });
}

const WORKER_SRC = `
const logs = [];
console.log = (...a) => logs.push(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" "));
const results = [];
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function check(actual, expected, label) { results.push({ ok: same(actual, expected), label: label || "", actual: JSON.stringify(actual), expected: JSON.stringify(expected) }); }
onmessage = async (e) => {
  try { await (new Function("check", "return (async () => {" + e.data + "})()"))(check); postMessage({ results, logs }); }
  catch (err) { postMessage({ error: String(err), results, logs }); }
};`;

function runTests(code, tests, out) {
  out.textContent = "Running…";
  let worker;
  try { worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }))); }
  catch { out.textContent = "This browser blocked the code runner. Try Chrome or Edge."; return; }
  const timer = setTimeout(() => { worker.terminate(); out.innerHTML = '<span class="fail">Stopped after 3 seconds. Check for an infinite loop.</span>'; }, 3000);
  worker.onmessage = ({ data }) => {
    clearTimeout(timer); worker.terminate();
    const lines = [];
    if (data.logs.length) lines.push("console.log output:\n" + esc(data.logs.join("\n")) + "\n");
    if (data.error) lines.push(`<span class="fail">Error: ${esc(data.error)}</span>`);
    data.results.forEach((r, i) => lines.push(r.ok
      ? `<span class="pass">✔ Test ${i + 1} passed</span> ${esc(r.label)}`
      : `<span class="fail">✘ Test ${i + 1} failed</span> ${esc(r.label)}\n   expected ${esc(r.expected)}\n   got      ${esc(r.actual)}`));
    const passed = data.results.filter((r) => r.ok).length;
    if (data.results.length) lines.push(passed === data.results.length ? `\n<span class="pass">🎉 All ${passed} tests passed!</span>` : `\n${passed}/${data.results.length} passed. Open a hint if you're stuck.`);
    out.innerHTML = lines.join("\n");
  };
  worker.postMessage(code + "\n;\n" + tests);
}

// --- 4. Progress, filters and the "On this page" column ---
function sectionCards(h2) {
  const cards = [];
  for (let n = h2.nextElementSibling; n && n.tagName !== "H2"; n = n.nextElementSibling) if (n.matches("details.q")) cards.push(n);
  return cards;
}

function updateProgress() {
  const cards = [...document.querySelectorAll("details.q")];
  const done = cards.filter((c) => c.classList.contains("is-done")).length;
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
  const p = document.querySelector(".progress");
  if (p) { p.querySelector(".bar span").style.width = pct + "%"; p.querySelector("small").textContent = `${done} of ${cards.length} done · ${pct}%`; }
  document.querySelectorAll(".onpage li[data-id]").forEach((li) => {
    const list = sectionCards(document.getElementById(li.dataset.id));
    const d = list.filter((c) => c.classList.contains("is-done")).length;
    const count = li.querySelector(".count");
    if (count) count.textContent = list.length ? `${d}/${list.length}` : "";
    li.classList.toggle("complete", list.length > 0 && d === list.length);
  });
}

function buildFilters(content, search) {
  if (!content.querySelector("details.q")) return;
  const h1 = content.querySelector("h1");
  const anchor = h1?.nextElementSibling?.classList.contains("lead") ? h1.nextElementSibling : h1;
  const bar = document.createElement("div");
  bar.className = "filters";
  bar.innerHTML = `<button class="chip on" data-f="all">All</button><button class="chip" data-f="basic">🟢 Basic</button><button class="chip" data-f="mid">🟡 Intermediate</button><button class="chip" data-f="adv">🔴 Advanced</button><button class="chip" data-f="todo">Not done</button>`;
  anchor.after(bar);
  let filter = "all";
  const apply = () => {
    const q = search.value.trim().toLowerCase();
    content.querySelectorAll("details.q").forEach((c) => {
      const okText = !q || c.textContent.toLowerCase().includes(q);
      const okFilter = filter === "all" || (filter === "todo" ? !c.classList.contains("is-done") : c.dataset.diff === filter);
      c.classList.toggle("hidden", !(okText && okFilter));
      if (q && okText) c.open = true;
    });
    content.querySelectorAll("h2").forEach((h2) => {
      const list = sectionCards(h2);
      h2.classList.toggle("hidden", list.length > 0 && list.every((c) => c.classList.contains("hidden")));
    });
  };
  search.addEventListener("input", apply);
  bar.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
    bar.querySelectorAll(".chip").forEach((x) => x.classList.remove("on")); b.classList.add("on"); filter = b.dataset.f; apply();
  }));
}

function buildOnPage(col, content) {
  const hasCards = content.querySelector("details.q");
  col.innerHTML = (hasCards ? `<div class="progress"><strong>Your progress</strong><div class="bar"><span></span></div><small></small></div>` : "")
    + `<p class="onpage-title">☰ On this page</p><ul></ul>`;
  const ul = col.querySelector("ul");
  const heads = [...content.querySelectorAll("h2")];
  heads.forEach((h2) => {
    if (!h2.id) h2.id = slug(h2.textContent);
    const li = document.createElement("li");
    li.dataset.id = h2.id;
    li.innerHTML = `<a href="#${h2.id}">${esc(h2.textContent)}</a><span class="count"></span>`;
    ul.appendChild(li);
  });
  // Highlight the section currently on screen.
  const links = [...ul.querySelectorAll("li")];
  const spy = () => {
    let current = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < 140) current = h;
    links.forEach((li) => li.classList.toggle("active", li.dataset.id === current?.id));
  };
  addEventListener("scroll", spy, { passive: true });
  spy();
  updateProgress();
}

// --- 5. Page shell ---
async function main() {
  document.documentElement.dataset.theme = store.get("ip:theme") || "dark";
  const fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(fonts);

  const file = location.pathname.split("/").pop() || "index.html";
  const DOC_ID = file.replace(".html", "");
  const group = GROUPS.find(([, docs]) => docs.some(([f]) => f === file)) || GROUPS[0];
  const md = document.getElementById("doc").textContent;

  const tabs = GROUPS.map(([name, docs]) => {
    const first = docs.find((d) => d[3]);
    return first
      ? `<a href="${first[0]}" class="${name === group[0] ? "active" : ""}">${name}</a>`
      : `<span class="soon" title="Coming soon">${name}</span>`;
  }).join("");
  const nav = GROUPS.map(([name, docs]) => `<p class="nav-group">${name}</p><ul>${docs.map(([href, label, icon, ready]) => ready
    ? `<li><a href="${href}" class="${href === file ? "active" : ""}"><span class="ic">${icon}</span>${label}</a></li>`
    : `<li><span class="soon"><span class="ic">${icon}</span>${label}<em>soon</em></span></li>`).join("")}</ul>`).join("");

  document.body.insertAdjacentHTML("afterbegin", `
    <header class="topbar">
      <div class="bar1">
        <button class="icon-btn menu" id="menu" title="Menu" aria-label="Open menu">☰</button>
        <a class="brand" href="index.html"><span class="logo">🎯</span><span>Interview Prep</span></a>
        <label class="search"><span>🔍</span><input type="search" placeholder="Search questions…" aria-label="Search questions on this page"><kbd>Ctrl K</kbd></label>
        <div class="actions">
          <button class="icon-btn" id="expand" title="Open or close all answers">⇕ All</button>
          <button class="icon-btn" id="theme" title="Switch light / dark">🌓</button>
          <a class="cta" href="index.html#now-full-stack-developer-kochi">Kochi plan ›</a>
        </div>
      </div>
      <nav class="tabs">${tabs}</nav>
    </header>
    <div class="layout"><aside class="sidebar">${nav}</aside><main class="content"><p>Loading…</p></main><aside class="onpage"></aside></div>`);

  const search = document.querySelector(".search input");
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.focus(); search.select(); }
  });
  document.getElementById("menu").onclick = () => document.body.classList.toggle("nav-open");
  document.addEventListener("click", (e) => {   // close the mobile menu on a link tap or a tap outside it
    if (!document.body.classList.contains("nav-open") || e.target.closest("#menu")) return;
    if (e.target.closest("a") || !e.target.closest(".sidebar")) document.body.classList.remove("nav-open");
  });
  document.getElementById("theme").onclick = () => {
    const next = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = next; store.set("ip:theme", next); renderMermaid();
  };
  document.getElementById("expand").onclick = () => {
    const cards = [...document.querySelectorAll("details.q:not(.hidden)")]; const open = !cards.every((c) => c.open); cards.forEach((c) => (c.open = open));
  };

  const content = document.querySelector(".content");
  try {
    await loadScript("https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js");
  } catch {
    content.innerHTML = "<h1>Can't load the page renderer</h1><p>These pages need an internet connection the first time they open (to load the Markdown and diagram libraries). Connect and refresh.</p>";
    return;
  }
  const practices = [];
  content.innerHTML = marked.parse(preprocess(md, practices));
  content.querySelectorAll("pre code.language-mermaid").forEach((c) => { const d = document.createElement("div"); d.className = "mermaid"; d.dataset.src = c.textContent; c.parentElement.replaceWith(d); });
  const h1 = content.querySelector("h1");
  if (h1) {
    h1.insertAdjacentHTML("beforebegin", `<p class="eyebrow">${group[0]}</p>`);
    if (h1.nextElementSibling?.tagName === "P") h1.nextElementSibling.classList.add("lead");
  }
  buildCards(content, DOC_ID);
  buildPractice(content, practices, DOC_ID);
  buildFilters(content, search);
  buildOnPage(document.querySelector(".onpage"), content);
  if (location.hash) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t?.tagName === "DETAILS") t.open = true; t?.scrollIntoView(); }
  renderMermaid();
}

let mermaidReady = null;
async function renderMermaid() {
  const nodes = [...document.querySelectorAll(".mermaid")];
  if (!nodes.length) return;
  try {
    mermaidReady ??= loadScript("https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js");
    await mermaidReady;
    mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "default", securityLevel: "strict", fontFamily: "Inter, Segoe UI, sans-serif" });
  } catch { nodes.forEach((n) => { n.innerHTML = `<pre>${esc(n.dataset.src)}</pre>`; }); return; }
  // Render one by one so a single faulty diagram can't stop the others.
  for (const [i, n] of nodes.entries()) {
    try {
      const { svg } = await mermaid.render(`mmd-${i}-${Date.now()}`, n.dataset.src);
      n.innerHTML = svg;
    } catch (err) {
      console.warn("Diagram failed:", err?.message || err);
      n.innerHTML = `<pre>${esc(n.dataset.src)}</pre>`;
    }
  }
}

main();
