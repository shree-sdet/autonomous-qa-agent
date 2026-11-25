
import { test, expect } from '@playwright/test';

test('POST API - Register a new user', async ({ request }) => {

  const uniqueEmail = `qa_${Date.now()}@example.com`;

  const response = await request.post('http://localhost:3000/api/Users/',
    {
      data: {
        email: uniqueEmail,
        password: 'Test@12345',
        passwordRepeat: 'Test@12345',
        securityQuestion: { id: 1 },
        securityAnswer: 'blue'
      }
    }
  );

  // Validate HTTP status
  expect(response.status()).toBe(201);

  // Read response
  const responseBody = await response.json();

  console.log('Registration response:', responseBody);

});
