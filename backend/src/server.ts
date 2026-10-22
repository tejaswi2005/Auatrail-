import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { createApp } from "./app.js";
import { prisma } from "./config/prisma.js";

const PORT = Number(process.env.PORT) || 5000;

const app = createApp();
const httpServer = http.createServer(app);

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:5173";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in the environment.");
}

const io = new Server(httpServer, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"],
  },
});

interface SocketUser {
  id: string;
  role: "OWNER" | "DRIVER" | "CUSTOMER";
}

declare module "socket.io" {
  interface SocketData {
    user: SocketUser;
  }
}

const locationSchema = z.object({
  deliveryId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const subscribeSchema = z.object({
  deliveryId: z.string().min(1),
});

// Authenticate each Socket.IO connection.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id?: string;
      sub?: string;
      role?: string;
    };

    const userId = decoded.id ?? decoded.sub;

    if (
      !userId ||
      !["OWNER", "DRIVER", "CUSTOMER"].includes(decoded.role ?? "")
    ) {
      return next(new Error("Invalid authentication token"));
    }

    socket.data.user = {
      id: userId,
      role: decoded.role as SocketUser["role"],
    };

    next();
  } catch {
    next(new Error("Invalid or expired authentication token"));
  }
});


// const driverProfile = await prisma.driverProfile.findUnique({
//   where: {
//     userId: user.id,
//   },
// });

// if (!driverProfile || delivery.driverId !== driverProfile.id) {
//   acknowledge?.({
//     success: false,
//     message: "Delivery is not assigned to this driver",
//   });
//   return;
// }




io.on("connection", (socket) => {
  console.log(`Authenticated socket connected: ${socket.id}`);

  socket.on("delivery:subscribe", async (payload, acknowledge) => {
    const parsed = subscribeSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge?.({
        success: false,
        message: "Invalid delivery ID",
      });
      return;
    }

    try {
      const delivery = await prisma.delivery.findUnique({
        where: {
          id: parsed.data.deliveryId,
        },
        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
      });

      if (!delivery) {
        acknowledge?.({
          success: false,
          message: "Delivery not found",
        });
        return;
      }

      const user = socket.data.user;

      const isCustomer =
        user.role === "CUSTOMER" &&
        delivery.order.customer.userId === user.id;

      const isAssignedDriver =
        user.role === "DRIVER" &&
        delivery.driverId === user.id;

      if (!isCustomer && !isAssignedDriver) {
        acknowledge?.({
          success: false,
          message: "You are not authorized to track this delivery",
        });
        return;
      }

      await socket.join(`delivery:${delivery.id}`);

      acknowledge?.({
        success: true,
        deliveryId: delivery.id,
      });
    } catch (error) {
      console.error("Delivery subscription failed:", error);

      acknowledge?.({
        success: false,
        message: "Unable to subscribe to delivery tracking",
      });
    }
  });

  socket.on("delivery:location:update", async (payload, acknowledge) => {
    const parsed = locationSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge?.({
        success: false,
        message: "Invalid location coordinates",
      });
      return;
    }

    try {
      const user = socket.data.user;

      if (user.role !== "DRIVER") {
        acknowledge?.({
          success: false,
          message: "Only drivers can publish delivery locations",
        });
        return;
      }

      const delivery = await prisma.delivery.findUnique({
        where: {
          id: parsed.data.deliveryId,
        },
      });

      if (!delivery || delivery.driverId !== user.id) {
        acknowledge?.({
          success: false,
          message: "Delivery is not assigned to this driver",
        });
        return;
      }

      if (
        ["DELIVERED", "CANCELLED"].includes(
          delivery.status.toUpperCase()
        )
      ) {
        acknowledge?.({
          success: false,
          message: "This delivery is no longer active",
        });
        return;
      }

      const update = {
        deliveryId: delivery.id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        timestamp: new Date().toISOString(),
      };

      io.to(`delivery:${delivery.id}`).emit(
        "delivery:location",
        update
      );

      acknowledge?.({
        success: true,
      });
    } catch (error) {
      console.error("Location update failed:", error);

      acknowledge?.({
        success: false,
        message: "Unable to publish location",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`AquaTrail server running on port ${PORT}`);
});