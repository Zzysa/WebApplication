const request = require('supertest');
const { createTestApp, prisma, setMockUser } = require('./setup');

const app = createTestApp();

describe('Orders Tests', () => {
  let testUser, adminUser;

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

    adminUser = await prisma.user.create({
      data: {
        firebaseUid: 'admin-uid-456',
        email: 'admin@test.com',
        role: 'admin'
      }
    });
  });

  test('should create new order', async () => {
    const orderData = {
      products: [
        {
          productId: "product-123",
          name: "Test Product",
          quantity: 2,
          price: 99.99
        }
      ],
      totalPrice: 199.98,
      paymentMethod: "card"
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer mock-token')
      .send(orderData)
      .expect(201);

    expect(response.body.totalPrice).toBe(199.98);
    expect(response.body.paymentMethod).toBe('card');
    expect(response.body.status).toBe('pending_payment');
    expect(Array.isArray(response.body.products)).toBe(true);
    expect(response.body.products[0].name).toBe('Test Product');
    expect(response.body.userId).toBe(testUser.id);
  });

  test('should get user orders', async () => {
    await prisma.order.create({
      data: {
        userId: testUser.id,
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 50 }]),
        totalPrice: 50,
        paymentMethod: "card"
      }
    });

    const response = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].totalPrice).toBe(50);
    expect(Array.isArray(response.body[0].products)).toBe(true);
    expect(response.body[0].userId).toBe(testUser.id);
  });

  test('should reject non-admin from updating order status', async () => {
    const order = await prisma.order.create({
      data: {
        userId: testUser.id,
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 50 }]),
        totalPrice: 50,
        paymentMethod: "card"
      }
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', 'Bearer mock-token')
      .send({ status: "processing" })
      .expect(403);

    expect(response.body.message).toBe('Admin access required');
  });

  test('should validate order data', async () => {
    const invalidOrderData = {
      products: [],
      totalPrice: -10,
      paymentMethod: "invalid"
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer mock-token')
      .send(invalidOrderData)
      .expect(400);

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test('should validate order status update', async () => {
    setMockUser('admin-uid-456', 'admin@test.com');

    const order = await prisma.order.create({
      data: {
        userId: testUser.id,
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 50 }]),
        totalPrice: 50,
        paymentMethod: "card"
      }
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', 'Bearer admin-token')
      .send({ status: "invalid_status" })
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });

  test('should return 403 for non-existent order', async () => {
    setMockUser('admin-uid-456', 'admin@test.com');

    await request(app)
      .patch('/api/orders/non-existent-id/status')
      .set('Authorization', 'Bearer admin-token')
      .send({ status: "processing" })
      .expect(403);
  });

  test('should require authentication for order operations', async () => {
    await request(app)
      .get('/api/orders')
      .expect(401);

    await request(app)
      .post('/api/orders')
      .send({ products: [], totalPrice: 100, paymentMethod: "card" })
      .expect(401);
  });
});