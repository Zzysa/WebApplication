const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const verifyAuthToken = require("../middleware/auth-middleware");
const addUserToRequest = require("../middleware/addUserToRequest");
const {
  createOrder,
  getUserOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

router.get("/", verifyAuthToken, addUserToRequest, getUserOrders);

router.post(
  "/",
  verifyAuthToken,
  addUserToRequest,
  [
    body("products")
      .isArray({ min: 1 })
      .withMessage("Products array cannot be empty"),
    body("totalPrice")
      .isFloat({ gt: 0 })
      .withMessage("Total price must be a positive number"),
    body("paymentMethod")
      .isIn(["card", "paypal", "bank_transfer"])
      .withMessage("Invalid payment method"),
  ],
  createOrder,
);

router.patch(
  "/:id/status",
  verifyAuthToken,
  addUserToRequest,
  [
    body("status")
      .isIn([
        "pending_payment",
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ])
      .withMessage("Invalid order status"),
  ],
  updateOrderStatus,
);

module.exports = router;