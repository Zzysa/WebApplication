const Product = require("../models/Product.js");

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
  try {
    const { name, description, price, imageUrl } = req.body;

    if (!name || !description || !price) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

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

module.exports = {
  getProducts,
  createProduct,
};
