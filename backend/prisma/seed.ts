import {
  PrismaClient,
  UserRole,
  DriverAvailability,
  OrderStatus,
  DeliveryStatus,
  InventoryTransactionType,
} from "@prisma/client";

import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create test users with hashed passwords.
  const ownerPassword = await bcrypt.hash("OwnerDemo123!", 12);
  const driverPassword = await bcrypt.hash("DriverDemo123!", 12);
  const customerPassword = await bcrypt.hash("CustomerDemo123!", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@aquatrail.local" },
    update: {},
    create: {
      name: "AquaTrail Owner",
      email: "owner@aquatrail.local",
      passwordHash: ownerPassword,
      phone: "9000000001",
      role: UserRole.OWNER,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: "driver@aquatrail.local" },
    update: {},
    create: {
      name: "Demo Driver",
      email: "driver@aquatrail.local",
      passwordHash: driverPassword,
      phone: "9000000002",
      role: UserRole.DRIVER,
      driverProfile: {
        create: {
          licenseNumber: "DEMO-LICENSE-001",
          availability: DriverAvailability.AVAILABLE,
        },
      },
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "customer@aquatrail.local" },
    update: {},
    create: {
      name: "Demo Customer",
      email: "customer@aquatrail.local",
      passwordHash: customerPassword,
      phone: "9000000003",
      role: UserRole.CUSTOMER,
      customerProfile: {
        create: {},
      },
    },
  });

  // Ensure profiles also exist if the users were created earlier.
  const driver = await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseNumber: "DEMO-LICENSE-001",
      availability: DriverAvailability.AVAILABLE,
    },
  });

  const customer = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
    },
  });

  // Create a demo delivery address.
  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label: "Home",
      addressLine1: "Demo Address",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
      latitude: 18.5204,
      longitude: 73.8567,
      isDefault: true,
    },
  });

  // Create a demo product.
  const product = await prisma.product.create({
    data: {
      name: "20 Litre Water Bottle",
      description: "Reusable large water bottle",
      bottleSizeLiters: 20,
      pricePaise: 8000,
      stockQuantity: 100,
      isActive: true,
    },
  });

  // Record the initial stock.
  await prisma.inventoryTransaction.create({
    data: {
      productId: product.id,
      type: InventoryTransactionType.RESTOCK,
      quantity: 100,
      note: "Initial demo inventory",
    },
  });

  // Create a demo order and its items.
  const order = await prisma.order.create({
    data: {
      orderNumber: `AT-DEMO-${Date.now()}`,
      customerId: customer.id,
      addressId: address.id,
      status: OrderStatus.ASSIGNED,
      totalAmountPaise: 16000,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 2,
            unitPricePaise: 8000,
            subtotalPaise: 16000,
          },
        ],
      },
    },
  });

  // Create a demo delivery.
  const delivery = await prisma.delivery.create({
    data: {
      orderId: order.id,
      driverId: driver.id,
      status: DeliveryStatus.ASSIGNED,
    },
  });

  await prisma.driverProfile.update({
    where: { id: driver.id },
    data: { availability: DriverAvailability.BUSY },
  });

  console.log("AquaTrail demo data created successfully.");
  console.log({
    ownerEmail: owner.email,
    driverEmail: driverUser.email,
    customerEmail: customerUser.email,
    orderNumber: order.orderNumber,
    deliveryId: delivery.id,
  });
}

main()
  .catch((error) => {
    console.error("Failed to seed AquaTrail demo data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });