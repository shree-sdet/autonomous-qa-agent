
import { Page, expect, Locator } from '@playwright/test';

export class BasketPage {
  readonly page: Page;
  readonly showCartButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.showCartButton = page.getByRole('button', {name: 'Show the shopping cart'});
  }

  async open() {
    await this.showCartButton.click();
  }

  async verifyQuantity(quantity: number) {
    await expect(this.page.getByRole('cell', {name: String(quantity),exact: true})).toBeVisible();
  }
}
