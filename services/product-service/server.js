require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db.js");
const productRoutes = require("./routes/productRoutes.js");
const categoryRoutes = require("./routes/categoryRoutes.js");
const helmet = require("helmet");
const couponRoutes = require("./routes/couponRoutes.js");
const adminCouponRoutes = require("./routes/adminCouponRoutes.js");

connectDB();

const app = express();
app.use(helmet());
const PORT = process.env.PORT || 3002;

app.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  next();
});

app.use(cors());
app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`[Product Service] Running on port ${PORT}`);
});