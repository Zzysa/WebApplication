const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
	getProducts,
	createProduct,
	updateProduct,
	deleteProduct,
} = require("../controllers/productController.js");

router.get("/", getProducts);

router.post(
	"/",
	[
		body("name", "Name is required").not().isEmpty().trim(),
		body("description", "Description is required").not().isEmpty().trim(),
		body("price", "Price must be a positive number").isFloat({ gt: 0 }),
		body("imageUrl", "Image URL must be a valid URL").optional().isURL(),
	],
	createProduct,
);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

module.exports = router;