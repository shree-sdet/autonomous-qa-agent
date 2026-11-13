
import { test, expect } from '../../fixtures/test.fixture';
import { ProductSearchSchema } from '../../schemas/product.schema';

test('GET API - Verify products are returned successfully', async ({ productApi }) => {
    // Record the start time of the API request
    const startTime = Date.now();

    // 1. Send GET request
    const response = await productApi.searchProducts('apple juice');

    // Record the end time of the API request
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    console.log(`API Response Time: ${responseTime} ms`);

    // 2. Validate HTTP status and response time
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(3000);

    // 3. Parse response body
    const body = await response.json();

    // 4. Validate response using Zod
    const validation = ProductSearchSchema.safeParse(body);

    expect(
        validation.success,
        JSON.stringify(validation.error?.issues, null, 2)
    ).toBe(true);

    // 5. Access validated response data
    const products = validation.data!.data;

    const appleJuice = products.find(
        product => product.name === 'Apple Juice (1000ml)'
    );


    // 7. Validate business details
    expect(appleJuice).toBeDefined();

    expect(appleJuice!.id).toBe(1);
    expect(appleJuice!.price).toBe(1.99);
    expect(appleJuice!.description).toBe('The all-time classic.');

});
