const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('../prisma/generated/prisma');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

const verifyAuthToken = require('../middleware/auth-middleware');
const addUserToRequest = require('../middleware/addUserToRequest');

app.post('/api/payments/process', 
  verifyAuthToken, 
  addUserToRequest,
  [
    body("orderId").isString(),
    body("amount").isFloat({ gt: 0 }),
    body("method").isIn(["card", "bank_transfer", "paypal"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, amount, method } = req.body;
    const userId = req.user.id;

    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: userId }
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const mockTransactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payment = await prisma.payment.create({
        data: {
          orderId: orderId,
          amount: amount,
          method: method,
          status: "completed",
          transactionId: mockTransactionId,
          gatewayResponse: JSON.stringify({
            gateway: "mock_payment_gateway",
            status: "success"
          })
        }
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { 
          paymentStatus: "completed",
          transactionId: mockTransactionId,
          status: "processing"
        }
      });

      res.status(201).json({
        ...payment,
        gatewayResponse: JSON.parse(payment.gatewayResponse || '{}')
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

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
    expect(response.body.transactionId).toMatch(/^txn_/);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id }
    });
    expect(updatedOrder.paymentStatus).toBe('completed');
    expect(updatedOrder.status).toBe('processing');
  });

  test('should reject payment for non-existent order', async () => {
    const paymentData = {
      orderId: "non-existent-order",
      amount: 100,
      method: "card"
    };

    await request(app)
      .post('/api/payments/process')
      .set('Authorization', 'Bearer mock-token')
      .send(paymentData)
      .expect(404);
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
  });
});