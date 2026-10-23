
import { Router } from "express";
import {
  DeliveryStatus,
  DriverAvailability,
  OrderStatus,
  UserRole,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  authenticate,
  allowRoles,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

const statusSchema = z.object({
  status: z.enum([
    "ACCEPTED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "FAILED",
  ]),
  failureReason: z.string().trim().min(3).max(500).optional(),
});

const activeStatuses: DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.ACCEPTED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
];

const includeDelivery = {
  order: {
    include: {
      customer: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      address: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              bottleSizeLiters: true,
            },
          },
        },
      },
    },
  },
} as const;

/**
 * GET /api/deliveries/my
 * Return deliveries assigned to the logged-in driver.
 */
router.get(
  "/my",
  authenticate,
  allowRoles(UserRole.DRIVER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
      return;
    }

    const deliveries = await prisma.delivery.findMany({
      where: { driverId: driver.id },
      include: includeDelivery,
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      success: true,
      data: deliveries.map((delivery) => ({
        id: delivery.id,
        status: delivery.status,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
        startedAt: delivery.startedAt,
        pickedUpAt: delivery.pickedUpAt,
        deliveredAt: delivery.deliveredAt,
        failedAt: delivery.failedAt,
        failureReason: delivery.failureReason,
        order: {
          id: delivery.order.id,
          orderNumber: delivery.order.orderNumber,
          status: delivery.order.status,
          totalAmountPaise: delivery.order.totalAmountPaise,
          notes: delivery.order.notes,
          customer: {
            name: delivery.order.customer.user.name,
            phone: delivery.order.customer.user.phone,
            email: delivery.order.customer.user.email,
          },
          address: delivery.order.address,
          items: delivery.order.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            product: item.product,
          })),
        },
      })),
    });
  })
);





router.get(
  "/me",
  authenticate,
  allowRoles(UserRole.DRIVER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: driver.id,
        userId: driver.userId,
        name: driver.user.name,
        email: driver.user.email,
        phone: driver.user.phone,
        role: driver.user.role,
        isActive: driver.user.isActive,
        licenseNumber: driver.licenseNumber,
        availability: driver.availability,
        createdAt: driver.user.createdAt,
      },
    });
  })
);


/**
 * PATCH /api/deliveries/:id/status
 * Update the status of a delivery assigned to the logged-in driver.
 */
router.patch(
  "/:id/status",
  authenticate,
  allowRoles(UserRole.DRIVER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = statusSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid delivery status or failure details.",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const { status: nextStatus, failureReason } = parsed.data;

    if (nextStatus === "FAILED" && !failureReason) {
      res.status(400).json({
        success: false,
        message: "Please provide a reason when reporting a failed delivery.",
      });
      return;
    }

    // Safely narrow the route parameter to a string.
    const rawDeliveryId = req.params.id;
    const deliveryId = Array.isArray(rawDeliveryId)
      ? rawDeliveryId[0]
      : rawDeliveryId;

    if (
      typeof deliveryId !== "string" ||
      deliveryId.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid delivery ID.",
      });
      return;
    }

    const driver = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: {
          id: deliveryId,
          driverId: driver.id,
        },
        include: { order: true },
      });

      if (!delivery) {
        throw new Error("DELIVERY_NOT_FOUND");
      }

      const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
        ASSIGNED: [DeliveryStatus.ACCEPTED],
        ACCEPTED: [DeliveryStatus.PICKED_UP],
        PICKED_UP: [DeliveryStatus.IN_TRANSIT],
        IN_TRANSIT: [
          DeliveryStatus.DELIVERED,
          DeliveryStatus.FAILED,
        ],
        DELIVERED: [],
        FAILED: [],
        CANCELLED: [],
      };

      const target = nextStatus as DeliveryStatus;

      if (!allowed[delivery.status].includes(target)) {
        throw new Error("INVALID_DELIVERY_TRANSITION");
      }

      const now = new Date();

      const updated = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: target,
          ...(target === DeliveryStatus.PICKED_UP
            ? { pickedUpAt: now }
            : {}),
          ...(target === DeliveryStatus.IN_TRANSIT
            ? { startedAt: now }
            : {}),
          ...(target === DeliveryStatus.DELIVERED
            ? { deliveredAt: now }
            : {}),
          ...(target === DeliveryStatus.FAILED
            ? { failedAt: now, failureReason }
            : {}),
        },
      });

      if (target === DeliveryStatus.IN_TRANSIT) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.IN_DELIVERY },
        });
      } else if (target === DeliveryStatus.DELIVERED) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }

      if (
        target === DeliveryStatus.DELIVERED ||
        target === DeliveryStatus.FAILED
      ) {
        const remaining = await tx.delivery.count({
          where: {
            driverId: driver.id,
            id: { not: delivery.id },
            status: { in: activeStatuses },
          },
        });

        await tx.driverProfile.update({
          where: { id: driver.id },
          data: {
            availability:
              remaining === 0
                ? DriverAvailability.AVAILABLE
                : DriverAvailability.BUSY,
          },
        });
      } else if (target === DeliveryStatus.ACCEPTED) {
        await tx.driverProfile.update({
          where: { id: driver.id },
          data: { availability: DriverAvailability.BUSY },
        });
      }

      return updated;
    });

    res.json({
      success: true,
      message: `Delivery updated to ${result.status}.`,
      data: {
        id: result.id,
        status: result.status,
        startedAt: result.startedAt,
        pickedUpAt: result.pickedUpAt,
        deliveredAt: result.deliveredAt,
        failedAt: result.failedAt,
        failureReason: result.failureReason,
      },
    });
  })
);



const availabilitySchema = z.object({
  availability: z.enum(["AVAILABLE", "OFFLINE"]),
});

router.patch(
  "/me/availability",
  authenticate,
  allowRoles(UserRole.DRIVER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = availabilitySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Availability must be AVAILABLE or OFFLINE.",
      });
      return;
    }

    const driver = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: "Driver profile not found.",
      });
      return;
    }

    // Don't let a driver go offline during an active delivery.
    if (parsed.data.availability === "OFFLINE") {
      const activeDelivery = await prisma.delivery.findFirst({
        where: {
          driverId: driver.id,
          status: {
            in: [
              DeliveryStatus.ASSIGNED,
              DeliveryStatus.ACCEPTED,
              DeliveryStatus.PICKED_UP,
              DeliveryStatus.IN_TRANSIT,
            ],
          },
        },
      });

      if (activeDelivery) {
        res.status(409).json({
          success: false,
          message:
            "Complete or resolve your active delivery before going offline.",
        });
        return;
      }
    }

    const updated = await prisma.driverProfile.update({
      where: { id: driver.id },
      data: { availability: parsed.data.availability },
    });

    res.json({
      success: true,
      message: "Availability updated successfully.",
      data: {
        availability: updated.availability,
      },
    });
  })
);



/**
 * GET /api/drivers
 * List drivers for the owner dashboard.
 */
router.get(
  "/",
  authenticate,
  allowRoles(UserRole.OWNER),
  asyncHandler(async (_req, res) => {
    const drivers = await prisma.driverProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: drivers.map((driver) => ({
        id: driver.id,
        userId: driver.userId,
        name: driver.user.name,
        email: driver.user.email,
        phone: driver.user.phone,
        isActive: driver.user.isActive,
        availability: driver.availability,
        licenseNumber: driver.licenseNumber,
        createdAt: driver.user.createdAt,
      })),
    });
  })
);

export default router;
