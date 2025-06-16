const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController.js");

router.get("/", getCategories);

router.post(
  "/",
  [
    body("name", "Name is required").not().isEmpty().trim(),
    body("description", "Description must be a string").optional().trim(),
  ],
  createCategory
);

router.put("/:id", updateCategory);

router.delete("/:id", deleteCategory);

module.exports = router;