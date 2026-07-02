async function ask_user_options(params) {
  const questions = Array.isArray(params && params.questions)
    ? params.questions.slice(0, 3)
    : [];

  if (!questions.length) {
    throw new Error(
      'ask_user_options requires a non-empty `questions` array. Each question needs `question` (string) and `options` (array of 2-4 strings).'
    );
  }

  // Normalize + validate
  const normalized = questions.map((q, i) => {
    const question = String((q && q.question) || '').trim();
    const options = (Array.isArray(q && q.options) ? q.options : [])
      .map((o) => String(o).trim())
      .filter(Boolean)
      .slice(0, 4);
    if (!question || options.length < 2) {
      throw new Error(
        'Question #' +
          (i + 1) +
          ' is invalid: it must have non-empty `question` text and at least 2 `options`.'
      );
    }
    const type = q && q.type === 'multi_select' ? 'multi_select' : 'single_select';
    return { question, options, type };
  });

  // Safely embed the data as JSON inside the HTML (guard against </script> breakout)
  const dataJSON = JSON.stringify(normalized)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    color-scheme: light dark;
    --bg: transparent;
    --text: #1a1a1a;
    --muted: #6b7280;
    --pill-bg: rgba(0, 0, 0, 0.035);
    --pill-border: rgba(0, 0, 0, 0.16);
    --pill-hover: rgba(59, 130, 246, 0.08);
    --accent: #2563eb;
    --accent-text: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --text: #e7e7e9;
      --muted: #9ca3af;
      --pill-bg: rgba(255, 255, 255, 0.05);
      --pill-border: rgba(255, 255, 255, 0.22);
      --pill-hover: rgba(96, 165, 250, 0.14);
      --accent: #3b82f6;
    }
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--text);
  }
  .wrap { padding: 6px 2px 10px; }
  .q { margin-bottom: 14px; }
  .q:last-of-type { margin-bottom: 6px; }
  .q-text {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px;
    line-height: 1.4;
  }
  .hint {
    font-weight: 400;
    font-size: 12px;
    color: var(--muted);
    margin-left: 6px;
  }
  .opts { display: flex; flex-wrap: wrap; gap: 8px; }
  button.opt {
    appearance: none;
    font: inherit;
    font-size: 13.5px;
    line-height: 1;
    padding: 9px 15px;
    border-radius: 999px;
    border: 1px solid var(--pill-border);
    background: var(--pill-bg);
    color: var(--text);
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.06s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  button.opt:hover:not(:disabled) {
    background: var(--pill-hover);
    border-color: var(--accent);
  }
  button.opt:active:not(:disabled) { transform: scale(0.97); }
  button.opt:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button.opt.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
  }
  button.opt:disabled { cursor: default; opacity: 0.55; }
  button.opt.selected:disabled { opacity: 1; }
  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    min-height: 34px;
  }
  button.send {
    appearance: none;
    font: inherit;
    font-size: 13.5px;
    font-weight: 600;
    padding: 9px 20px;
    border-radius: 999px;
    border: none;
    background: var(--accent);
    color: var(--accent-text);
    cursor: pointer;
    transition: opacity 0.12s ease, transform 0.06s ease;
  }
  button.send:disabled { opacity: 0.4; cursor: default; }
  button.send:active:not(:disabled) { transform: scale(0.97); }
  .status { font-size: 12.5px; color: var(--muted); }
  .status.done { color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
<div class="wrap" id="app"></div>
<script>
(function () {
  var QUESTIONS = ${dataJSON};
  var BRIDGE_SOURCE = 'tm-tappable-options';

  var app = document.getElementById('app');
  var selections = QUESTIONS.map(function () { return []; });
  var sent = false;
  var multiMode = QUESTIONS.length > 1 || QUESTIONS.some(function (q) { return q.type === 'multi_select'; });

  // ---- Render ----
  QUESTIONS.forEach(function (q, qi) {
    var qDiv = document.createElement('div');
    qDiv.className = 'q';

    var qText = document.createElement('p');
    qText.className = 'q-text';
    qText.textContent = q.question;
    if (q.type === 'multi_select') {
      var hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = '(select all that apply)';
      qText.appendChild(hint);
    }
    qDiv.appendChild(qText);

    var opts = document.createElement('div');
    opts.className = 'opts';
    q.options.forEach(function (label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.textContent = label;
      btn.addEventListener('click', function () { onTap(qi, label, btn, opts); });
      opts.appendChild(btn);
    });
    qDiv.appendChild(opts);
    app.appendChild(qDiv);
  });

  var footer = document.createElement('div');
  footer.className = 'footer';
  var sendBtn = null;
  if (multiMode) {
    sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'send';
    sendBtn.textContent = 'Send answers';
    sendBtn.disabled = true;
    sendBtn.addEventListener('click', submit);
    footer.appendChild(sendBtn);
  }
  var status = document.createElement('span');
  status.className = 'status';
  footer.appendChild(status);
  app.appendChild(footer);

  // ---- Interaction ----
  function onTap(qi, label, btn, optsEl) {
    if (sent) return;
    var q = QUESTIONS[qi];
    if (q.type === 'multi_select') {
      var idx = selections[qi].indexOf(label);
      if (idx === -1) { selections[qi].push(label); btn.classList.add('selected'); }
      else { selections[qi].splice(idx, 1); btn.classList.remove('selected'); }
    } else {
      selections[qi] = [label];
      var siblings = optsEl.querySelectorAll('button.opt');
      for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('selected');
      btn.classList.add('selected');
    }
    if (!multiMode) { submit(); return; }
    updateSendState();
  }

  function updateSendState() {
    var allAnswered = selections.every(function (s) { return s.length > 0; });
    if (sendBtn) sendBtn.disabled = !allAnswered || sent;
  }

  function buildReply() {
    if (QUESTIONS.length === 1) {
      return selections[0].join(', ');
    }
    return QUESTIONS.map(function (q, i) {
      return q.question + ' \\u2192 ' + selections[i].join(', ');
    }).join('\\n');
  }

  function submit() {
    if (sent) return;
    var allAnswered = selections.every(function (s) { return s.length > 0; });
    if (!allAnswered) return;
    sent = true;

    var text = buildReply();

    // Primary path: hand off to the companion extension in the parent window
    var delivered = false;
    try {
      window.parent.postMessage(
        { source: BRIDGE_SOURCE, type: 'send', text: text },
        '*'
      );
      delivered = true;
    } catch (e) { /* sandboxed edge case */ }

    // Lock the UI
    var allBtns = document.querySelectorAll('button.opt');
    for (var i = 0; i < allBtns.length; i++) allBtns[i].disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    if (delivered) {
      status.textContent = '\\u2713 Sent';
      status.className = 'status done';
      // Fallback safety net: if no extension is installed, nothing will happen
      // in the parent. We can't detect that from inside the sandbox, so also
      // put the reply on the clipboard as a courtesy.
      tryClipboard(text);
    } else {
      tryClipboard(text);
      status.textContent = 'Copied \\u2014 paste it into the chat box';
    }
  }

  function tryClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    } catch (e) { /* clipboard unavailable in sandbox */ }
  }
})();
</script>
</body>
</html>`;
}
