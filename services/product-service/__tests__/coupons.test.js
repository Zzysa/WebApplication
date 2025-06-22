const request = require('supertest');
const express = require('express');
const Coupon = require('../models/Coupon');

const app = express();
app.use(express.json());

const { getActiveCoupons, applyCoupon } = require('../controllers/couponController');

app.get('/api/coupons', getActiveCoupons);
app.post('/api/coupons/apply', applyCoupon);

describe('Coupons Tests', () => {
  test('should get active coupons', async () => {
    const validCoupon = await Coupon.create({
      code: 'ACTIVE10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 50,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31')
    });

    await Coupon.create({
      code: 'EXPIRED',
      discountType: 'fixed',
      discountValue: 20,
      isActive: true,
      validFrom: new Date('2023-01-01'),
      validUntil: new Date('2023-12-31')
    });

    const response = await request(app)
      .get('/api/coupons')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].code).toBe('ACTIVE10');
  });

  test('should apply percentage coupon successfully', async () => {
    await Coupon.create({
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 50,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31'),
      usedCount: 0
    });

    const couponData = {
      code: 'SAVE10',
      total: 100
    };

    const response = await request(app)
      .post('/api/coupons/apply')
      .send(couponData)
      .expect(200);

    expect(response.body.discount).toBe(10);
    expect(response.body.totalAfterDiscount).toBe(90);
  });

  test('should apply fixed coupon successfully', async () => {
    await Coupon.create({
      code: 'FIXED20',
      discountType: 'fixed',
      discountValue: 20,
      minOrderAmount: 100,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31')
    });

    const couponData = {
      code: 'FIXED20',
      total: 150
    };

    const response = await request(app)
      .post('/api/coupons/apply')
      .send(couponData)
      .expect(200);

    expect(response.body.discount).toBe(20);
    expect(response.body.totalAfterDiscount).toBe(130);
  });

  test('should reject invalid coupon', async () => {
    const couponData = {
      code: 'INVALID',
      total: 100
    };

    const response = await request(app)
      .post('/api/coupons/apply')
      .send(couponData)
      .expect(404);

    expect(response.body.message).toBe('Invalid or expired coupon');
  });

  test('should reject coupon when minimum order not met', async () => {
    await Coupon.create({
      code: 'MIN100',
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 100,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31')
    });

    const couponData = {
      code: 'MIN100',
      total: 50
    };

    const response = await request(app)
      .post('/api/coupons/apply')
      .send(couponData)
      .expect(400);

    expect(response.body.message).toBe('Minimum order amount not met');
  });

  test('should respect maximum discount limit', async () => {
    await Coupon.create({
      code: 'MAXDEAL',
      discountType: 'percentage',
      discountValue: 50,
      minOrderAmount: 100,
      maxDiscount: 25,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2025-12-31')
    });

    const couponData = {
      code: 'MAXDEAL',
      total: 100
    };

    const response = await request(app)
      .post('/api/coupons/apply')
      .send(couponData)
      .expect(200);

    expect(response.body.discount).toBe(25);
    expect(response.body.totalAfterDiscount).toBe(75);
  });
});
