const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const verifyAuthToken = require("../middleware/auth-middleware");
const addUserToRequest = require("../middleware/addUserToRequest");
const { processPayment } = require("../controllers/paymentController");

router.post(
  "/process",
  verifyAuthToken,
  addUserToRequest,
  [
    body("orderId").isString().notEmpty().withMessage("Order ID is required"),
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("Amount must be a positive number"),
    body("method")
      .isIn(["card", "paypal", "bank_transfer"])
      .withMessage("Invalid payment method"),
  ],
  processPayment,
);

module.exports = router;