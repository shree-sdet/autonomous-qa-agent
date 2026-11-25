
import { APIRequestContext, expect } from '@playwright/test';

export class AuthApi {
  private request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async register(email: string, password: string) {
    return await this.request.post('/api/Users/', {
      data: {
        email,
        password,
        passwordRepeat: password,
        securityQuestion: { id: 1 },
        securityAnswer: 'blue'
      }
    });
  }

  async login(email: string, password: string): Promise<string> {
    const response = await this.request.post('/rest/user/login', {
      data: { email, password }
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const token = body.authentication.token;

    expect(token).toBeTruthy();

    return token;
  }

  async getCurrentUser(token: string) {
    return await this.request.get('/rest/user/whoami', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
