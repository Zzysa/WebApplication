const mongoose = require("mongoose");
const Product = require("../models/Product.js");
const Category = require("../models/Category.js");
const Coupon = require("../models/Coupon.js");

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://root:password@mongo:27017/productdb?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected for seeding");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

const categories = [
  { name: "Electronics", description: "Electronic devices and gadgets" },
  { name: "Clothing", description: "Fashion and apparel" },
  { name: "Books", description: "Books and literature" },
  { name: "Home & Garden", description: "Home improvement and gardening" },
  { name: "Sports", description: "Sports equipment and accessories" }
];

const products = [
  { name: "Smartphone Pro", description: "Latest flagship smartphone with advanced features", price: 999.99, categoryName: "Electronics", tags: ["mobile", "tech", "premium"] },
  { name: "Laptop Gaming", description: "High-performance gaming laptop", price: 1599.99, categoryName: "Electronics", tags: ["laptop", "gaming", "computer"] },
  { name: "Wireless Earbuds", description: "Premium wireless earbuds with noise cancellation", price: 299.99, categoryName: "Electronics", tags: ["audio", "wireless", "premium"] },
  { name: "Smart Watch", description: "Fitness tracking smartwatch", price: 399.99, categoryName: "Electronics", tags: ["wearable", "fitness", "smart"] },
  { name: "Denim Jacket", description: "Classic blue denim jacket", price: 89.99, categoryName: "Clothing", tags: ["fashion", "jacket", "denim"] },
  { name: "Running Shoes", description: "Professional running shoes for athletes", price: 159.99, categoryName: "Sports", tags: ["shoes", "running", "athletics"] },
  { name: "Programming Guide", description: "Complete guide to modern programming", price: 49.99, categoryName: "Books", tags: ["programming", "education", "tech"] },
  { name: "Coffee Maker", description: "Automatic espresso coffee maker", price: 299.99, categoryName: "Home & Garden", tags: ["kitchen", "coffee", "appliance"] },
  { name: "Yoga Mat", description: "Premium non-slip yoga mat", price: 39.99, categoryName: "Sports", tags: ["yoga", "fitness", "exercise"] },
  { name: "Cooking Set", description: "Professional cooking utensils set", price: 129.99, categoryName: "Home & Garden", tags: ["kitchen", "cooking", "utensils"] }
];

const coupons = [
  { code: "WELCOME10", discountType: "percentage", discountValue: 10, minOrderAmount: 50, validUntil: new Date("2025-12-31") },
  { code: "SAVE20", discountType: "fixed", discountValue: 20, minOrderAmount: 100, validUntil: new Date("2025-12-31") },
  { code: "ELECTRONICS15", discountType: "percentage", discountValue: 15, minOrderAmount: 200, validUntil: new Date("2025-12-31") },
  { code: "FREESHIP", discountType: "fixed", discountValue: 25, minOrderAmount: 75, validUntil: new Date("2025-12-31") },
  { code: "BIGDEAL", discountType: "percentage", discountValue: 25, minOrderAmount: 300, maxDiscount: 100, validUntil: new Date("2025-12-31") }
];

async function seedCategories() {
  console.log("Seeding categories...");
  
  for (const categoryData of categories) {
    const existingCategory = await Category.findOne({ name: categoryData.name });
    
    if (!existingCategory) {
      const category = new Category({
        ...categoryData,
        slug: categoryData.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')
      });
      await category.save();
      console.log(`Created category: ${categoryData.name}`);
    } else {
      console.log(`Category already exists: ${categoryData.name}`);
    }
  }
}

async function seedProducts() {
  console.log("Seeding products...");
  
  for (const productData of products) {
    const existingProduct = await Product.findOne({ name: productData.name });
    
    if (!existingProduct) {
      const category = await Category.findOne({ name: productData.categoryName });
      
      const product = new Product({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category: category ? category._id : null,
        tags: productData.tags,
        inStock: true,
        imageUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(productData.name)}`
      });
      
      await product.save();
      console.log(`Created product: ${productData.name}`);
    } else {
      console.log(`Product already exists: ${productData.name}`);
    }
  }
}

async function seedCoupons() {
  console.log("Seeding coupons...");
  
  for (const couponData of coupons) {
    const existingCoupon = await Coupon.findOne({ code: couponData.code });
    
    if (!existingCoupon) {
      const coupon = new Coupon(couponData);
      await coupon.save();
      console.log(`Created coupon: ${couponData.code}`);
    } else {
      console.log(`Coupon already exists: ${couponData.code}`);
    }
  }
}

async function main() {
  try {
    await connectDB();
    
    await seedCategories();
    await seedProducts();
    await seedCoupons();
    
    console.log("MongoDB seeding completed!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

main();