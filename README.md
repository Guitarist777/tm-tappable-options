# Tappable Questions for TypingMind

Mimics Claude.ai's interactive tappable questions feature in TypingMind. When the AI needs to understand your preferences before giving advice, it renders 1–3 questions as tappable option pills. Tapping an option sends it back to the AI as your reply.

This is a **two-part install**:

| Part | What it does | Where it runs |
|---|---|---|
| `plugin.json` + `implementation.js` (the **plugin**) | Gives the AI an `ask_user_options` function and renders the question/button widget in chat | Sandboxed iframe |
| `extension.js` (the **bridge extension**) | Catches your tap and sends it as your next chat message | Main TypingMind app |

The plugin works without the extension, but taps will only copy your answer to the clipboard instead of auto-sending. Install both for the full experience.

## Install

### 1. The plugin

**Option A — import from GitHub (recommended):**
1. Host this repo publicly on GitHub.
2. In TypingMind: **Plugins → Import Plugins → paste the repo URL**.

**Option B — manual:**
1. In TypingMind: **Plugins → Create Plugin → JSON Editor** (or fill the form manually).
2. Paste the contents of `plugin.json`. If using the form editor instead: set the OpenAI Spec from `openaiSpec`, paste `implementation.js` as the JavaScript code, and set **Output Options → Render plugin output as interactive HTML**.
3. Save.

### 2. The bridge extension

Extensions are loaded by URL, so `extension.js` needs to be hosted somewhere that serves JavaScript:

1. Push this repo to GitHub, then use jsDelivr for a proper `Content-Type`:
   `https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/extension.js`
2. In TypingMind: **Settings → Advanced Settings → Extensions → Add** the URL.
3. Reload TypingMind. You should see `[Tappable Questions Bridge] Extension loaded` in the browser console.

> ⚠️ Extensions have full access to your TypingMind data. Only install extension code you've read and trust — including this one.

### 3. Enable it in chat

Toggle **Tappable Questions** on in the Plugins menu for your chat (or enable it in the AI Agents you use). Then try: *"Help me plan a workout routine"* — the AI should respond with tappable options for your goals instead of prose questions.

## How it works

1. The AI calls `ask_user_options` with 1–3 questions (2–4 options each, `single_select` or `multi_select`).
2. The plugin returns HTML rendered via TypingMind's `render_html` output type.
3. Tapping an option calls `window.parent.postMessage({source: 'tm-tappable-options', type: 'send', text}, '*')` from the sandboxed iframe.
4. The extension, listening in the main window, writes the text into the chat input using React's native value setter and clicks send.
5. Your selection arrives as your next user message — the same conversational flow as Claude.ai.

Single question, single-select → tapping sends immediately. Multiple questions or multi-select → a **Send answers** button appears once everything is answered.

## Troubleshooting

- **Tap shows "✓ Sent" but nothing happens** — the extension isn't loaded. Check Settings → Extensions and the browser console for the load message. Your answer is on your clipboard as a fallback; paste and send.
- **Extension loads but can't find the input** — TypingMind changed its DOM. Open dev tools, inspect the chat textarea and send button, and update `INPUT_SELECTORS` / `SEND_SELECTORS` in `extension.js` (they currently target `data-element-id="chat-input-textbox"` and `data-element-id="send-button"`).
- **The AI never calls the plugin** — make sure the plugin is toggled on for the conversation, and phrase requests as open-ended advice ("help me choose/plan/find..."). You can also nudge it: "use tappable questions to ask me."
- **The AI answers its own questions instead of waiting** — some models are worse at stopping after a render-to-user tool call. Add a line to your system instruction: *"After calling ask_user_options, end your turn immediately and wait for the user's reply."*

## License

MIT
