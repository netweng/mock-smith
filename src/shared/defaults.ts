import { Rule } from './types';

export const DEFAULT_RULES: Rule[] = [
  {
    id: 'example-rest',
    enabled: false,
    name: 'Example: User Profile Mock',
    description:
      'Returns a mock user profile. Enable this rule to intercept GET requests matching /api/user/profile.',
    type: 'rest',
    match: {
      url: '*/api/user/profile*',
      method: 'GET',
    },
    action: 'mock',
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        id: 'user_001',
        name: 'Jane Developer',
        email: 'jane@example.com',
        role: 'admin',
      },
      delay: 200,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'example-graphql',
    enabled: false,
    name: 'Example: GraphQL Products Query',
    description:
      'Mocks a GraphQL GetProducts query. Enable this rule to return fake product data.',
    type: 'graphql',
    match: {
      url: '*/graphql*',
      method: 'POST',
    },
    graphqlMatch: {
      operationName: 'GetProducts',
    },
    action: 'mock',
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        data: {
          products: [
            { id: '1', name: 'Mock Product A', price: 29.99 },
            { id: '2', name: 'Mock Product B', price: 49.99 },
          ],
        },
      },
      delay: 150,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
