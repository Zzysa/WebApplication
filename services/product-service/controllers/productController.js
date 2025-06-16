const Product = require("../models/Product.js");
const { validationResult } = require("express-validator"); 

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, price, imageUrl } = req.body;

    const product = new Product({
      name,
      description,
      price,
      imageUrl,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateProduct = async (req, res, next) => {
	try {
		const updatedProduct = await Product.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true, runValidators: true },
		);
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

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};