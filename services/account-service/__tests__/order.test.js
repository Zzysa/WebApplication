const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('../prisma/generated/prisma');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

const verifyAuthToken = require('../middleware/auth-middleware');
const addUserToRequest = require('../middleware/addUserToRequest');

app.post('/api/orders', 
  verifyAuthToken, 
  addUserToRequest,
  [
    body("products").isArray({ min: 1 }),
    body("totalPrice").isFloat({ gt: 0 }),
    body("paymentMethod").isIn(["card", "bank_transfer", "paypal"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { products, totalPrice, paymentMethod } = req.body;
    const userId = req.user.id;

    try {
      const order = await prisma.order.create({
        data: {
          userId: userId,
          products: JSON.stringify(products),
          totalPrice: totalPrice,
          paymentMethod: paymentMethod,
          status: "pending_payment",
        },
      });
      res.status(201).json({
        ...order,
        products: JSON.parse(order.products)
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

app.get('/api/orders', verifyAuthToken, addUserToRequest, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    const formattedOrders = orders.map(order => ({
      ...order,
      products: JSON.parse(order.products)
    }));
    res.status(200).json(formattedOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

describe('Orders Tests', () => {
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
  });
});