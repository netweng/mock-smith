import { Rule, RuleAction } from '../types';

let counter = 0;

export function makeRule(overrides: Partial<Rule> = {}): Rule {
  counter++;
  return {
    id: `test-rule-${counter}`,
    enabled: true,
    name: `Test Rule ${counter}`,
    type: 'rest',
    match: { url: '*/api/*' },
    action: 'mock' as RuleAction,
    response: {
      status: 200,
      body: { ok: true },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function makeGraphQLRule(overrides: Partial<Rule> = {}): Rule {
  return makeRule({
    type: 'graphql',
    match: { url: '*/graphql' },
    graphqlMatch: { operationName: 'GetUser' },
    ...overrides,
  });
}
