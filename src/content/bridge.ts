/**
 * Bridge content script (ISOLATED world).
 * Reads rules from chrome.storage and posts them to the MAIN world
 * interceptor via window.postMessage.
 */

// Guard against duplicate injection
if (!(window as any).__MOCKSMITH_BRIDGE_INSTALLED__) {
  (window as any).__MOCKSMITH_BRIDGE_INSTALLED__ = true;

  function postRulesToPage() {
    chrome.storage.local.get('mocksmith_rules', (data) => {
      window.postMessage(
        {
          source: 'mocksmith-bridge',
          type: 'MOCKSMITH_RULES',
          rules: data.mocksmith_rules || [],
          enabled: true,
        },
        '*',
      );
    });
  }

  // Send rules on page load
  postRulesToPage();

  // Re-send rules when storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.mocksmith_rules) {
      postRulesToPage();
    }
  });

  // Listen for per-tab state changes from service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'MOCKSMITH_DISABLE') {
      window.postMessage(
        {
          source: 'mocksmith-bridge',
          type: 'MOCKSMITH_RULES',
          rules: [],
          enabled: false,
        },
        '*',
      );
    }
    if (message.type === 'MOCKSMITH_ENABLE') {
      postRulesToPage();
    }
  });

  // Forward interception logs from MAIN world to service worker,
  // and handle the INTERCEPTOR_READY handshake.
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'mocksmith-interceptor') {
      if (event.data.type === 'REQUEST_INTERCEPTED') {
        chrome.runtime.sendMessage({
          type: 'REQUEST_INTERCEPTED',
          data: event.data.data,
        });
      }
      // Re-send rules when interceptor signals it is ready.
      // This eliminates the race where postRulesToPage() fires
      // before the interceptor's message listener is set up.
      if (event.data.type === 'INTERCEPTOR_READY') {
        postRulesToPage();
      }
    }
  });
}
