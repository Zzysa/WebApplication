const router = require("express").Router();
const { body } = require("express-validator");
const {
  getActiveCoupons,
  applyCoupon,
} = require("../controllers/couponController.js");

router.get("/", getActiveCoupons);

router.post(
  "/apply",
  [
    body("code").trim().notEmpty(),
    body("total").isFloat({ gt: 0 }),
  ],
  applyCoupon,
);

module.exports = router;