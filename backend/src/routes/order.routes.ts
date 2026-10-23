
import { Router } from "express";
import { OrderStatus, DeliveryStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  authenticate,
  allowRoles,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

const createOrderSchema = z.object({
  addressId: z.string().min(1),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(30),
});

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

type StatusUpdateResult =
  | { error: "NOT_FOUND" }
  | {
      error: "INVALID_TRANSITION";
      currentStatus: OrderStatus;
    }
  | { error: "DRIVER_REQUIRED" }
  | { error: "DELIVERY_ALREADY_STARTED" }
  | { error: null; order: NonNullable<Awaited<ReturnType<typeof getOrder>>> };

async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: { include: { user: true } },
      address: true,
      items: { include: { product: true } },
      delivery: true,
    },
  });
}

// Create a customer order.
router.post(
  "/",
  authenticate,
  allowRoles(UserRole.CUSTOMER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = createOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid order",
        errors: parsed.error.flatten(),
      });
    }

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
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

    const quantities = new Map<string, number>();

    for (const item of parsed.data.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity
      );
    }

    const items = Array.from(quantities, ([productId, quantity]) => ({
      productId,
      quantity,
    }));

    try {
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

        const productMap = new Map(
          products.map((product) => [product.id, product])
        );

        let totalAmountPaise = 0;

        const orderItems = items.map((item) => {
          const product = productMap.get(item.productId);

          if (!product) {
            throw new Error("INVALID_PRODUCTS");
          }

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

        // Reserve inventory safely, even when orders are submitted
        // concurrently.
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

        const orderNumber =
          `AT-${Date.now()}-${cryptoRandomSuffix()}`;

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
                status: DeliveryStatus.ASSIGNED,
              },
            },
          },
          include: {
            items: { include: { product: true } },
            delivery: true,
          },
        });
      });

      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === "INVALID_PRODUCTS") {
          return res.status(400).json({
            success: false,
            message: "One or more products are unavailable",
          });
        }

        if (error.message === "INSUFFICIENT_STOCK") {
          return res.status(409).json({
            success: false,
            message: "Insufficient stock for one or more products",
          });
        }

        if (error.message === "INVALID_PRICE") {
          return res.status(400).json({
            success: false,
            message: "The order total is invalid",
          });
        }
      }

      throw error;
    }
  })
);

function cryptoRandomSuffix() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Get the logged-in customer's orders.
router.get(
  "/my",
  authenticate,
  allowRoles(UserRole.CUSTOMER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
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

    return res.json({
      success: true,
      data: orders,
    });
  })
);

// Owner gets all orders.
router.get(
  "/",
  authenticate,
  allowRoles(UserRole.OWNER),
  asyncHandler(async (_req, res) => {
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
        address: true,
        items: { include: { product: true } },
        delivery: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: orders,
    });
  })
);

// PATCH /orders/:id/status — OWNER only.
router.patch(
  "/:id/status",
  authenticate,
  allowRoles(UserRole.OWNER),
  asyncHandler(async (req, res) => {
    const parsed = updateOrderStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
        errors: parsed.error.flatten(),
      });
    }

    const orderId = req.params.id;

    if (typeof orderId !== "string" || !orderId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const requestedStatus = parsed.data.status;

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
      ASSIGNED: [],
      IN_DELIVERY: [],
      DELIVERED: [],
      CANCELLED: [],
    };

    const result: StatusUpdateResult = await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { delivery: true },
        });

        if (!order) {
          return { error: "NOT_FOUND" };
        }

        // Idempotent request: already has the requested status.
        if (order.status === requestedStatus) {
          const currentOrder = await tx.order.findUniqueOrThrow({
            where: { id: order.id },
            include: {
              customer: { include: { user: true } },
              address: true,
              items: { include: { product: true } },
              delivery: true,
            },
          });

          return { error: null, order: currentOrder };
        }

        if (!allowedTransitions[order.status].includes(requestedStatus)) {
          return {
            error: "INVALID_TRANSITION",
            currentStatus: order.status,
          };
        }

        if (
          requestedStatus === OrderStatus.ASSIGNED &&
          !order.delivery?.driverId
        ) {
          return { error: "DRIVER_REQUIRED" };
        }

        if (
          requestedStatus === OrderStatus.CANCELLED &&
          order.delivery &&
          (
            order.delivery.status === DeliveryStatus.PICKED_UP ||
            order.delivery.status === DeliveryStatus.IN_TRANSIT ||
            order.delivery.status === DeliveryStatus.DELIVERED
          )
        ) {
          return { error: "DELIVERY_ALREADY_STARTED" };
        }

        // Synchronize the delivery record when cancelling an order.
        if (
          requestedStatus === OrderStatus.CANCELLED &&
          order.delivery &&
          order.delivery.status !== DeliveryStatus.CANCELLED
        ) {
          await tx.delivery.update({
            where: { id: order.delivery.id },
            data: { status: DeliveryStatus.CANCELLED },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: requestedStatus },
          include: {
            customer: { include: { user: true } },
            address: true,
            items: { include: { product: true } },
            delivery: true,
          },
        });

        return { error: null, order: updatedOrder };
      }
    );

    if (result.error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (result.error === "INVALID_TRANSITION") {
      return res.status(409).json({
        success: false,
        message:
          `Cannot change order status from ${result.currentStatus} ` +
          `to ${requestedStatus}`,
      });
    }

    if (result.error === "DRIVER_REQUIRED") {
      return res.status(409).json({
        success: false,
        message: "Assign a driver before marking this order as assigned",
      });
    }

    if (result.error === "DELIVERY_ALREADY_STARTED") {
      return res.status(409).json({
        success: false,
        message:
          "This delivery has already started and cannot be cancelled here",
      });
    }

    return res.json({
      success: true,
      data: result.order,
      message: "Order status updated successfully",
    });
  })
);

export default router;
