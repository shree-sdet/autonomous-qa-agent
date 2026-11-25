
import { test, expect } from '@playwright/test';

test('GET API - Search for unavailable product', async ({ request }) => {

  const response = await request.get(
    'http://localhost:3000/rest/products/search?q=unknownproduct123'
  );

  expect(response.status()).toBe(200);

  const body = await response.json();

  expect(body.status).toBe('success');
  expect(body.data).toHaveLength(0);

});

test('GET API - Invalid endpoint', async ({ request }) => {

  const response = await request.get(
    'http://localhost:3000/api/invalid-endpoint'
  );

  expect(response.status()).toBe(404);
//test fails for invalid endpoint with 404 status code - its returns 500 instead - raise bug
});
