import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;

    const user = await prisma.user.findUnique({
      where: {
        id: authReq.user!.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        customerProfile: {
          select: {
            id: true,
            addresses: {
              orderBy: [
                { isDefault: "desc" },
                { createdAt: "desc" },
              ],
              select: {
                id: true,
                label: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
                latitude: true,
                longitude: true,
                isDefault: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== "CUSTOMER") {
      res.status(403).json({
        success: false,
        message: "Only customers can access this profile.",
      });
      return;
    }

    if (!user.customerProfile) {
      res.status(404).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        customerProfileId: user.customerProfile.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        mobileNumber: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        addresses: user.customerProfile.addresses,
      },
    });
  })
);

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;

    const schema = z.object({
      phone: z.string().trim().min(7).max(30),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Enter a valid mobile number.",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: authReq.user!.id,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user || user.role !== "CUSTOMER") {
      res.status(403).json({
        success: false,
        message: "Only customers can update this profile.",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        phone: parsed.data.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: "Mobile number updated successfully.",
      data: {
        ...updatedUser,
        mobileNumber: updatedUser.phone,
      },
    });
  })
);

export default router;