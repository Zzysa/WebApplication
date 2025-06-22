const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('../prisma/generated/prisma');

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

const verifyAuthToken = require('../middleware/auth-middleware');
const addUserToRequest = require('../middleware/addUserToRequest');

app.post('/api/auth/sync', verifyAuthToken, async (req, res) => {
  const { uid, email } = req.firebaseUser;
  
  try {
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { firebaseUid: uid, email: email, role: "client" }
      });
    }

    res.status(200).json({ message: "User synced successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/users/me', verifyAuthToken, addUserToRequest, (req, res) => {
  res.status(200).json(req.user);
});

describe('Authentication Tests', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  test('should sync Firebase user to database', async () => {
    const response = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body.message).toBe('User synced successfully');
    expect(response.body.user.email).toBe('test@test.com');
    expect(response.body.user.role).toBe('client');
  });

  test('should get user profile', async () => {
    await prisma.user.create({
      data: {
        firebaseUid: 'test-uid-123',
        email: 'test@test.com',
        role: 'client'
      }
    });

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body.email).toBe('test@test.com');
    expect(response.body.role).toBe('client');
  });

  test('should reject request without token', async () => {
    await request(app)
      .post('/api/auth/sync')
      .expect(401);
  });
});