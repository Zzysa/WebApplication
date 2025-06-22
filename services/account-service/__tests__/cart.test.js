const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('../prisma/generated/prisma');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

const verifyAuthToken = require('../middleware/auth-middleware');
const addUserToRequest = require('../middleware/addUserToRequest');

app.get('/api/cart', verifyAuthToken, addUserToRequest, async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(cartItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/cart/add', 
  verifyAuthToken, 
  addUserToRequest,
  [
    body("productId").isString().withMessage("Product ID is required"),
    body("productName").isString().withMessage("Product name is required"),
    body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, productName, price, quantity = 1, imageUrl } = req.body;
    const userId = req.user.id;

    try {
      const existingItem = await prisma.cartItem.findUnique({
        where: { 
          userId_productId: { 
            userId: userId, 
            productId: productId 
          } 
        }
      });

      if (existingItem) {
        const updatedItem = await prisma.cartItem.update({
          where: { 
            userId_productId: { 
              userId: userId, 
              productId: productId 
            } 
          },
          data: { 
            quantity: existingItem.quantity + quantity,
            price: price,
            productName: productName,
            imageUrl: imageUrl
          }
        });
        res.status(200).json(updatedItem);
      } else {
        const newItem = await prisma.cartItem.create({
          data: {
            userId: userId,
            productId: productId,
            productName: productName,
            price: price,
            quantity: quantity,
            imageUrl: imageUrl
          }
        });
        res.status(201).json(newItem);
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

app.put('/api/cart/:itemId', 
  verifyAuthToken, 
  addUserToRequest,
  [
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    try {
      const updatedItem = await prisma.cartItem.update({
        where: { 
          id: itemId,
          userId: userId
        },
        data: { quantity: quantity }
      });
      res.status(200).json(updatedItem);
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.status(500).json({ message: error.message });
    }
  }
);

app.delete('/api/cart/clear', verifyAuthToken, addUserToRequest, async (req, res) => {
  const userId = req.user.id;

  try {
    await prisma.cartItem.deleteMany({
      where: { userId: userId }
    });
    res.status(200).json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/cart/:itemId', verifyAuthToken, addUserToRequest, async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  try {
    await prisma.cartItem.delete({
      where: { 
        id: itemId,
        userId: userId
      }
    });
    res.status(200).json({ message: "Item removed from cart" });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "Cart item not found" });
    }
    res.status(500).json({ message: error.message });
  }
});

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
    // Создаем товары с небольшой задержкой чтобы гарантировать разное время создания
    const item1 = await prisma.cartItem.create({
      data: {
        userId: testUser.id,
        productId: "product-1",
        productName: "Product 1",
        price: 50,
        quantity: 1
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const item2 = await prisma.cartItem.create({
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

    expect(response.body.message).toBe("Cart cleared");

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