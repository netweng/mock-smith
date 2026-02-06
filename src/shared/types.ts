export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type RuleType = 'rest' | 'graphql';

export type RuleAction = 'mock' | 'rewrite' | 'passthrough';

export interface RuleMatch {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
}

export interface GraphQLMatch {
  operationName?: string;
  query?: string;
  variables?: Record<string, any>;
}

export interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  body: any;
  delay?: number;
}

export interface Rule {
  id: string;
  enabled: boolean;
  name: string;
  description?: string;
  type: RuleType;
  match: RuleMatch;
  graphqlMatch?: GraphQLMatch;
  action: RuleAction;
  response: MockResponse;
  label?: string;
  createdAt: number;
  updatedAt: number;
}

export enum RoutePath {
  DASHBOARD = '/',
  LOGS = '/logs',
  EDIT = '/edit',
  EDIT_ID = '/edit/:id',
}

export interface TrafficLogEntry {
  id: string;
  url: string;
  method: string;
  ruleId: string;
  ruleName: string;
  action: RuleAction;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseStatus?: number;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
