import { WebSocketServer } from "ws";

export function initTrackerWS(server) {
  const wss = new WebSocketServer({ server, path: "/tracker" });

  // Store connected users
  const clients = {
    customers: new Map(), // userId → ws
    drivers: new Map(),
  };

  const broadcast = (data, targetGroup) => {
    const group = clients[targetGroup];
    if (!group) return;

    const message = JSON.stringify(data);

    for (const [_, ws] of group) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  };

  wss.on("connection", (ws) => {
    console.log("📡 New socket connected to /tracker");

    let userType = null;
    let userId = null;

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);

        // First message → register client
        if (data.type === "register") {
          userType = data.userType; // "customer" or "driver"
          userId = data.userId;

          if (userType === "customer") {
            clients.customers.set(userId, ws);
          } else if (userType === "driver") {
            clients.drivers.set(userId, ws);
          }

          console.log(`🟢 Registered ${userType}: ${userId}`);
          return;
        }

        // Handle GPS update
        if (data.type === "location") {
          if (!userType || !userId) return;

          const payload = {
            type: "locationUpdate",
            userType,
            userId,
            lat: data.lat,
            lng: data.lng,
            timestamp: Date.now(),
          };

          // Drivers → broadcast to all customers
          if (userType === "driver") {
            broadcast(payload, "customers");
          }

          // Customers → broadcast to all drivers
          if (userType === "customer") {
            broadcast(payload, "drivers");
          }
        }
      } catch (err) {
        console.error("Invalid WS message:", err);
      }
    });

    ws.on("close", () => {
      if (userType && userId) {
        if (userType === "customer") clients.customers.delete(userId);
        if (userType === "driver") clients.drivers.delete(userId);

        console.log(`🔴 Disconnected ${userType}: ${userId}`);
      }
    });
  });

  console.log("🚀 Tracker WebSocket initialized at ws://localhost:PORT/tracker");
}
