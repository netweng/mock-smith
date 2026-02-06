import { describe, it, expect } from 'vitest';
import { matchUrl, matchHeaders, matchGraphQL, matchRule, normalizeGraphQLQuery } from '../rule-engine';
import { makeRule, makeGraphQLRule } from './helpers';

describe('matchUrl', () => {
  it('matches exact URL', () => {
    expect(matchUrl('https://api.example.com/users', 'https://api.example.com/users')).toBe(true);
  });

  it('matches wildcard at end', () => {
    expect(matchUrl('https://api.example.com/users/123', '*/users/*')).toBe(true);
  });

  it('matches wildcard at start', () => {
    expect(matchUrl('https://api.example.com/graphql', '*/graphql')).toBe(true);
  });

  it('matches multiple wildcards', () => {
    expect(matchUrl('https://api.example.com/v1/users/123/posts', '*/v1/*/123/*')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchUrl('https://API.Example.com/Users', '*/users')).toBe(true);
  });

  it('does not match when pattern differs', () => {
    expect(matchUrl('https://api.example.com/posts', '*/users/*')).toBe(false);
  });

  it('handles pattern with dots', () => {
    expect(matchUrl('https://api.example.com/v1', 'https://api.example.com/v1')).toBe(true);
  });
});

describe('matchHeaders', () => {
  it('matches when all rule headers are present', () => {
    expect(matchHeaders(
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer abc' },
      { 'Content-Type': 'application/json' },
    )).toBe(true);
  });

  it('fails when a required header is missing', () => {
    expect(matchHeaders(
      { 'Content-Type': 'application/json' },
      { 'Authorization': 'Bearer abc' },
    )).toBe(false);
  });

  it('header name comparison is case-insensitive', () => {
    expect(matchHeaders(
      { 'content-type': 'application/json' },
      { 'Content-Type': 'application/json' },
    )).toBe(true);
  });

  it('header value comparison is exact', () => {
    expect(matchHeaders(
      { 'Content-Type': 'text/html' },
      { 'Content-Type': 'application/json' },
    )).toBe(false);
  });

  it('matches when rule headers is a subset of request headers', () => {
    expect(matchHeaders(
      { 'Content-Type': 'application/json', 'X-Custom': 'yes', 'Authorization': 'Bearer x' },
      { 'Content-Type': 'application/json', 'X-Custom': 'yes' },
    )).toBe(true);
  });
});

describe('normalizeGraphQLQuery', () => {
  it('collapses whitespace', () => {
    expect(normalizeGraphQLQuery('query  GetUser  {\n  user  {\n    id\n  }\n}'))
      .toBe('query GetUser{user{id}}');
  });

  it('removes single-line comments', () => {
    expect(normalizeGraphQLQuery('query GetUser { # fetch user\n  user { id } }'))
      .toBe('query GetUser{user{id}}');
  });

  it('normalizes spacing around punctuation', () => {
    expect(normalizeGraphQLQuery('query GetUser ( $id : ID! ) { user ( id : $id ) { name } }'))
      .toBe('query GetUser($id:ID!){user(id:$id){name}}');
  });

  it('handles already-compact queries', () => {
    expect(normalizeGraphQLQuery('query{user{id}}'))
      .toBe('query{user{id}}');
  });

  it('handles fragments', () => {
    expect(normalizeGraphQLQuery(`
      fragment UserFields on User {
        id
        name
      }
      query GetUser {
        user {
          ...UserFields
        }
      }
    `)).toBe('fragment UserFields on User{id name}query GetUser{user{...UserFields}}');
  });
});

describe('matchGraphQL', () => {
  it('matches operationName', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', query: 'query GetUser { user { id } }' },
      { operationName: 'GetUser' },
    )).toBe(true);
  });

  it('does not match wrong operationName', () => {
    expect(matchGraphQL(
      { operationName: 'GetPosts', query: 'query GetPosts { posts { id } }' },
      { operationName: 'GetUser' },
    )).toBe(false);
  });

  it('matches query substring', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', query: 'query GetUser { user { id name } }' },
      { query: 'user { id' },
    )).toBe(true);
  });

  it('matches query with different formatting (normalized)', () => {
    expect(matchGraphQL(
      { query: 'query GetUser {\n  user {\n    id\n    name\n  }\n}' },
      { query: 'user { id name }' },
    )).toBe(true);
  });

  it('matches compact rule against pretty-printed request', () => {
    expect(matchGraphQL(
      { query: 'mutation CreateUser ( $input : CreateUserInput! ) {\n  createUser( input: $input ) {\n    id\n  }\n}' },
      { query: 'createUser(input:$input){id}' },
    )).toBe(true);
  });

  it('does not false-positive match similar but different queries', () => {
    expect(matchGraphQL(
      { query: 'query GetUser { user { id } }' },
      { query: 'user { name }' },
    )).toBe(false);
  });

  it('parses string body as JSON', () => {
    expect(matchGraphQL(
      JSON.stringify({ operationName: 'GetUser' }),
      { operationName: 'GetUser' },
    )).toBe(true);
  });

  it('returns false for invalid JSON string', () => {
    expect(matchGraphQL('not json', { operationName: 'GetUser' })).toBe(false);
  });

  it('returns false for null/undefined body', () => {
    expect(matchGraphQL(null, { operationName: 'GetUser' })).toBe(false);
    expect(matchGraphQL(undefined, { operationName: 'GetUser' })).toBe(false);
  });

  it('matches batch query array - any entry matches', () => {
    const batch = [
      { operationName: 'GetPosts', query: 'query GetPosts { posts { id } }' },
      { operationName: 'GetUser', query: 'query GetUser { user { id } }' },
    ];
    expect(matchGraphQL(batch, { operationName: 'GetUser' })).toBe(true);
  });

  it('fails batch query array when no entry matches', () => {
    const batch = [
      { operationName: 'GetPosts', query: 'query GetPosts { posts { id } }' },
      { operationName: 'GetComments', query: 'query GetComments { comments { id } }' },
    ];
    expect(matchGraphQL(batch, { operationName: 'GetUser' })).toBe(false);
  });

  it('handles batch query as JSON string', () => {
    const batch = JSON.stringify([
      { operationName: 'GetPosts' },
      { operationName: 'GetUser' },
    ]);
    expect(matchGraphQL(batch, { operationName: 'GetUser' })).toBe(true);
  });

  it('matches variables - exact key/value', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', variables: { userId: '123' } },
      { operationName: 'GetUser', variables: { userId: '123' } },
    )).toBe(true);
  });

  it('matches variables - subset (rule vars are subset of request vars)', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', variables: { userId: '123', includeAvatar: true } },
      { operationName: 'GetUser', variables: { userId: '123' } },
    )).toBe(true);
  });

  it('fails variables when key missing from request', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', variables: { userId: '123' } },
      { operationName: 'GetUser', variables: { userId: '123', role: 'admin' } },
    )).toBe(false);
  });

  it('fails variables when value differs', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', variables: { userId: '456' } },
      { operationName: 'GetUser', variables: { userId: '123' } },
    )).toBe(false);
  });

  it('fails variables when request has no variables', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser' },
      { operationName: 'GetUser', variables: { userId: '123' } },
    )).toBe(false);
  });

  it('matches variables with nested objects', () => {
    expect(matchGraphQL(
      { operationName: 'Search', variables: { filter: { status: 'active', page: 1 } } },
      { variables: { filter: { status: 'active', page: 1 } } },
    )).toBe(true);
  });

  it('fails variables with different nested objects', () => {
    expect(matchGraphQL(
      { operationName: 'Search', variables: { filter: { status: 'inactive' } } },
      { variables: { filter: { status: 'active' } } },
    )).toBe(false);
  });

  it('skips variables check when rule has no variables', () => {
    expect(matchGraphQL(
      { operationName: 'GetUser', variables: { anything: 'here' } },
      { operationName: 'GetUser' },
    )).toBe(true);
  });

  it('matches variables in batch query', () => {
    const batch = [
      { operationName: 'GetPosts', variables: { limit: 10 } },
      { operationName: 'GetUser', variables: { userId: '123' } },
    ];
    expect(matchGraphQL(batch, { operationName: 'GetUser', variables: { userId: '123' } })).toBe(true);
  });
});

describe('matchRule', () => {
  it('matches a REST rule', () => {
    const rules = [makeRule({ match: { url: '*/api/users', method: 'GET' } })];
    const result = matchRule(rules, 'https://example.com/api/users', 'GET');
    expect(result).not.toBeNull();
    expect(result?.id).toBe(rules[0].id);
  });

  it('matches a GraphQL rule', () => {
    const rules = [makeGraphQLRule()];
    const body = { operationName: 'GetUser', query: 'query GetUser { user { id } }' };
    const result = matchRule(rules, 'https://example.com/graphql', 'POST', body);
    expect(result).not.toBeNull();
  });

  it('skips disabled rules', () => {
    const rules = [makeRule({ enabled: false, match: { url: '*/api/*' } })];
    const result = matchRule(rules, 'https://example.com/api/users', 'GET');
    expect(result).toBeNull();
  });

  it('matches rules with headers', () => {
    const rules = [makeRule({
      match: { url: '*/api/*', headers: { 'Authorization': 'Bearer token123' } },
    })];
    const result = matchRule(
      rules,
      'https://example.com/api/users',
      'GET',
      undefined,
      { 'Authorization': 'Bearer token123' },
    );
    expect(result).not.toBeNull();
  });

  it('skips rules when headers do not match', () => {
    const rules = [makeRule({
      match: { url: '*/api/*', headers: { 'Authorization': 'Bearer token123' } },
    })];
    const result = matchRule(
      rules,
      'https://example.com/api/users',
      'GET',
      undefined,
      { 'Authorization': 'Bearer wrong' },
    );
    expect(result).toBeNull();
  });

  it('returns rules of all action types (mock, rewrite, passthrough)', () => {
    const mockRule = makeRule({ action: 'mock', match: { url: '*/mock/*' } });
    const rewriteRule = makeRule({ action: 'rewrite', match: { url: '*/rewrite/*' } });
    const passthroughRule = makeRule({ action: 'passthrough', match: { url: '*/pass/*' } });

    expect(matchRule([mockRule], 'https://example.com/mock/1', 'GET')?.action).toBe('mock');
    expect(matchRule([rewriteRule], 'https://example.com/rewrite/1', 'GET')?.action).toBe('rewrite');
    expect(matchRule([passthroughRule], 'https://example.com/pass/1', 'GET')?.action).toBe('passthrough');
  });

  it('returns first matching rule (priority)', () => {
    const rules = [
      makeRule({ name: 'First', match: { url: '*/api/*' } }),
      makeRule({ name: 'Second', match: { url: '*/api/*' } }),
    ];
    const result = matchRule(rules, 'https://example.com/api/users', 'GET');
    expect(result?.name).toBe('First');
  });

  it('skips method mismatch', () => {
    const rules = [makeRule({ match: { url: '*/api/*', method: 'POST' } })];
    const result = matchRule(rules, 'https://example.com/api/users', 'GET');
    expect(result).toBeNull();
  });

  it('matches GraphQL rule with variables', () => {
    const rules = [makeGraphQLRule({
      graphqlMatch: { operationName: 'GetUser', variables: { userId: '123' } },
    })];
    const body = { operationName: 'GetUser', variables: { userId: '123', extra: true } };
    const result = matchRule(rules, 'https://example.com/graphql', 'POST', body);
    expect(result).not.toBeNull();
  });

  it('matches GraphQL rule with body from GET params (pre-extracted)', () => {
    // Simulates what the interceptor does: extracting GraphQL params from URL as a body object
    const rules = [makeGraphQLRule({
      match: { url: '*/graphql*', method: 'GET' },
      graphqlMatch: { operationName: 'GetUser' },
    })];
    const pseudoBody = { operationName: 'GetUser', query: 'query GetUser { user { id } }' };
    const result = matchRule(rules, 'https://example.com/graphql?query=...', 'GET', pseudoBody);
    expect(result).not.toBeNull();
  });
});
