let prisma;
if (process.env.NODE_ENV === 'test') {
  const { PrismaClient } = require("../prisma/generated/test-client");
  prisma = new PrismaClient();
} else {
  const { PrismaClient } = require("../prisma/generated/prisma");
  prisma = new PrismaClient();
}

const addUserToRequest = async (req, res, next) => {
  try {
    let user = await prisma.user.findUnique({
      where: { firebaseUid: req.firebaseUser.uid },
    });
    
    if (!user) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: req.firebaseUser.email },
      });

      if (existingUserByEmail) {
        user = await prisma.user.update({
          where: { email: req.firebaseUser.email },
          data: { firebaseUid: req.firebaseUser.uid },
        });
      } else {
        user = await prisma.user.create({
          data: { 
            firebaseUid: req.firebaseUser.uid, 
            email: req.firebaseUser.email, 
            role: "client" 
          },
        });
      }
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Error with user:", error);
    res.status(500).json({ message: "User error", error: error.message });
  }
};

module.exports = addUserToRequest;