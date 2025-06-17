const Coupon = require("../models/Coupon.js");
const { validationResult } = require("express-validator");

const getActiveCoupons = async (_, res) => {
  const today = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    validFrom: { $lte: today },
    validUntil: { $gte: today },
  }).select("-_id code discountType discountValue minOrderAmount maxDiscount");
  res.status(200).json(coupons);
};

const applyCoupon = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
    const { code, total } = req.body;
    const today = new Date();
  
    try {
      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { $lte: today },
        validUntil: { $gte: today },
        $expr: {
          $or: [
            { $eq: ["$usageLimit", null] },
            { $lt: ["$usedCount", "$usageLimit"] },
          ],
        },
      });
  
      if (!coupon) {
        return res.status(404).json({ message: "Invalid or expired coupon" });
      }
  
      if (total < coupon.minOrderAmount) {
        return res.status(400).json({ message: "Minimum order amount not met" });
      }
  
      let discount =
        coupon.discountType === "percentage"
          ? (total * coupon.discountValue) / 100
          : coupon.discountValue;
  
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
  
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
  
      res.status(200).json({
        discount: parseFloat(discount.toFixed(2)),
        totalAfterDiscount: parseFloat((total - discount).toFixed(2)),
      });
    } catch (error) {
      console.error("Error applying coupon:", error);
      res.status(500).json({ message: "Server error while applying coupon" });
    }
};

module.exports = { getActiveCoupons, applyCoupon };