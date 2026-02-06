/**
 * Bridge content script (ISOLATED world).
 * Reads rules from chrome.storage and posts them to the MAIN world
 * interceptor via window.postMessage.
 */

function postRulesToPage() {
  chrome.storage.local.get(
    ['mocksmith_rules', 'mocksmith_enabled'],
    (data) => {
      window.postMessage(
        {
          source: 'mocksmith-bridge',
          type: 'MOCKSMITH_RULES',
          rules: data.mocksmith_rules || [],
          enabled: data.mocksmith_enabled !== false,
        },
        '*',
      );
    },
  );
}

// Send rules on page load
postRulesToPage();

// Re-send rules when storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.mocksmith_rules || changes.mocksmith_enabled) {
    postRulesToPage();
  }
});

// Forward interception logs from MAIN world to service worker
window.addEventListener('message', (event) => {
  if (
    event.data?.source === 'mocksmith-interceptor' &&
    event.data?.type === 'REQUEST_INTERCEPTED'
  ) {
    chrome.runtime.sendMessage({
      type: 'REQUEST_INTERCEPTED',
      data: event.data.data,
    });
  }
});
