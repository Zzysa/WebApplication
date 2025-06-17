const admin = require("../config/firebase-admin.js");
const jwt = require("jsonwebtoken");

const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    if (admin.isInitialized && admin.isInitialized()) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.firebaseUser = decodedToken;
    } else {
      console.log("[Auth Middleware] Firebase not initialized, using mock verification");
      const decoded = jwt.decode(idToken);
      if (!decoded) {
        throw new Error("Invalid token format");
      }
      req.firebaseUser = {
        uid: decoded.user_id || decoded.sub || "mock-uid",
        email: decoded.email || "test@test.com",
      };
    }
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(403).json({
      message: "Forbidden: Invalid or expired token.",
      error: error.message,
    });
  }
};

module.exports = verifyAuthToken;