let prisma;
if (process.env.NODE_ENV === 'test') {
  const { PrismaClient } = require("../prisma/generated/test-client");
  prisma = new PrismaClient();
} else {
  const { PrismaClient } = require("../prisma/generated/prisma");
  prisma = new PrismaClient();
}

const getCurrentUser = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getCurrentUser,
  getAllUsers,
};