const express = require("express");
const router = express.Router();
const verifyAuthToken = require("../middleware/auth-middleware");
const addUserToRequest = require("../middleware/addUserToRequest");
const {
  getCurrentUser,
  getAllUsers,
} = require("../controllers/userController");

router.get("/me", verifyAuthToken, addUserToRequest, getCurrentUser);

router.get("/", verifyAuthToken, addUserToRequest, getAllUsers);

module.exports = router;