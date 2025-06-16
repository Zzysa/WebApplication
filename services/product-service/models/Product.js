const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a product name"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      trim: true
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      min: 0,
    },
    imageUrl: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
