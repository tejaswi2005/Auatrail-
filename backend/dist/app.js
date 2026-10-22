import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import addressRoutes from "./routes/address.routes.js";
import orderRoutes from "./routes/order.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
export function createApp() {
    const app = express();
    app.use(cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
    }));
    app.use(express.json({ limit: "100kb" }));
    app.get("/api/health", (_req, res) => {
        res.json({
            success: true,
            message: "AquaTrail backend is running!",
        });
    });
    app.use("/api/auth", authRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/addresses", addressRoutes);
    app.use("/api/orders", orderRoutes);
    app.use("/api/deliveries", deliveryRoutes);
    app.use((error, _req, res, _next) => {
        console.error(error);
        if (error instanceof Error &&
            [
                "INVALID_PRODUCTS",
                "INSUFFICIENT_STOCK",
                "INVALID_PRICE",
                "DELIVERY_NOT_FOUND",
                "DELIVERY_NOT_ASSIGNABLE",
                "DRIVER_NOT_FOUND",
                "DRIVER_OFFLINE",
            ].includes(error.message)) {
            const status = error.message === "DELIVERY_NOT_FOUND" ||
                error.message === "DRIVER_NOT_FOUND"
                ? 404
                : 400;
            return res.status(status).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    });
    return app;
}
