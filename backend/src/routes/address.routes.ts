import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

const addressSchema = z.object({
  label: z.string().trim().max(100).optional(),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().optional(),
});

async function getCustomerProfileId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      customerProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (user?.role !== "CUSTOMER" || !user.customerProfile) {
    return null;
  }

  return user.customerProfile.id;
}

/**
 * GET /addresses
 * Return only addresses belonging to the authenticated customer.
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const customerId = await getCustomerProfileId(authReq.user!.id);

    if (!customerId) {
      res.status(403).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    const addresses = await prisma.address.findMany({
      where: {
        customerId,
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    res.json({
      success: true,
      data: addresses,
    });
  })
);

/**
 * POST /addresses
 * Create a delivery address for the authenticated customer.
 */
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const customerId = await getCustomerProfileId(authReq.user!.id);

    if (!customerId) {
      res.status(403).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    const parsed = addressSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid address details.",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const existingCount = await prisma.address.count({
      where: { customerId },
    });

    const shouldBeDefault =
      existingCount === 0 || parsed.data.isDefault === true;

    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          customerId,
          label: parsed.data.label || null,
          addressLine1: parsed.data.addressLine1,
          addressLine2: parsed.data.addressLine2 || null,
          city: parsed.data.city,
          state: parsed.data.state,
          postalCode: parsed.data.postalCode,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          isDefault: shouldBeDefault,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully.",
      data: address,
    });
  })
);

/**
 * PUT /addresses/:id
 * Update an address owned by the authenticated customer.
 */
router.put(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const customerId = await getCustomerProfileId(authReq.user!.id);

    if (!customerId) {
      res.status(403).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    const parsed = addressSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid address details.",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const existingAddress = await prisma.address.findFirst({
      where: {
        id: String(req.params.id),
        customerId,
      },
    });

    if (!existingAddress) {
      res.status(404).json({
        success: false,
        message: "Address not found.",
      });
      return;
    }

    const shouldBeDefault =
      parsed.data.isDefault === true || existingAddress.isDefault;

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: {
            customerId,
            id: { not: existingAddress.id },
          },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: {
          id: existingAddress.id,
        },
        data: {
          label: parsed.data.label || null,
          addressLine1: parsed.data.addressLine1,
          addressLine2: parsed.data.addressLine2 || null,
          city: parsed.data.city,
          state: parsed.data.state,
          postalCode: parsed.data.postalCode,
          latitude:
            parsed.data.latitude !== undefined
              ? parsed.data.latitude
              : existingAddress.latitude,
          longitude:
            parsed.data.longitude !== undefined
              ? parsed.data.longitude
              : existingAddress.longitude,
          isDefault: shouldBeDefault,
        },
      });
    });

    res.json({
      success: true,
      message: "Address updated successfully.",
      data: updatedAddress,
    });
  })
);

/**
 * PATCH /addresses/:id/default
 * Set an address owned by the authenticated customer as default.
 */
router.patch(
  "/:id/default",
  authenticate,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const customerId = await getCustomerProfileId(authReq.user!.id);

    if (!customerId) {
      res.status(403).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    const existingAddress = await prisma.address.findFirst({
      where: {
        id: String(req.params.id),
        customerId,
      },
    });

    if (!existingAddress) {
      res.status(404).json({
        success: false,
        message: "Address not found.",
      });
      return;
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id: existingAddress.id },
        data: { isDefault: true },
      });
    });

    res.json({
      success: true,
      message: "Default delivery address updated.",
      data: updatedAddress,
    });
  })
);

export default router;