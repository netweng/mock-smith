import { DEFAULT_RULES } from '../shared/defaults';
import { TrafficLogEntry } from '../shared/types';

// --- Per-tab disabled state (session storage, survives SW restarts) ---

const DISABLED_TABS_KEY = 'mocksmith_disabled_tabs';

async function getDisabledTabs(): Promise<Set<number>> {
  const data = await chrome.storage.session.get(DISABLED_TABS_KEY);
  return new Set(data[DISABLED_TABS_KEY] || []);
}

async function setDisabledTabs(tabs: Set<number>): Promise<void> {
  await chrome.storage.session.set({ [DISABLED_TABS_KEY]: [...tabs] });
}

async function isTabEnabled(tabId: number): Promise<boolean> {
  const disabled = await getDisabledTabs();
  return !disabled.has(tabId);
}

async function setTabEnabled(tabId: number, enabled: boolean): Promise<void> {
  const disabled = await getDisabledTabs();
  if (enabled) {
    disabled.delete(tabId);
  } else {
    disabled.add(tabId);
  }
  await setDisabledTabs(disabled);
}

// --- Script injection ---

function isInjectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

async function injectContentScripts(tabId: number): Promise<void> {
  try {
    // Bridge (ISOLATED world, default)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['bridge.js'],
      injectImmediately: true,
    });
    // Interceptor (MAIN world)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['interceptor.js'],
      injectImmediately: true,
      world: 'MAIN' as any,
    });
  } catch (e) {
    console.warn(`[MockSmith] Failed to inject scripts into tab ${tabId}:`, e);
  }
}

// --- Badge management (per-tab only) ---

function updateTabBadge(tabId: number, enabled: boolean) {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF', tabId });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#3da9fc' : '#94a3b8',
    tabId,
  });
}

// Default badge (no tab context)
chrome.action.setBadgeText({ text: 'ON' });
chrome.action.setBadgeBackgroundColor({ color: '#3da9fc' });

// --- Tab navigation: inject scripts ---

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading') return;
  if (!isInjectableUrl(tab.url)) return;

  const tabEnabled = await isTabEnabled(tabId);

  if (tabEnabled) {
    await injectContentScripts(tabId);
  }

  updateTabBadge(tabId, tabEnabled);
});

// Clean up tab state when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const disabled = await getDisabledTabs();
  if (disabled.has(tabId)) {
    disabled.delete(tabId);
    await setDisabledTabs(disabled);
  }
});

// --- First install / update: seed defaults + inject existing tabs ---

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      mocksmith_rules: DEFAULT_RULES,
    });
  }

  // Inject scripts into all existing injectable tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && isInjectableUrl(tab.url)) {
      const tabEnabled = await isTabEnabled(tab.id);
      if (tabEnabled) {
        injectContentScripts(tab.id);
      }
      updateTabBadge(tab.id, tabEnabled);
    }
  }
});

// --- Traffic Logs ring buffer ---

const MAX_LOGS = 500;
let trafficLogs: TrafficLogEntry[] = [];
let logCounter = 0;

// --- Message handling ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    chrome.storage.local.get('mocksmith_rules').then((data) => {
      sendResponse({
        rules: data.mocksmith_rules || [],
      });
    });
    return true;
  }

  if (message.type === 'GET_TAB_ENABLED') {
    isTabEnabled(message.tabId).then((enabled) => {
      sendResponse({ enabled });
    });
    return true;
  }

  if (message.type === 'SET_TAB_ENABLED') {
    (async () => {
      const tabId: number = message.tabId;
      const enabled: boolean = message.enabled;
      await setTabEnabled(tabId, enabled);

      if (enabled) {
        // Inject scripts if needed (guard prevents duplicates)
        try {
          const tab = await chrome.tabs.get(tabId);
          if (isInjectableUrl(tab.url)) {
            await injectContentScripts(tabId);
          }
        } catch {}
        // Tell bridge to re-send rules
        try {
          await chrome.tabs.sendMessage(tabId, { type: 'MOCKSMITH_ENABLE' });
        } catch {}
      } else {
        // Tell bridge to disable interceptor
        try {
          await chrome.tabs.sendMessage(tabId, { type: 'MOCKSMITH_DISABLE' });
        } catch {}
      }

      updateTabBadge(tabId, enabled);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'OPEN_DASHBOARD') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'REQUEST_INTERCEPTED') {
    const entry: TrafficLogEntry = {
      id: `log-${++logCounter}`,
      url: message.data.url,
      method: message.data.method,
      ruleId: message.data.ruleId,
      ruleName: message.data.ruleName || '',
      action: message.data.action || 'mock',
      timestamp: message.data.timestamp || Date.now(),
      requestHeaders: message.data.requestHeaders,
      responseStatus: message.data.responseStatus,
      tabId: sender.tab?.id,
      requestType: message.data.requestType,
      operationName: message.data.operationName,
      responseBody: message.data.responseBody,
    };
    trafficLogs.push(entry);
    if (trafficLogs.length > MAX_LOGS) {
      trafficLogs = trafficLogs.slice(-MAX_LOGS);
    }
    // Broadcast to any listening UI (dashboard Traffic Logs page)
    chrome.runtime.sendMessage({ type: 'LOG_ADDED', entry }).catch(() => {});
    return false;
  }

  if (message.type === 'GET_LOGS') {
    sendResponse({ logs: [...trafficLogs].reverse() });
    return false;
  }

  if (message.type === 'CLEAR_LOGS') {
    trafficLogs = [];
    logCounter = 0;
    sendResponse({ ok: true });
    return false;
  }
});
