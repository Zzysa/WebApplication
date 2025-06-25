const express = require("express");
const router = express.Router();
const verifyAuthToken = require("../middleware/auth-middleware");
const { syncUser } = require("../controllers/authController");

router.post("/sync", verifyAuthToken, syncUser);

module.exports = router;