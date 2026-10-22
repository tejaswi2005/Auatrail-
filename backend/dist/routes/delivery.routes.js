import { Router } from "express";
import { DeliveryStatus, OrderStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, allowRoles, } from "../middleware/auth.js";
const router = Router();
const assignmentSchema = z.object({
    driverId: z.string().trim().min(1, "Driver ID is required"),
});
// Assign a delivery to a driver
router.post("/:deliveryId/assign", authenticate, allowRoles(UserRole.OWNER), asyncHandler(async (req, res) => {
    // 1. Validate the delivery ID from the URL
    const deliveryId = req.params.deliveryId;
    if (typeof deliveryId !== "string" ||
        deliveryId.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "A valid delivery ID is required",
        });
    }
    // 2. Validate the request body
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "A valid driver ID is required",
            errors: parsed.error.flatten(),
        });
    }
    // 3. Assign the driver inside a transaction
    const delivery = await prisma.$transaction(async (tx) => {
        const current = await tx.delivery.findUnique({
            where: {
                id: deliveryId,
            },
        });
        if (!current) {
            throw new Error("DELIVERY_NOT_FOUND");
        }
        if (current.status === DeliveryStatus.DELIVERED ||
            current.status === DeliveryStatus.CANCELLED) {
            throw new Error("DELIVERY_NOT_ASSIGNABLE");
        }
        // Find the requested driver
        const driver = await tx.driverProfile.findUnique({
            where: {
                id: parsed.data.driverId,
            },
            include: {
                user: true,
            },
        });
        if (!driver || !driver.user.isActive) {
            throw new Error("DRIVER_NOT_FOUND");
        }
        if (driver.availability === "OFFLINE") {
            throw new Error("DRIVER_OFFLINE");
        }
        // Update the delivery assignment
        const updatedDelivery = await tx.delivery.update({
            where: {
                id: current.id,
            },
            data: {
                driverId: driver.id,
                status: DeliveryStatus.ASSIGNED,
                startedAt: null,
                pickedUpAt: null,
                deliveredAt: null,
            },
        });
        // Update the associated order
        await tx.order.update({
            where: {
                id: current.orderId,
            },
            data: {
                status: OrderStatus.ASSIGNED,
            },
        });
        // Mark the selected driver as busy
        await tx.driverProfile.update({
            where: {
                id: driver.id,
            },
            data: {
                availability: "BUSY",
            },
        });
        return updatedDelivery;
    });
    return res.json({
        success: true,
        message: "Driver assigned successfully",
        data: delivery,
    });
}));
// Get the authenticated driver's active deliveries
router.get("/my", authenticate, allowRoles(UserRole.DRIVER), asyncHandler(async (req, res) => {
    const driver = await prisma.driverProfile.findUnique({
        where: {
            userId: req.user.id,
        },
    });
    if (!driver) {
        return res.status(403).json({
            success: false,
            message: "Driver profile required",
        });
    }
    const deliveries = await prisma.delivery.findMany({
        where: {
            driverId: driver.id,
            status: {
                notIn: [
                    DeliveryStatus.DELIVERED,
                    DeliveryStatus.CANCELLED,
                ],
            },
        },
        include: {
            order: {
                include: {
                    address: true,
                    customer: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return res.json({
        success: true,
        data: deliveries,
    });
}));
export default router;
