import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
const PORT = Number(process.env.PORT) || 5000;
const app = createApp();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});
httpServer.listen(PORT, () => {
    console.log(`AquaTrail server running on port ${PORT}`);
});
