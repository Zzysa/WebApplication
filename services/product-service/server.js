const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db.js");
const productRoutes = require("./routes/productRoutes.js"); // <-- Импортируем роуты

connectDB();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use("/api/products", productRoutes);

app.listen(PORT, () => {
  console.log(`[Product Service] Running on port ${PORT}`);
});