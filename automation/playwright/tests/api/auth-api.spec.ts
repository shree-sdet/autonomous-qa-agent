
import { test, expect } from '../../fixtures/test.fixture';

// using authApi fixture instead of request
test('Verify API authentication using token', async ({ authApi }) => {
  const email = `qa_${Date.now()}@example.com`;
  const password = 'Test@12345';

  // Register
  const registerResponse = await authApi.register(email, password);
  expect(registerResponse.status()).toBe(201);

  // Login and get token
  const token = await authApi.login(email, password);

  // Access protected endpoint
  const response = await authApi.getCurrentUser(token);
  expect(response.status()).toBe(200);

  console.log('Authentication successful');
});

// This test verifies API authentication using direct request calls
// test('Verify API authentication using token', async ({ request }) => {

//   const email = `qa_${Date.now()}@example.com`;
//   const password = 'Test@12345';

//   // 1. Register user
//   await request.post('http://localhost:3000/api/Users/', {
//     data: {
//       email,
//       password,
//       passwordRepeat: password,
//       securityQuestion: { id: 1 },
//       securityAnswer: 'blue'
//     }
//   });

//   // 2. Login
//   const loginResponse = await request.post(
//     'http://localhost:3000/rest/user/login',
//     { data: { email, password } }
//   );

//   expect(loginResponse.status()).toBe(200);

//   // 3. Extract token
//   const loginBody = await loginResponse.json();
//   const token = loginBody.authentication.token;

//   expect(token).toBeTruthy();

//   // 4. Verify authenticated access
//   const response = await request.get(
//     'http://localhost:3000/rest/user/whoami',
//     {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     }
//   );

//   expect(response.status()).toBe(200);

//   console.log('Authentication successful');

// });



