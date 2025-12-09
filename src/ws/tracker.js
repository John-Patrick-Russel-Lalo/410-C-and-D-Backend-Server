import { WebSocketServer } from "ws";

const users = new Map(); 
// Structure:
// users.set(socket, {
//   userId,
//   userType,
//   orderId,
//   shareLocation: true/false
// });

export function initTrackerWS(server) {
  const wss = new WebSocketServer({ server, path: "/tracker" });

  console.log("🚀 Tracker WebSocket active");

  wss.on("connection", (ws) => {
    console.log("🟢 Client connected to tracker");

    // Default profile for client
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
        // 1. USER REGISTERS
        // ---------------------------------
        if (data.type === "register") {
          users.set(ws, {
            userId: data.userId,
            userType: data.userType,
            orderId: data.orderId,
            shareLocation: true,
          });

          console.log(`📌 ${data.userType} ${data.userId} joined order ${data.orderId}`);
          return;
        }

        // ---------------------------------
        // 2. DRIVER TOGGLES PRIVACY
        // ---------------------------------
        if (data.type === "toggleShare") {
          const user = users.get(ws);
          user.shareLocation = data.shareLocation;
          users.set(ws, user);

          console.log(`🔒 Driver ${user.userId} shareLocation: ${user.shareLocation}`);
          return;
        }

        // ---------------------------------
        // 3. LOCATION UPDATE
        // ---------------------------------
        if (data.type === "location") {
          const sender = users.get(ws);
          if (!sender || !sender.orderId) return;

          // Don't broadcast if sender is driver with disabled sharing
          if (sender.userType === "driver" && sender.shareLocation === false) return;

          // Broadcast only to people with same orderId
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              const receiver = users.get(client);

              if (!receiver) return;

              // Only to same order
              if (receiver.orderId !== sender.orderId) return;

              // Don't send back to itself
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
            }
          });

          return;
        }
      } catch (err) {
        console.log("❌ WS Error:", err);
      }
    });

    ws.on("close", () => {
      users.delete(ws);
      console.log("🔴 Client disconnected from tracker");
    });
  });
}
