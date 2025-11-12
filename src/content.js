import { encode } from "gpt-tokenizer";

/* ---------- UI OVERLAY ---------- */
const overlay = document.createElement("div");
overlay.id = "token-overlay";
Object.assign(overlay.style, {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  background: "rgba(32,33,35,0.95)",
  color: "#ECECF1",
  fontFamily: "Inter, sans-serif",
  fontSize: "13px",
  borderRadius: "8px",
  padding: "10px 14px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  zIndex: "99999",
  lineHeight: "1.5",
  backdropFilter: "blur(4px)",
  minWidth: "200px",
  cursor: "move",
  userSelect: "none"
});
overlay.innerHTML = `
  <div id="token-overlay-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
    <span style="font-weight:600;">Token Tracker</span>
    <button id="toggle-overlay" style="background:none;border:none;color:#ECECF1;font-weight:600;font-size:14px;cursor:pointer;">−</button>
  </div>
  <div id="token-overlay-body">
    <div><strong>Model:</strong> <span id="modelName">Detecting…</span></div>
    <div><strong>Committed Input Tokens:</strong> <span id="committedInput">0</span></div>
    <div><strong>Current Input Tokens:</strong> <span id="currentInput">0</span></div>
    <div><strong>Input (sum):</strong> <span id="inputSum">0</span></div>
    <div style="margin-top:6px;"><strong>Output Tokens:</strong> <span id="outputTokens">0</span></div>
  </div>
`;
document.body.appendChild(overlay);

/* ---------- ELEMENTS ---------- */
const headerEl = overlay.querySelector("#token-overlay-header");
const bodyEl = overlay.querySelector("#token-overlay-body");
const toggleBtn = overlay.querySelector("#toggle-overlay");

const modelEl = overlay.querySelector("#modelName");
const committedInputEl = overlay.querySelector("#committedInput");
const currentInputEl = overlay.querySelector("#currentInput");
const inputSumEl = overlay.querySelector("#inputSum");
const outputTokensEl = overlay.querySelector("#outputTokens");

/* ---------- COLLAPSIBLE ---------- */
let collapsed = false;
toggleBtn.addEventListener("click", () => {
  collapsed = !collapsed;
  bodyEl.style.display = collapsed ? "none" : "block";
  toggleBtn.textContent = collapsed ? "+" : "−";
});

/* ---------- DRAGGABLE ---------- */
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

headerEl.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - overlay.getBoundingClientRect().left;
  offsetY = e.clientY - overlay.getBoundingClientRect().top;
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  overlay.style.left = e.clientX - offsetX + "px";
  overlay.style.top = e.clientY - offsetY + "px";
  overlay.style.bottom = "auto";
  overlay.style.right = "auto";
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  document.body.style.userSelect = "auto";
});

/* ---------- UTIL: Detect model ---------- */
function detectModel() {
  const el = document.querySelector("div[class*='model-selector'] span");
  if (!el) return "gpt-4o";
  const text = el.innerText.toLowerCase();
  if (text.includes("4o mini")) return "gpt-4o-mini";
  if (text.includes("4o")) return "gpt-4o";
  if (text.includes("3.5")) return "gpt-3.5-turbo";
  if (text.includes("4")) return "gpt-4-turbo";
  return "gpt-4o";
}

/* ---------- INPUT / OUTPUT ---------- */
function getPromptText() {
  const editor = document.querySelector('#prompt-textarea, div[contenteditable="true"].ProseMirror');
  if (editor) return editor.innerText.trim();
  const ta = document.querySelector('textarea');
  return ta ? ta.value.trim() : "";
}

function currentInputTokensCount() {
  const txt = getPromptText();
  return txt ? encode(txt).length : 0;
}

function outputTokensCount() {
  const messages = Array.from(document.querySelectorAll("div.markdown.prose"));
  if (!messages.length) return 0;
  let combined = "";
  for (const m of messages) combined += (m.innerText || "") + "\n";
  return combined ? encode(combined).length : 0;
}

/* ---------- TRACKING STATE ---------- */
let committedInputTokens = 0;

/* ---------- COMMIT ON SEND ---------- */
function attachSendDetectors(editorEl) {
  if (!editorEl || editorEl.dataset._sendDetectorAttached) return;
  editorEl.dataset._sendDetectorAttached = "1";

  editorEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const ct = currentInputTokensCount();
      if (ct > 0) committedInputTokens += ct;
      requestAnimationFrame(update);
    }
  });

  const sendBtn = document.querySelector('button[aria-label="Send"], button[type="submit"], button[data-testid="send-button"]');
  if (sendBtn && !sendBtn.dataset._sendClickAttached) {
    sendBtn.dataset._sendClickAttached = "1";
    sendBtn.addEventListener("click", () => {
      const ct = currentInputTokensCount();
      if (ct > 0) committedInputTokens += ct;
      requestAnimationFrame(update);
    });
  }
}

/* ---------- SAFE UPDATE ---------- */
let rafPending = false;
function update() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;

    const model = detectModel();
    modelEl.textContent = model;

    const currentTokens = currentInputTokensCount();
    const outTokens = outputTokensCount();

    committedInputEl.textContent = committedInputTokens;
    currentInputEl.textContent = currentTokens;
    inputSumEl.textContent = committedInputTokens + currentTokens;
    outputTokensEl.textContent = outTokens;
  });
}

/* ---------- OBSERVERS ---------- */
function safeAttachAll() {
  const editor = document.querySelector('#prompt-textarea, div[contenteditable="true"].ProseMirror');
  attachSendDetectors(editor);
  requestAnimationFrame(update);
}

const bodyObserver = new MutationObserver(() => {
  safeAttachAll();
  update();
});
bodyObserver.observe(document.body, { childList: true, subtree: true });

const chatMain = document.querySelector("main");
if (chatMain) {
  const chatObserver = new MutationObserver(() => update());
  chatObserver.observe(chatMain, { childList: true, subtree: true });
}

setInterval(update, 1200);
safeAttachAll();
update();
