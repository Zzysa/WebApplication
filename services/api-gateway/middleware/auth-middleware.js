const admin = require("../config/firebase-admin");

const checkAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.role === 'admin') {
            next(); 
        } else {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
    } catch (error) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
    }
};

module.exports = checkAdmin;