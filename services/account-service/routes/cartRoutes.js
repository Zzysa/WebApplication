const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const verifyAuthToken = require("../middleware/auth-middleware");
const addUserToRequest = require("../middleware/addUserToRequest");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

router.get("/", verifyAuthToken, addUserToRequest, getCart);

router.post(
  "/add",
  verifyAuthToken,
  addUserToRequest,
  [
    body("productId").isString().notEmpty().withMessage("Product ID is required"),
    body("productName")
      .isString()
      .notEmpty()
      .withMessage("Product name is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be a positive number"),
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("imageUrl").optional().isURL().withMessage("Image URL must be valid"),
  ],
  addToCart,
);

router.delete("/clear", verifyAuthToken, addUserToRequest, clearCart);

router.put(
  "/:itemId",
  verifyAuthToken,
  addUserToRequest,
  [body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1")],
  updateCartItem,
);

router.delete("/:itemId", verifyAuthToken, addUserToRequest, removeFromCart);

module.exports = router;