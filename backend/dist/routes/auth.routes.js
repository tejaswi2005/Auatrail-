import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();
const registerSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(10).max(72),
    phone: z.string().trim().max(30).optional(),
});
const loginSchema = z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(72),
});
function signAccessToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return jwt.sign({
        sub: user.id,
        role: user.role,
    }, secret, {
        expiresIn: "15m",
    });
}
router.post("/register", asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid registration details",
            errors: parsed.error.flatten(),
        });
    }
    const { name, email, password, phone } = parsed.data;
    const existing = await prisma.user.findUnique({
        where: { email },
    });
    if (existing) {
        return res.status(409).json({
            success: false,
            message: "An account with this email already exists",
        });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: {
            name,
            email,
            phone,
            passwordHash,
            role: UserRole.CUSTOMER,
            customerProfile: {
                create: {},
            },
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });
    return res.status(201).json({
        success: true,
        data: {
            user,
            accessToken: signAccessToken(user),
        },
    });
}));
router.post("/login", asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid login details",
        });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user || !user.isActive) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }
    return res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            accessToken: signAccessToken(user),
        },
    });
}));
export default router;
