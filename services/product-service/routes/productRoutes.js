const express = require("express");
const router = express.Router();
const { body } = require("express-validator"); 
const {
  getProducts,
  createProduct,
} = require("../controllers/productController.js");
const verifyAuthToken = require("../middleware/auth-middleware.js");

router.route("/").get(getProducts);

router.route("/").post(
  verifyAuthToken,
  [
    body("name", "Name is required").not().isEmpty().trim(),
    body("description", "Description is required").not().isEmpty().trim(),
    body("price", "Price must be a positive number").isFloat({ gt: 0 }),
    body("imageUrl", "Image URL must be a valid URL").optional().isURL(),
  ],
  createProduct,
);

module.exports = router;