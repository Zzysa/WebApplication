const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/adminCouponController.js");

router.get("/", getAllCoupons);

router.post(
  "/",
  [
    body("code", "Code is required").notEmpty().trim(),
    body("discountType", "Invalid discount type").isIn(["percentage", "fixed"]),
    body("discountValue", "Discount value must be a positive number").isFloat({
      gt: 0,
    }),
    body("validUntil", "Valid until date is required").isISO8601().toDate(),
    body("minOrderAmount", "Min order amount must be a number")
      .optional()
      .isFloat({ gte: 0 }),
    body("maxDiscount", "Max discount must be a number")
      .optional()
      .isFloat({ gte: 0 }),
    body("usageLimit", "Usage limit must be an integer")
      .optional()
      .isInt({ gte: 1 }),
  ],
  createCoupon,
);

router.put("/:id", updateCoupon);

router.delete("/:id", deleteCoupon);

module.exports = router;