
import { APIRequestContext } from '@playwright/test';

export class ProductApi {
  private request: APIRequestContext

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async searchProducts(searchTerm: string) {
    return await this.request.get('/rest/products/search', {
      params: {
        q: searchTerm
      }
    });
  }

  async getAllProducts() {
    return await this.request.get('/api/Products');
  }
}
