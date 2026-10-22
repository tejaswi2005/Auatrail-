import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { UserRole } from "@prisma/client";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: products,
    });
  })
);

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(1000).optional(),
  bottleSizeLiters: z.number().positive().max(100),
  pricePaise: z.number().int().positive(),
  stockQuantity: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
});

router.post(
  "/",
  authenticate,
  allowRoles(UserRole.OWNER),
  asyncHandler(async (req, res) => {
    const parsed = productSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid product details",
        errors: parsed.error.flatten(),
      });
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: parsed.data,
      });

      if (parsed.data.stockQuantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: created.id,
            type: "RESTOCK",
            quantity: parsed.data.stockQuantity,
            note: "Initial stock",
          },
        });
      }

      return created;
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  })
);

export default router;