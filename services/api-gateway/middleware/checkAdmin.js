const axios = require("axios");

const checkAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No authorization header" });
  }

  try {
    const response = await axios.get("http://account-service:3001/api/users/me", {
      headers: { Authorization: authHeader }
    });
    
    if (response.data.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("[API Gateway] Admin check failed:", error.message);
    return res.status(403).json({ message: "Access denied" });
  }
};

module.exports = checkAdmin;
