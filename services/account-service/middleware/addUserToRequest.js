const { PrismaClient } = require("../prisma/generated/prisma");
const prisma = new PrismaClient();

const addUserToRequest = async (req, res, next) => {
  if (!req.firebaseUser) {
    return res.status(403).json({ message: "Forbidden: No Firebase user." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: req.firebaseUser.uid },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in our database." });
    }

    req.user = user; 
    next();
  } catch (error) {
    console.error("Error fetching user from DB:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = addUserToRequest;