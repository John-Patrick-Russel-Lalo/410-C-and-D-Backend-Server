import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

const users = new Map(); 
// Structure:
// users.set(socket, { userId, userType, orderId, shareLocation })

// Secret must match your backend JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export function initTrackerWS(server) {
  const wss = new WebSocketServer({ server, path: "/tracker" });

  console.log("🚀 Tracker WebSocket active");

  wss.on("connection", (ws) => {
    console.log("🟢 Client connected to tracker");

    // Initialize default profile
    users.set(ws, {
      userId: null,
      userType: null,
      orderId: null,
      shareLocation: true,
    });

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);

        // ---------------------------------
        // 0. AUTHENTICATION: decode JWT
        // ---------------------------------
        if (data.token) {
          try {
            const payload = jwt.verify(data.token, JWT_SECRET);
            const user = users.get(ws);
            users.set(ws, {
              ...user,
              userId: payload.id,
              userType: payload.role,
            });
            return;
          } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
            return;
          }
        }

        const sender = users.get(ws);
        if (!sender || !sender.userId) {
          ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
          return;
        }

        // ---------------------------------
        // 1. REGISTER TO ORDER
        // ---------------------------------
        if (data.type === "register") {
          if (!data.orderId) {
            ws.send(JSON.stringify({ type: "error", message: "Missing orderId" }));
            return;
          }

          users.set(ws, {
            ...sender,
            orderId: data.orderId,
            shareLocation: sender.userType === "driver" ? true : false,
          });

          console.log(`📌 ${sender.userType} ${sender.userId} joined order ${data.orderId}`);
          return;
        }

        // ---------------------------------
        // 2. DRIVER TOGGLES PRIVACY
        // ---------------------------------
        if (data.type === "toggleShare") {
          if (sender.userType !== "driver") {
            ws.send(JSON.stringify({ type: "error", message: "Only drivers can toggle sharing" }));
            return;
          }
          sender.shareLocation = !!data.shareLocation;
          users.set(ws, sender);
          console.log(`🔒 Driver ${sender.userId} shareLocation: ${sender.shareLocation}`);
          return;
        }

        // ---------------------------------
        // 3. LOCATION UPDATE
        // ---------------------------------
        if (data.type === "location") {
          if (!sender.orderId) return;

          // Don't broadcast if driver disabled sharing
          if (sender.userType === "driver" && !sender.shareLocation) return;

          // Broadcast to all users in the same order except sender
          wss.clients.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN) return;

            const receiver = users.get(client);
            if (!receiver || receiver.orderId !== sender.orderId) return;
            if (client === ws) return;

            client.send(
              JSON.stringify({
                type: "locationUpdate",
                lat: data.lat,
                lng: data.lng,
                userId: sender.userId,
                userType: sender.userType,
              })
            );
          });

          return;
        }
      } catch (err) {
        console.log("❌ WS Error:", err);
        ws.send(JSON.stringify({ type: "error", message: err.message }));
      }
    });

    ws.on("close", () => {
      users.delete(ws);
      console.log("🔴 Client disconnected from tracker");
    });
  });
}
