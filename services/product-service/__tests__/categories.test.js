const request = require('supertest');
const express = require('express');
const Category = require('../models/Category');

const app = express();
app.use(express.json());

const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

app.get('/api/categories', getCategories);
app.post('/api/categories', createCategory);
app.put('/api/categories/:id', updateCategory);
app.delete('/api/categories/:id', deleteCategory);

describe('Categories Tests', () => {
  test('should get all active categories', async () => {
    await Category.create({
      name: 'Electronics',
      description: 'Electronic devices',
      slug: 'electronics',
      isActive: true
    });

    await Category.create({
      name: 'Inactive Category',
      description: 'This is inactive',
      slug: 'inactive',
      isActive: false
    });

    const response = await request(app)
      .get('/api/categories')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Electronics');
  });

  test('should create new category', async () => {
    const categoryData = {
      name: 'Books',
      description: 'Books and literature'
    };

    const response = await request(app)
      .post('/api/categories')
      .send(categoryData)
      .expect(201);

    expect(response.body.name).toBe('Books');
    expect(response.body.slug).toBe('books');
    expect(response.body.isActive).toBe(true);
  });

  test('should not create duplicate category', async () => {
    await Category.create({
      name: 'Electronics',
      description: 'Electronic devices',
      slug: 'electronics'
    });

    const categoryData = {
      name: 'Electronics',
      description: 'Duplicate category'
    };

    const response = await request(app)
      .post('/api/categories')
      .send(categoryData)
      .expect(400);

    expect(response.body.message).toBe('Category already exists');
  });

  test('should update category', async () => {
    const category = await Category.create({
      name: 'Electronics',
      description: 'Electronic devices',
      slug: 'electronics'
    });

    const updateData = {
      name: 'Consumer Electronics',
      description: 'Consumer electronic devices'
    };

    const response = await request(app)
      .put(`/api/categories/${category._id}`)
      .send(updateData)
      .expect(200);

    expect(response.body.name).toBe('Consumer Electronics');
    expect(response.body.description).toBe('Consumer electronic devices');
  });

  test('should deactivate category', async () => {
    const category = await Category.create({
      name: 'Electronics',
      description: 'Electronic devices',
      slug: 'electronics'
    });

    await request(app)
      .delete(`/api/categories/${category._id}`)
      .expect(200);

    const updatedCategory = await Category.findById(category._id);
    expect(updatedCategory.isActive).toBe(false);
  });
});