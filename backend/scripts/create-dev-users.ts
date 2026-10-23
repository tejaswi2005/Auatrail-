import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, DriverAvailability } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.DEV_OWNER_EMAIL?.toLowerCase();
  const ownerPassword = process.env.DEV_OWNER_PASSWORD;
  const driverEmail = process.env.DEV_DRIVER_EMAIL?.toLowerCase();
  const driverPassword = process.env.DEV_DRIVER_PASSWORD;

  if (!ownerEmail || !ownerPassword || !driverEmail || !driverPassword) {
    throw new Error(
      "Set DEV_OWNER_EMAIL, DEV_OWNER_PASSWORD, DEV_DRIVER_EMAIL, and DEV_DRIVER_PASSWORD."
    );
  }

  if (ownerPassword.length < 8 || driverPassword.length < 8) {
    throw new Error("Development passwords must be at least 8 characters.");
  }

  const ownerHash = await bcrypt.hash(ownerPassword, 12);
  const driverHash = await bcrypt.hash(driverPassword, 12);

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: "AquaTrail Development Owner",
      passwordHash: ownerHash,
      role: UserRole.OWNER,
      isActive: true,
    },
    create: {
      name: "AquaTrail Development Owner",
      email: ownerEmail,
      passwordHash: ownerHash,
      role: UserRole.OWNER,
      isActive: true,
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: driverEmail },
    update: {
      name: "AquaTrail Development Driver",
      passwordHash: driverHash,
      role: UserRole.DRIVER,
      isActive: true,
    },
    create: {
      name: "AquaTrail Development Driver",
      email: driverEmail,
      passwordHash: driverHash,
      role: UserRole.DRIVER,
      isActive: true,
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driver.id },
    update: {},
    create: {
      userId: driver.id,
      availability: DriverAvailability.OFFLINE,
    },
  });

  console.log("Development accounts created or updated.");
  console.log(`Owner login: ${ownerEmail}`);
  console.log(`Driver login: ${driverEmail}`);
  console.log("Use the passwords you supplied in your environment.");

}

main()
  .catch((error) => {
    console.error("Could not create development accounts:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });