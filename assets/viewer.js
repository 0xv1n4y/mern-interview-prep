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
  ["★ Most-asked (simple)", [
    ["m1-javascript.html", "JavaScript", "🟨", true], ["m2-react.html", "React", "⚛️", true],
    ["m3-node-express.html", "Node & Express", "🟩", true], ["m4-mongodb.html", "MongoDB", "🍃", true],
    ["m5-sql-postgresql.html", "SQL & PostgreSQL", "🐘", true], ["m6-git-docker-gcp.html", "Git, Docker & GCP", "🐳", true]]],
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
    let text = h3.innerHTML, diff = null, star = false;
    const s = text.match(/\s*\{star\}\s*$/);
    if (s) { star = true; text = text.replace(s[0], ""); }
    const m = text.match(/\s*\{(basic|mid|adv)\}\s*$/);
    if (m) { diff = m[1]; text = text.replace(m[0], ""); }
    const id = slug(text);
    const card = document.createElement("details");
    card.className = "q" + (star ? " star" : ""); card.id = id; card.dataset.diff = diff || "";
    const key = `ip:${docId}:${id}`;
    const tag = diff ? `<span class="tag ${level[diff][0]}">${level[diff][1]}</span>` : "";
    const starTag = star ? `<span class="tag must">★ Must-ask</span>` : "";
    card.innerHTML = `<summary><span class="title">${text}</span>${starTag}${tag}<label class="done-box"><input type="checkbox"> Done</label></summary><div class="body"></div>`;
    const body = card.querySelector(".body");
    let n = h3.nextSibling;
    while (n && !(n.nodeType === 1 && /^H[123]$/.test(n.tagName))) { const next = n.nextSibling; body.appendChild(n); n = next; }
    h3.replaceWith(card);
    if (AI_PAGES.test(docId)) buildAiPanel(card, body, text, docId, id);
    const box = card.querySelector(".done-box input");
    box.checked = store.get(key) === "1";
    card.classList.toggle("is-done", box.checked);
    card.querySelector(".done-box").addEventListener("click", (e) => e.stopPropagation());
    box.addEventListener("change", () => { store.set(key, box.checked ? "1" : "0"); card.classList.toggle("is-done", box.checked); updateProgress(); });
  });
}

// --- 2b. AI practice (Gemini through our own backend at /api/ai) ---
// Every question card gets: answer by typing or mic (English / Telugu) → AI feedback, and "Ask a doubt".
const AI_PAGES = /.*/;                       // question pages that get the AI panel
const AI = {
  base() { return (store.get("ip:aiBase") || "").replace(/\/$/, ""); },   // "" = same site
  pass() { return store.get("ip:aiPass") || ""; },
};
let purifyReady = null;
async function safeHtml(markdown) {
  purifyReady ??= loadScript("https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js");
  await purifyReady;
  return DOMPurify.sanitize(marked.parse(markdown));
}

async function callAi(payload) {
  if (!AI.pass()) { openAiSettings("Enter your passcode first."); throw new Error("Passcode needed: open 🤖 AI settings."); }
  let res;
  try {
    res = await fetch(AI.base() + "/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-passcode": AI.pass() },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Can't reach the AI server. Check your internet, or the server address in 🤖 AI settings.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `AI server error (${res.status})`);
  return data.text;
}

let activeMic = null;   // only one microphone session at a time
function startMic(btn, langSel, ta, status) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { status.textContent = "🎙 Voice input works in Chrome or Edge. In this browser, please type your answer."; return; }
  if (activeMic) { activeMic.stop(); return; }
  const rec = new Rec();
  rec.lang = langSel.value; rec.continuous = true; rec.interimResults = true;
  const before = ta.value ? ta.value.replace(/\s*$/, " ") : "";
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t + " "; else interim += t;
    }
    ta.value = before + finalText;
    status.textContent = interim ? "🎙 …" + interim : "🎙 Listening… click Stop when you finish.";
  };
  rec.onerror = (e) => { status.textContent = e.error === "not-allowed" ? "🎙 Microphone blocked. Allow mic access in the browser address bar." : "🎙 Mic error: " + e.error; };
  rec.onend = () => { activeMic = null; btn.classList.remove("rec"); btn.textContent = "🎙 Speak"; if (status.textContent.startsWith("🎙 Listening") || status.textContent.startsWith("🎙 …")) status.textContent = "Done. Edit the text if needed, then press Send."; };
  rec.start(); activeMic = rec;
  btn.classList.add("rec"); btn.textContent = "⏹ Stop";
  status.textContent = "🎙 Listening… click Stop when you finish.";
}

function buildAiPanel(card, body, titleHtml, docId, qid) {
  const question = titleHtml.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").trim();
  const histKey = `ip:ai:${docId}:${qid}`;
  const wrap = document.createElement("div");
  wrap.className = "ai";
  wrap.innerHTML = `
    <button class="ai-open" type="button">🤖 Practice with AI <span>answer by typing or speaking, or ask a doubt</span></button>
    <div class="ai-panel hidden">
      <div class="ai-tabs" role="tablist">
        <button type="button" class="on" data-m="evaluate">🎤 Answer like an interview</button>
        <button type="button" data-m="doubt">❓ Ask a doubt</button>
      </div>
      <label class="ai-hide"><input type="checkbox" checked> Hide the answer below while I practise</label>
      <textarea rows="5" placeholder="Type your answer here, or press 🎙 Speak and answer out loud (English or Telugu)…"></textarea>
      <div class="ai-row">
        <button type="button" class="btn ghost mic">🎙 Speak</button>
        <select class="mic-lang" aria-label="Speaking language"><option value="en-IN">English</option><option value="te-IN">తెలుగు (Telugu)</option></select>
        <span class="grow"></span>
        <button type="button" class="btn ghost clear">Clear</button>
        <button type="button" class="btn run send">Send ➤</button>
      </div>
      <p class="ai-status" aria-live="polite"></p>
      <div class="ai-out"></div>
      <details class="ai-history hidden"><summary>Previous attempts</summary><div></div></details>
    </div>`;
  body.prepend(wrap);
  const $ = (s) => wrap.querySelector(s);
  const panel = $(".ai-panel"), ta = $("textarea"), status = $(".ai-status"), out = $(".ai-out"), hide = $(".ai-hide input");
  let mode = "evaluate";
  const chat = [];   // doubt conversation for this question

  const setHidden = () => card.classList.toggle("quiz", mode === "evaluate" && !panel.classList.contains("hidden") && hide.checked);
  $(".ai-open").onclick = () => { panel.classList.toggle("hidden"); setHidden(); if (!panel.classList.contains("hidden")) ta.focus(); };
  hide.onchange = setHidden;
  wrap.querySelectorAll(".ai-tabs button").forEach((b) => b.onclick = () => {
    wrap.querySelectorAll(".ai-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    mode = b.dataset.m;
    $(".ai-hide").classList.toggle("hidden", mode !== "evaluate");
    ta.placeholder = mode === "evaluate"
      ? "Type your answer here, or press 🎙 Speak and answer out loud (English or Telugu)…"
      : "What is your doubt about this question? (English or Telugu)";
    out.innerHTML = ""; status.textContent = ""; setHidden();
    if (mode === "doubt") renderChat();
  });
  $(".mic").onclick = () => startMic($(".mic"), $(".mic-lang"), ta, status);
  $(".clear").onclick = () => { ta.value = ""; out.innerHTML = ""; status.textContent = ""; if (mode === "doubt") { chat.length = 0; } };

  const reference = () => [...body.children].filter((el) => el !== wrap).map((el) => el.textContent).join("\n").replace(/\n{3,}/g, "\n\n").slice(0, 7000);

  async function renderChat() {
    const parts = await Promise.all(chat.map(async (m) => m.role === "user"
      ? `<div class="msg me">${esc(m.text)}</div>` : `<div class="msg ai-msg">${await safeHtml(m.text)}</div>`));
    out.innerHTML = parts.join("");
  }

  function showHistory() {
    let list = []; try { list = JSON.parse(store.get(histKey) || "[]"); } catch {}
    const h = $(".ai-history");
    h.classList.toggle("hidden", !list.length);
    h.querySelector("summary").textContent = `Previous attempts (${list.length})`;
    h.querySelector("div").innerHTML = list.map((a) => `<div class="attempt"><small>${esc(a.when)}${a.score ? " · " + esc(a.score) : ""}</small><p>${esc(a.answer)}</p></div>`).join("");
  }
  showHistory();

  $(".send").onclick = async () => {
    const text = ta.value.trim();
    if (!text) { status.textContent = mode === "evaluate" ? "Type or speak your answer first." : "Type your doubt first."; return; }
    if (activeMic) activeMic.stop();
    const btn = $(".send"); btn.disabled = true;
    status.textContent = mode === "evaluate" ? "🤖 Checking your answer…" : "🤖 Thinking…";
    try {
      if (mode === "evaluate") {
        const reply = await callAi({ mode: "evaluate", question, reference: reference(), text, page: document.title });
        out.innerHTML = await safeHtml(reply);
        status.textContent = "Here's your feedback. Try again to improve your score!";
        const score = (reply.match(/(\d{1,2})\s*\/\s*10/) || [])[0] || "";
        let list = []; try { list = JSON.parse(store.get(histKey) || "[]"); } catch {}
        list.unshift({ when: new Date().toLocaleString(), score, answer: text.slice(0, 600) });
        store.set(histKey, JSON.stringify(list.slice(0, 5)));
        showHistory();
      } else {
        chat.push({ role: "user", text });
        ta.value = "";
        await renderChat();
        const reply = await callAi({ mode: "doubt", question, reference: reference(), text, history: chat.slice(-7, -1), page: document.title });
        chat.push({ role: "model", text: reply });
        await renderChat();
        status.textContent = "Ask a follow-up question if anything is still unclear.";
      }
    } catch (err) {
      if (mode === "doubt") chat.pop();
      status.textContent = "⚠ " + err.message;
    } finally { btn.disabled = false; }
  };
}

function openAiSettings(message = "") {
  let dlg = document.getElementById("ai-settings");
  if (!dlg) {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="ai-settings" class="ai-dialog">
        <form method="dialog">
          <h3>🤖 AI practice settings</h3>
          <p class="note-msg"></p>
          <label>Passcode<input name="pass" type="password" autocomplete="current-password" placeholder="The passcode you set on the server"></label>
          <label>Server address <small>(leave empty when the site and the AI server are on the same website)</small><input name="base" type="url" placeholder="https://your-site.vercel.app"></label>
          <p class="test-msg" aria-live="polite"></p>
          <div class="ai-row"><button type="button" class="btn ghost test">Test connection</button><span class="grow"></span><button value="cancel" class="btn ghost">Close</button><button value="save" class="btn run">Save</button></div>
          <small class="fine">Saved only in this browser. Your Gemini API key stays on the server and is never sent to this page.</small>
        </form>
      </dialog>`);
    dlg = document.getElementById("ai-settings");
    const f = dlg.querySelector("form");
    dlg.addEventListener("close", () => {
      if (dlg.returnValue === "save") { store.set("ip:aiPass", f.pass.value.trim()); store.set("ip:aiBase", f.base.value.trim()); }
    });
    dlg.querySelector(".test").onclick = async () => {
      const msg = dlg.querySelector(".test-msg");
      msg.textContent = "Testing…";
      try {
        const res = await fetch(f.base.value.trim().replace(/\/$/, "") + "/api/ai", { method: "POST", headers: { "Content-Type": "application/json", "x-app-passcode": f.pass.value.trim() }, body: JSON.stringify({ mode: "ping" }) });
        const data = await res.json().catch(() => ({}));
        msg.textContent = res.ok ? "✅ Connected. " + (data.text || "") : "❌ " + (data.error || res.status);
      } catch { msg.textContent = "❌ Can't reach the server at that address."; }
    };
  }
  const f = dlg.querySelector("form");
  f.pass.value = AI.pass(); f.base.value = AI.base();
  dlg.querySelector(".note-msg").textContent = message;
  dlg.querySelector(".test-msg").textContent = "";
  dlg.showModal();
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
  const hasStars = !!content.querySelector("details.q.star");
  bar.innerHTML = `<button class="chip on" data-f="all">All</button>${hasStars ? '<button class="chip must" data-f="star">★ Must-ask only</button>' : ""}<button class="chip" data-f="basic">🟢 Basic</button><button class="chip" data-f="mid">🟡 Intermediate</button><button class="chip" data-f="adv">🔴 Advanced</button><button class="chip" data-f="todo">Not done</button>`;
  anchor.after(bar);
  let filter = "all";
  const apply = () => {
    const q = search.value.trim().toLowerCase();
    content.querySelectorAll("details.q").forEach((c) => {
      const okText = !q || c.textContent.toLowerCase().includes(q);
      const okFilter = filter === "all"
        || (filter === "todo" ? !c.classList.contains("is-done")
          : filter === "star" ? c.classList.contains("star") : c.dataset.diff === filter);
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
  document.documentElement.dataset.theme = store.get("ip:theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
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
          <button class="icon-btn" id="ai-btn" title="AI practice settings">🤖 AI</button>
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
  document.getElementById("ai-btn").onclick = () => openAiSettings();
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
