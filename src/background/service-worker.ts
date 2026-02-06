import { DEFAULT_RULES } from '../shared/defaults';
import { TrafficLogEntry } from '../shared/types';

// --- Badge management ---

function updateBadge(enabled: boolean) {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#3da9fc' : '#94a3b8',
  });
}

// Initialize badge on startup
chrome.storage.local.get('mocksmith_enabled', (data) => {
  updateBadge(data.mocksmith_enabled !== false);
});

// Update badge when enabled state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.mocksmith_enabled) {
    updateBadge(changes.mocksmith_enabled.newValue);
  }
});

// --- First install ---

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      mocksmith_enabled: true,
      mocksmith_rules: DEFAULT_RULES,
    });
    updateBadge(true);
  }
});

// --- Traffic Logs ring buffer ---

const MAX_LOGS = 500;
let trafficLogs: TrafficLogEntry[] = [];
let logCounter = 0;

// --- Message handling ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    Promise.all([
      chrome.storage.local.get('mocksmith_rules'),
      chrome.storage.local.get('mocksmith_enabled'),
    ]).then(([rulesData, enabledData]) => {
      sendResponse({
        rules: rulesData.mocksmith_rules || [],
        enabled: enabledData.mocksmith_enabled !== false,
      });
    });
    return true; // keep channel open for async response
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
    };
    trafficLogs.push(entry);
    if (trafficLogs.length > MAX_LOGS) {
      trafficLogs = trafficLogs.slice(-MAX_LOGS);
    }
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
