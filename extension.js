/**
 * Tappable Questions Bridge — TypingMind Extension
 * ------------------------------------------------
 * Companion to the "Tappable Questions" plugin (ask_user_options).
 *
 * The plugin renders option buttons inside a sandboxed iframe. When you tap
 * an option, the iframe posts a message to the main TypingMind window. This
 * extension listens for that message, types the selected answer into the chat
 * input, and sends it — so your tap becomes your reply, exactly like
 * Claude.ai's tappable questions feature.
 *
 * Install: TypingMind → Settings (Preferences) → Advanced Settings →
 * Extensions → paste the URL of this file.
 *
 * NOTE: This targets TypingMind's current DOM (data-element-id attributes).
 * If a TypingMind redesign breaks it, update the selector lists below.
 */
(function () {
  'use strict';

  var BRIDGE_SOURCE = 'tm-tappable-options';

  // Selector candidates for the chat input, most-specific first.
  var INPUT_SELECTORS = [
    '[data-element-id="chat-input-textbox"]',
    'textarea[data-element-id="chat-input-textbox"]',
    'main textarea',
    'textarea'
  ];

  // Selector candidates for the send button.
  var SEND_SELECTORS = [
    '[data-element-id="send-button"]',
    'button[data-element-id="send-button"]',
    'button[type="submit"]'
  ];

  function findVisible(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        var el = nodes[j];
        if (el && el.offsetParent !== null) return el;
      }
    }
    return null;
  }

  function setNativeValue(el, value) {
    // React tracks input values internally; we must call the native setter
    // and dispatch an 'input' event so React registers the change.
    var proto =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setContentEditable(el, value) {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
  }

  function pressEnter(el) {
    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
      el.dispatchEvent(
        new KeyboardEvent(type, {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        })
      );
    });
  }

  function sendChatMessage(text) {
    var input = findVisible(INPUT_SELECTORS);
    var editable = null;
    if (!input) {
      editable = findVisible(['div[contenteditable="true"]']);
    }
    if (!input && !editable) {
      console.warn(
        '[Tappable Questions Bridge] Could not find the chat input. ' +
          'TypingMind may have changed its DOM — update INPUT_SELECTORS in the extension.'
      );
      return;
    }

    if (input) {
      input.focus();
      setNativeValue(input, text);
    } else {
      setContentEditable(editable, text);
    }

    // Give React a tick to register the value, then send.
    setTimeout(function () {
      var sendBtn = findVisible(SEND_SELECTORS);
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        pressEnter(input || editable);
      }
    }, 80);
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== BRIDGE_SOURCE || data.type !== 'send') return;
    if (typeof data.text !== 'string' || !data.text.trim()) return;
    // Basic sanity cap so a malformed payload can't dump huge text into chat.
    var text = data.text.slice(0, 4000);
    sendChatMessage(text);
  });

  console.log('[Tappable Questions Bridge] Extension loaded and listening.');
})();
