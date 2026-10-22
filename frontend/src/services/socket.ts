import { io } from "socket.io-client";
import { getAccessToken } from "./auth";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ["websocket", "polling"],

  auth: (callback) => {
    callback({
      token: getAccessToken(),
    });
  },
});