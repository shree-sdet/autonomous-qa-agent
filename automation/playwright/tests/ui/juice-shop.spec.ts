import { test } from '../../fixtures/test.fixture';

test('Verify user can search and add product to basket', async ({ page,homePage, basketPage }) => {

  // const homePage = new HomePage(page);
  // const basketPage = new BasketPage(page);

  await homePage.navigate();
  await homePage.closeWelcomeBanner();
  await homePage.searchProduct('apple juice');
  await homePage.addProductToBasket('Apple Juice (1000ml)');
  await basketPage.open();
  await basketPage.verifyQuantity(1);

});
