
import { test as base } from '@playwright/test';
import { HomePage } from '../pages/homePage';
import { BasketPage } from '../pages/basketPage';
import { AuthApi } from '../api-clients/auth.api';
import { ProductApi } from '../api-clients/product.api';

type MyFixtures = {
  homePage: HomePage;
  basketPage: BasketPage;
  authApi: AuthApi;
  productApi: ProductApi;
};

export const test = base.extend<MyFixtures>({

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  basketPage: async ({ page }, use) => {
    await use(new BasketPage(page));
  },

  authApi: async ({ request }, use) => {
    await use(new AuthApi(request));
  },

  productApi: async ({ request }, use) => {
  await use(new ProductApi(request));
},

});

export { expect } from '@playwright/test';
