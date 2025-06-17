const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  const adminEmail = "test@test.com";
  const adminUid = "test-admin-uid-123";

  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        firebaseUid: adminUid,
        email: adminEmail,
        role: "admin"
      }
    });
    console.log(`Created admin user: ${admin.email}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  const clientEmail = "client@test.com";
  const clientUid = "test-client-uid-456";

  const existingClient = await prisma.user.findFirst({
    where: { email: clientEmail }
  });

  if (!existingClient) {
    const client = await prisma.user.create({
      data: {
        firebaseUid: clientUid,
        email: clientEmail,
        role: "client"
      }
    });
    console.log(`Created client user: ${client.email}`);
  } else {
    console.log(`Client user already exists: ${clientEmail}`);
  }

  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });