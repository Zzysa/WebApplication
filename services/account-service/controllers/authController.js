const { validationResult } = require("express-validator");

let prisma;
if (process.env.NODE_ENV === 'test') {
  const { PrismaClient } = require("../prisma/generated/test-client");
  prisma = new PrismaClient();
} else {
  const { PrismaClient } = require("../prisma/generated/prisma");
  prisma = new PrismaClient();
}

const syncUser = async (req, res) => {
  const { uid, email } = req.firebaseUser;
  
  try {
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    if (!user) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: email },
      });

      if (existingUserByEmail) {
        user = await prisma.user.update({
          where: { email: email },
          data: { firebaseUid: uid },
        });
      } else {
        user = await prisma.user.create({
          data: { firebaseUid: uid, email: email, role: "client" },
        });
      }
    }

    res.json({ message: "User synced successfully", user });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ message: "Sync failed", error: error.message });
  }
};

module.exports = {
  syncUser,
};