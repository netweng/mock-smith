import { Rule, TrafficLogEntry } from './types';

const KEYS = {
  RULES: 'mocksmith_rules',
} as const;

// Detect extension context
const isChromeExtension =
  typeof chrome !== 'undefined' && !!chrome?.storage?.local;

// --- In-memory fallback for dev mode (vite dev server) ---
let memRules: Rule[] = [];
const devListeners = new Set<() => void>();

function notifyDevListeners() {
  devListeners.forEach((fn) => fn());
}

// --- Public API ---

export const storage = {
  async getRules(): Promise<Rule[]> {
    if (isChromeExtension) {
      const data = await chrome.storage.local.get(KEYS.RULES);
      return data[KEYS.RULES] || [];
    }
    return memRules;
  },

  async saveRules(rules: Rule[]): Promise<void> {
    if (isChromeExtension) {
      await chrome.storage.local.set({ [KEYS.RULES]: rules });
    } else {
      memRules = rules;
      notifyDevListeners();
    }
  },

  async addRule(rule: Rule): Promise<void> {
    const rules = await this.getRules();
    rules.push(rule);
    await this.saveRules(rules);
  },

  async updateRule(id: string, updates: Partial<Rule>): Promise<void> {
    const rules = await this.getRules();
    const idx = rules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      rules[idx] = { ...rules[idx], ...updates, updatedAt: Date.now() };
      await this.saveRules(rules);
    }
  },

  async deleteRule(id: string): Promise<void> {
    const rules = await this.getRules();
    await this.saveRules(rules.filter((r) => r.id !== id));
  },

  async toggleRule(id: string): Promise<void> {
    const rules = await this.getRules();
    const idx = rules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      rules[idx] = {
        ...rules[idx],
        enabled: !rules[idx].enabled,
        updatedAt: Date.now(),
      };
      await this.saveRules(rules);
    }
  },

  async getLogs(): Promise<TrafficLogEntry[]> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
          resolve(response?.logs || []);
        });
      });
    }
    return [];
  },

  async clearLogs(): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, () => {
          resolve();
        });
      });
    }
  },

  /** Subscribe to storage changes. Returns an unsubscribe function. */
  onChanged(callback: () => void): () => void {
    if (isChromeExtension) {
      const listener = (changes: {
        [key: string]: chrome.storage.StorageChange;
      }) => {
        if (changes[KEYS.RULES]) {
          callback();
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    devListeners.add(callback);
    return () => {
      devListeners.delete(callback);
    };
  },
};
