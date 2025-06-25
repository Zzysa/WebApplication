const express = require("express");
const router = express.Router();
const verifyAuthToken = require("../middleware/auth-middleware");
const addUserToRequest = require("../middleware/addUserToRequest");
const { getAllOrders } = require("../controllers/orderController");

router.get("/orders", verifyAuthToken, addUserToRequest, getAllOrders);

module.exports = router;