const Product = require("../models/Product.js");
const Category = require("../models/Category.js");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, inStock, sortBy, sortOrder = 'asc' } = req.query;
    
    let filter = {};
    
    if (category) {
      const orConditions = [{ slug: category }];
      if (mongoose.Types.ObjectId.isValid(category)) {
        orConditions.push({ _id: category });
      }
      
      const categoryDoc = await Category.findOne({ $or: orConditions });
      if (categoryDoc) {
        filter.category = categoryDoc._id;
      } else {
        return res.status(200).json([]);
      }
    }
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ];
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (inStock !== undefined) {
      filter.inStock = inStock === 'true';
    }
    
    let sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }
    
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort);
      
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, price, imageUrl, category, inStock, tags } = req.body;

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid category" });
      }
    }

    const product = new Product({
      name,
      description,
      price,
      imageUrl,
      category: category || null,
      inStock: inStock !== undefined ? inStock : true,
      tags: tags || [],
    });

    const createdProduct = await product.save();
    await createdProduct.populate('category', 'name slug');
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateProduct = async (req, res, next) => {
  try {
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid category" });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');
    
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const category = await Category.findOne({ slug: categorySlug });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    const products = await Product.find({ category: category._id, inStock: true })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
      
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
};