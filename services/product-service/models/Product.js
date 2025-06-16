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
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  },
);

productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 1 });

module.exports = mongoose.model("Product", productSchema);