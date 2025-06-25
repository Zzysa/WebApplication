const request = require('supertest');
const { createTestApp, prisma } = require('./setup');

const app = createTestApp();

describe('Cart Tests', () => {
  let testUser;

  beforeEach(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    
    testUser = await prisma.user.create({
      data: {
        firebaseUid: 'test-uid-123',
        email: 'test@test.com',
        role: 'client'
      }
    });
  });

  test('should get empty cart for new user', async () => {
    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  test('should add new item to cart', async () => {
    const cartItem = {
      productId: "product-123",
      productName: "Test Product",
      price: 99.99,
      quantity: 2,
      imageUrl: "https://example.com/image.jpg"
    };

    const response = await request(app)
      .post('/api/cart/add')
      .set('Authorization', 'Bearer mock-token')
      .send(cartItem)
      .expect(201);

    expect(response.body.productName).toBe('Test Product');
    expect(response.body.price).toBe(99.99);
    expect(response.body.quantity).toBe(2);
    expect(response.body.userId).toBe(testUser.id);
  });

  test('should increase quantity when adding existing item', async () => {
    await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-123",
        productName: "Test Product",
        price: 99.99,
        quantity: 1
      }
    });

    const cartItem = {
      productId: "product-123",
      productName: "Test Product",
      price: 99.99,
      quantity: 2
    };

    const response = await request(app)
      .post('/api/cart/add')
      .set('Authorization', 'Bearer mock-token')
      .send(cartItem)
      .expect(200);

    expect(response.body.quantity).toBe(3);
  });

  test('should get cart items for user', async () => {
    await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-1",
        productName: "Product 1",
        price: 50,
        quantity: 1
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-2", 
        productName: "Product 2",
        price: 75,
        quantity: 2
      }
    });

    const response = await request(app)
      .get('/api/cart')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body).toHaveLength(2);
    const productNames = response.body.map(item => item.productName).sort();
    expect(productNames).toEqual(['Product 1', 'Product 2']);
  });

  test('should update cart item quantity', async () => {
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-123",
        productName: "Test Product", 
        price: 99.99,
        quantity: 1
      }
    });

    const response = await request(app)
      .put(`/api/cart/${cartItem.id}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ quantity: 5 })
      .expect(200);

    expect(response.body.quantity).toBe(5);
  });

  test('should remove item from cart', async () => {
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-123",
        productName: "Test Product",
        price: 99.99,
        quantity: 1
      }
    });

    await request(app)
      .delete(`/api/cart/${cartItem.id}`)
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    const remainingItems = await prisma.cartItem.findMany({
      where: { userId: testUser.id }
    });
    expect(remainingItems).toHaveLength(0);
  });

  test('should clear entire cart', async () => {
    await prisma.cartItem.createMany({
      data: [
        {
          userId: testUser.id,
          productId: "product-1",
          productName: "Product 1",
          price: 50,
          quantity: 1
        },
        {
          userId: testUser.id,
          productId: "product-2",
          productName: "Product 2", 
          price: 75,
          quantity: 2
        }
      ]
    });

    const response = await request(app)
      .delete('/api/cart/clear')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body.message).toBe("Cart cleared successfully");

    const remainingItems = await prisma.cartItem.findMany({
      where: { userId: testUser.id }
    });
    expect(remainingItems).toHaveLength(0);
  });

  test('should validate cart item data', async () => {
    const invalidCartItem = {
      productId: "",
      productName: "",
      price: -10,
      quantity: 0
    };

    const response = await request(app)
      .post('/api/cart/add')
      .set('Authorization', 'Bearer mock-token')
      .send(invalidCartItem)
      .expect(400);

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test('should validate quantity when updating', async () => {
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-123",
        productName: "Test Product",
        price: 99.99,
        quantity: 1
      }
    });

    const response = await request(app)
      .put(`/api/cart/${cartItem.id}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ quantity: 0 })
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });

  test('should return 404 when updating non-existent cart item', async () => {
    await request(app)
      .put('/api/cart/non-existent-id')
      .set('Authorization', 'Bearer mock-token')
      .send({ quantity: 5 })
      .expect(404);
  });

  test('should return 404 when deleting non-existent cart item', async () => {
    await request(app)
      .delete('/api/cart/non-existent-id')
      .set('Authorization', 'Bearer mock-token')
      .expect(404);
  });

  test('should prevent access to other users cart items', async () => {
    const otherUser = await prisma.user.create({
      data: {
        firebaseUid: 'other-user-uid',
        email: 'other@test.com',
        role: 'client'
      }
    });

    const otherUserCartItem = await prisma.cartItem.create({
      data: {
        userId: otherUser.id,
        productId: "product-123",
        productName: "Test Product",
        price: 99.99,
        quantity: 1
      }
    });

    await request(app)
      .put(`/api/cart/${otherUserCartItem.id}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ quantity: 5 })
      .expect(404);

    await request(app)
      .delete(`/api/cart/${otherUserCartItem.id}`)
      .set('Authorization', 'Bearer mock-token')
      .expect(404);
  });

  test('should require authentication for all cart operations', async () => {
    await request(app)
      .get('/api/cart')
      .expect(401);

    await request(app)
      .post('/api/cart/add')
      .send({ productId: "test", productName: "test", price: 10 })
      .expect(401);

    await request(app)
      .put('/api/cart/test-id')
      .send({ quantity: 1 })
      .expect(401);

    await request(app)
      .delete('/api/cart/test-id')
      .expect(401);

    await request(app)
      .delete('/api/cart/clear')
      .expect(401);
  });
});