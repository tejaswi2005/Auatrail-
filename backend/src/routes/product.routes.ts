// backend/src/routes/product.routes.ts

import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();

// GET /products — list active products
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: products });
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

const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().max(1000).nullable().optional(),
    bottleSizeLiters: z.number().positive().max(100).optional(),
    pricePaise: z.number().int().positive().optional(),
    imageUrl: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

const restockSchema = z.object({
  quantity: z.number().int().positive().max(100000),
  note: z.string().trim().max(250).optional(),
});

// POST /products — create a product (OWNER only)
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

    return res.status(201).json({ success: true, data: product });
  })
);

// PATCH /products/:id — update product details (OWNER only)
router.patch(
  "/:id",
  authenticate,
  allowRoles(UserRole.OWNER),
  asyncHandler(async (req, res) => {
    const parsed = updateProductSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid product details",
        errors: parsed.error.flatten(),
      });
    }

    const productId = req.params.id;

    if (typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    return res.json({ success: true, data: product });
  })
);

// PATCH /products/:id/stock — add stock (OWNER only)
router.patch(
  "/:id/stock",
  authenticate,
  allowRoles(UserRole.OWNER),
  asyncHandler(async (req, res) => {
    const parsed = restockSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid restock details",
        errors: parsed.error.flatten(),
      });
    }

    const productId = req.params.id;

    if (typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: existing.id },
        data: {
          stockQuantity: { increment: parsed.data.quantity },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: existing.id,
          type: "RESTOCK",
          quantity: parsed.data.quantity,
          note: parsed.data.note?.trim() || "Owner restock",
        },
      });

      return updated;
    });

    return res.json({ success: true, data: product });
  })
);

export default router;