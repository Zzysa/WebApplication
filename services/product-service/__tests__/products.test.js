const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

const app = express();
app.use(express.json());

const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

app.get('/api/products', getProducts);
app.get('/api/products/:id', getProductById);
app.post('/api/products', createProduct);
app.put('/api/products/:id', updateProduct);
app.delete('/api/products/:id', deleteProduct);

describe('Products Tests', () => {
  let testCategory;

  beforeEach(async () => {
    testCategory = await Category.create({
      name: 'Electronics',
      description: 'Electronic devices',
      slug: 'electronics'
    });
  });

  test('should get all products', async () => {
    await Product.create({
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      category: testCategory._id,
      inStock: true
    });

    const response = await request(app)
      .get('/api/products')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Test Product');
  });

  test('should create new product', async () => {
    const productData = {
      name: 'New Product',
      description: 'New Description',
      price: 149.99,
      category: testCategory._id.toString(),
      inStock: true,
      tags: ['electronics', 'new']
    };

    const response = await request(app)
      .post('/api/products')
      .send(productData)
      .expect(201);

    expect(response.body.name).toBe('New Product');
    expect(response.body.price).toBe(149.99);
    expect(response.body.category).toBeDefined();
  });

  test('should get product by ID', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test Description', 
      price: 99.99,
      category: testCategory._id
    });

    const response = await request(app)
      .get(`/api/products/${product._id}`)
      .expect(200);

    expect(response.body.name).toBe('Test Product');
    expect(response.body._id).toBe(product._id.toString());
  });

  test('should update product', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99
    });

    const updateData = {
      name: 'Updated Product',
      price: 129.99
    };

    const response = await request(app)
      .put(`/api/products/${product._id}`)
      .send(updateData)
      .expect(200);

    expect(response.body.name).toBe('Updated Product');
    expect(response.body.price).toBe(129.99);
  });

  test('should delete product', async () => {
    const product = await Product.create({
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99
    });

    await request(app)
      .delete(`/api/products/${product._id}`)
      .expect(200);

    const deletedProduct = await Product.findById(product._id);
    expect(deletedProduct).toBeNull();
  });

  test('should filter products by category', async () => {
    await Product.create({
      name: 'Electronic Product',
      description: 'Test Description',
      price: 99.99,
      category: testCategory._id
    });

    await Product.create({
      name: 'Other Product',
      description: 'Test Description',
      price: 49.99
    });

    const response = await request(app)
      .get('/api/products')
      .query({ category: testCategory._id.toString() })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Electronic Product');
  });

  test('should search products by name', async () => {
    await Product.create({
      name: 'Smartphone Pro',
      description: 'Latest smartphone',
      price: 999.99
    });

    await Product.create({
      name: 'Laptop Gaming',
      description: 'Gaming laptop',
      price: 1599.99
    });

    const response = await request(app)
      .get('/api/products')
      .query({ search: 'smartphone' })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Smartphone Pro');
  });

  test('should filter products by price range', async () => {
    await Product.create({
      name: 'Cheap Product',
      description: 'Test Description',
      price: 50
    });

    await Product.create({
      name: 'Expensive Product',
      description: 'Test Description',
      price: 500
    });

    const response = await request(app)
      .get('/api/products')
      .query({ minPrice: 100, maxPrice: 600 })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Expensive Product');
  });
});