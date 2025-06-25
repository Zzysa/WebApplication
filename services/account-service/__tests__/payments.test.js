const request = require('supertest');
const { createTestApp, prisma } = require('./setup');

const app = createTestApp();

describe('Payments Tests', () => {
  let testUser, testOrder;

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

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 100 }]),
        totalPrice: 100,
        paymentMethod: "card",
        status: "pending_payment"
      }
    });
  });

  test('should process payment successfully', async () => {
    const paymentData = {
      orderId: testOrder.id,
      amount: 100,
      method: "card"
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(201);

    expect(response.body.status).toBe('completed');
    expect(response.body.amount).toBe(100);
    expect(response.body.method).toBe('card');
    expect(response.body.transactionId).toMatch(/^txn_/);
    expect(response.body.orderId).toBe(testOrder.id);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id }
    });
    expect(updatedOrder.paymentStatus).toBe('completed');
    expect(updatedOrder.status).toBe('processing');
    expect(updatedOrder.transactionId).toBeDefined();
  });

  test('should process payment with different methods', async () => {
    const methods = ['card', 'paypal', 'bank_transfer'];
    
    for (const method of methods) {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 50 }]),
          totalPrice: 50,
          paymentMethod: method,
          status: "pending_payment"
        }
      });

      const paymentData = {
        orderId: order.id,
        amount: 50,
        method: method
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', 'Bearer mock-token')
        .send(paymentData)
        .expect(201);

      expect(response.body.method).toBe(method);
      expect(response.body.status).toBe('completed');
    }
  });

  test('should reject payment for non-existent order', async () => {
    const paymentData = {
      orderId: "non-existent-order",
      amount: 100,
      method: "card"
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(404);

    expect(response.body.message).toBe('Order not found');
  });

  test('should reject payment for other users order', async () => {
    const otherUser = await prisma.user.create({
      data: {
        firebaseUid: 'other-user-uid',
        email: 'other@test.com',
        role: 'client'
      }
    });

    const otherUserOrder = await prisma.order.create({
      data: {
        userId: otherUser.id,
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 100 }]),
        totalPrice: 100,
        paymentMethod: "card",
        status: "pending_payment"
      }
    });

    const paymentData = {
      orderId: otherUserOrder.id,
      amount: 100,
      method: "card"
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(404);

    expect(response.body.message).toBe('Order not found');
  });

  test('should validate payment data', async () => {
    const invalidPaymentData = {
      orderId: "",
      amount: -10,
      method: "invalid"
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(invalidPaymentData)
      .expect(400);

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test('should validate payment method', async () => {
    const paymentData = {
      orderId: testOrder.id,
      amount: 100,
      method: "cryptocurrency"
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });

  test('should validate amount is positive', async () => {
    const paymentData = {
      orderId: testOrder.id,
      amount: 0,
      method: "card"
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });

  test('should require authentication for payment processing', async () => {
    const paymentData = {
      orderId: testOrder.id,
      amount: 100,
      method: "card"
    };

    await request(app)
      .post('/api/payments/process')
      .send(paymentData)
      .expect(401);
  });

  test('should create payment record in database', async () => {
    const paymentData = {
      orderId: testOrder.id,
      amount: 100,
      method: "card"
    };

    await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(201);

    const payment = await prisma.payment.findFirst({
      where: { orderId: testOrder.id }
    });

    expect(payment).toBeDefined();
    expect(payment.amount).toBe(100);
    expect(payment.method).toBe('card');
    expect(payment.status).toBe('completed');
    expect(payment.gatewayResponse).toBeDefined();
  });
});