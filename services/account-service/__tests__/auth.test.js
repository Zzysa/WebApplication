const request = require('supertest');
const { createTestApp, prisma } = require('./setup');

const app = createTestApp();

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

  test('should get all users as admin', async () => {
    await prisma.user.create({
      data: {
        firebaseUid: 'test-uid-123',
        email: 'test@test.com',
        role: 'admin'
      }
    });

    await prisma.user.create({
      data: {
        firebaseUid: 'user2-uid',
        email: 'user2@test.com',
        role: 'client'
      }
    });

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body.some(user => user.email === 'test@test.com')).toBe(true);
    expect(response.body.some(user => user.email === 'user2@test.com')).toBe(true);
  });

  test('should reject non-admin from getting all users', async () => {
    await prisma.user.create({
      data: {
        firebaseUid: 'test-uid-123',
        email: 'test@test.com',
        role: 'client'
      }
    });

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer mock-token')
      .expect(403);

    expect(response.body.message).toBe('Admin access required');
  });

  test('should reject request without token', async () => {
    await request(app)
      .post('/api/auth/sync')
      .expect(401);

    await request(app)
      .get('/api/users/me')
      .expect(401);
  });

  test('should reject request with invalid token format', async () => {
    await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'InvalidToken')
      .expect(401);

    await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer')
      .expect(401);
  });
});