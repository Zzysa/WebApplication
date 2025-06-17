const Product = require("../models/Product.js");
const Category = require("../models/Category.js");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const normalizeQueryParam = (param) => {
  if (Array.isArray(param)) {
    return param[param.length - 1];
  }
  return param;
};

const getProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    let filter = {};

    const categoryParam = normalizeQueryParam(category);
    if (categoryParam && typeof categoryParam === "string" && categoryParam.trim()) {
      const categoryValue = categoryParam.trim();
      const orConditions = [{ slug: categoryValue }];
      if (mongoose.Types.ObjectId.isValid(categoryValue)) {
        orConditions.push({ _id: categoryValue });
      }

      const categoryDoc = await Category.findOne({ $or: orConditions });
      if (categoryDoc) {
        filter.category = categoryDoc._id;
      } else {
        return res.status(200).json([]);
      }
    }

    const searchTerm = normalizeQueryParam(search);
    if (searchTerm && typeof searchTerm === "string" && searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm.trim(), "i");
      filter.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
      ];
    }

    const minPriceParam = normalizeQueryParam(minPrice);
    const maxPriceParam = normalizeQueryParam(maxPrice);

    if (minPriceParam || maxPriceParam) {
      filter.price = {};
      if (minPriceParam && !isNaN(parseFloat(minPriceParam))) {
        filter.price.$gte = parseFloat(minPriceParam);
      }
      if (maxPriceParam && !isNaN(parseFloat(maxPriceParam))) {
        filter.price.$lte = parseFloat(maxPriceParam);
      }
    }

    const inStockParam = normalizeQueryParam(inStock);
    if (inStockParam !== undefined) {
      filter.inStock = inStockParam === "true";
    }

    const sortByParam = normalizeQueryParam(sortBy) || "createdAt";
    const sortOrderParam = normalizeQueryParam(sortOrder) || "desc";

    let sort = {};
    const validSortFields = ["name", "price", "createdAt", "updatedAt"];
    if (validSortFields.includes(sortByParam)) {
      sort[sortByParam] = sortOrderParam === "desc" ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .lean();

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
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