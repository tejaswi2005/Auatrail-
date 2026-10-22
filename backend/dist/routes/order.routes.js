import { Router } from "express";
import { OrderStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, allowRoles, } from "../middleware/auth.js";
const router = Router();
const createOrderSchema = z.object({
    addressId: z.string().min(1),
    notes: z.string().max(1000).optional(),
    items: z
        .array(z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
    }))
        .min(1)
        .max(30),
});
router.post("/", authenticate, allowRoles(UserRole.CUSTOMER), asyncHandler(async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid order",
            errors: parsed.error.flatten(),
        });
    }
    const profile = await prisma.customerProfile.findUnique({
        where: { userId: req.user.id },
    });
    if (!profile) {
        return res.status(403).json({
            success: false,
            message: "Customer profile required",
        });
    }
    const address = await prisma.address.findFirst({
        where: {
            id: parsed.data.addressId,
            customerId: profile.id,
        },
    });
    if (!address) {
        return res.status(400).json({
            success: false,
            message: "Choose a valid delivery address",
        });
    }
    const quantities = new Map();
    for (const item of parsed.data.items) {
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const items = Array.from(quantities, ([productId, quantity]) => ({
        productId,
        quantity,
    }));
    const order = await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
            where: {
                id: { in: items.map((item) => item.productId) },
                isActive: true,
            },
        });
        if (products.length !== items.length) {
            throw new Error("INVALID_PRODUCTS");
        }
        const productMap = new Map(products.map((product) => [product.id, product]));
        let totalAmountPaise = 0;
        const orderItems = items.map((item) => {
            const product = productMap.get(item.productId);
            if (product.stockQuantity < item.quantity) {
                throw new Error("INSUFFICIENT_STOCK");
            }
            const subtotalPaise = product.pricePaise * item.quantity;
            if (!Number.isSafeInteger(subtotalPaise)) {
                throw new Error("INVALID_PRICE");
            }
            totalAmountPaise += subtotalPaise;
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPricePaise: product.pricePaise,
                subtotalPaise,
            };
        });
        if (!Number.isSafeInteger(totalAmountPaise)) {
            throw new Error("INVALID_PRICE");
        }
        // Conditional updates prevent stock from going negative
        // when concurrent requests try to purchase the same product.
        for (const item of items) {
            const updated = await tx.product.updateMany({
                where: {
                    id: item.productId,
                    isActive: true,
                    stockQuantity: { gte: item.quantity },
                },
                data: {
                    stockQuantity: { decrement: item.quantity },
                },
            });
            if (updated.count !== 1) {
                throw new Error("INSUFFICIENT_STOCK");
            }
            await tx.inventoryTransaction.create({
                data: {
                    productId: item.productId,
                    type: "ORDER_RESERVED",
                    quantity: -item.quantity,
                    note: "Customer order",
                },
            });
        }
        const orderNumber = `AT-${Date.now()}-${cryptoRandomSuffix()}`;
        return tx.order.create({
            data: {
                orderNumber,
                customerId: profile.id,
                addressId: address.id,
                notes: parsed.data.notes,
                status: OrderStatus.PENDING,
                totalAmountPaise,
                items: {
                    create: orderItems,
                },
                delivery: {
                    create: {
                        status: "ASSIGNED",
                    },
                },
            },
            include: {
                items: {
                    include: { product: true },
                },
                delivery: true,
            },
        });
    });
    res.status(201).json({
        success: true,
        data: order,
    });
}));
function cryptoRandomSuffix() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}
router.get("/my", authenticate, allowRoles(UserRole.CUSTOMER), asyncHandler(async (req, res) => {
    const profile = await prisma.customerProfile.findUnique({
        where: { userId: req.user.id },
    });
    if (!profile) {
        return res.status(403).json({
            success: false,
            message: "Customer profile required",
        });
    }
    const orders = await prisma.order.findMany({
        where: { customerId: profile.id },
        include: {
            items: { include: { product: true } },
            delivery: true,
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        success: true,
        data: orders,
    });
}));
router.get("/", authenticate, allowRoles(UserRole.OWNER), asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
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
            items: { include: { product: true } },
            delivery: true,
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        success: true,
        data: orders,
    });
}));
export default router;
