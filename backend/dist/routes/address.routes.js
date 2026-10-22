import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, } from "../middleware/auth.js";
const router = Router();
const addressSchema = z.object({
    label: z.string().max(50).optional(),
    addressLine1: z.string().trim().min(3).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(3).max(15),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isDefault: z.boolean().optional(),
});
router.get("/", authenticate, asyncHandler(async (req, res) => {
    const profile = await prisma.customerProfile.findUnique({
        where: { userId: req.user.id },
    });
    if (!profile) {
        return res.status(403).json({
            success: false,
            message: "Customer profile required",
        });
    }
    const addresses = await prisma.address.findMany({
        where: { customerId: profile.id },
        orderBy: { createdAt: "desc" },
    });
    res.json({
        success: true,
        data: addresses,
    });
}));
router.post("/", authenticate, asyncHandler(async (req, res) => {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid address",
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
    const address = await prisma.address.create({
        data: {
            ...parsed.data,
            customerId: profile.id,
        },
    });
    res.status(201).json({
        success: true,
        data: address,
    });
}));
export default router;
