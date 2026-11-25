import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly searchButton: Locator;
  readonly searchBox: Locator;
  readonly closeWelcomeBannerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchButton = page.getByRole('button', { name: 'Open search' });
    this.searchBox = page.getByRole('textbox');
    this.closeWelcomeBannerButton = page.getByRole('button', { name: 'Close Welcome Banner' });
  }

  async navigate() {
    await this.page.goto('/');
  }

  async closeWelcomeBanner() {
    await this.closeWelcomeBannerButton.click();
  }

  async searchProduct(productName: string) {
    await this.searchButton.click();
    await this.searchBox.fill(productName);
    await this.searchBox.press('Enter');
  }

  getProduct(productName: string) {
    return this.page.getByRole('article').filter({
      has: this.page.getByText(productName, { exact: true }),
    });
  }

  async addProductToBasket(productName: string) {
    const product = this.getProduct(productName);
    await product.getByLabel('Add to Basket').click();
  }
}
