const express = require("express");
const router = express.Router();
const {
  getProducts,
  createProduct,
} = require("../controllers/productController.js");

const verifyAuthToken = require("../middleware/auth-middleware.js");

router.route("/").get(getProducts);

router.route("/").post(verifyAuthToken, createProduct);

module.exports = router;