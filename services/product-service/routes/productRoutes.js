const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
} = require("../controllers/productController.js");

router.get("/", getProducts);
router.get("/category/:categorySlug", getProductsByCategory);
router.get("/:id", getProductById);

router.post(
  "/",
  [
    body("name", "Name is required").not().isEmpty().trim(),
    body("description", "Description is required").not().isEmpty().trim(),
    body("price", "Price must be a positive number").isFloat({ gt: 0 }),
    body("imageUrl", "Image URL must be a valid URL").optional().isURL(),
    body("category", "Category must be a valid ObjectId").optional().isMongoId(),
    body("inStock", "InStock must be a boolean").optional().isBoolean(),
    body("tags", "Tags must be an array").optional().isArray(),
  ],
  createProduct
);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

module.exports = router;