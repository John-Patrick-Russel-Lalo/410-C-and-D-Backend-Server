// import { WebSocketServer } from "ws";
// import jwt from "jsonwebtoken";
// import pool from "../config/db.js"; // your pg pool

// const clients = new Map(); // orderId -> { customer, driver }

// export function initTrackerWS(server) {
//   const wss = new WebSocketServer({ server, path: "/tracker" });

//   wss.on("connection", (ws, req) => {
//     ws.user = null;

//     ws.on("message", async (msg) => {
//       try {
//         const data = JSON.parse(msg);

//         // -------------------------
//         // REGISTER USER
//         // -------------------------
//         if (data.type === "register") {
//           const { userType, userId, orderId } = data;

//           // Validate order
//           const orderRes = await pool.query(
//             "SELECT status, driver_id, user_id FROM orders WHERE id = $1",
//             [orderId]
//           );

//           if (orderRes.rows.length === 0) {
//             ws.close();
//             return;
//           }

//           const order = orderRes.rows[0];

//           // Role-based permission
//           if (userType === "customer" && order.user_id !== userId) {
//             ws.close();
//             return;
//           }

//           if (userType === "driver" && order.driver_id !== userId) {
//             ws.close();
//             return;
//           }

//           // Store connection
//           if (!clients.has(orderId)) {
//             clients.set(orderId, {});
//           }

//           clients.get(orderId)[userType] = ws;

//           ws.user = { userType, userId, orderId };

//           console.log(`🟢 ${userType} connected for order #${orderId}`);
//         }

//         // -------------------------
//         // DRIVER GPS UPDATE
//         // -------------------------
//         if (data.type === "location" && ws.user?.userType === "driver") {
//           const { lat, lng } = data;
//           const { orderId } = ws.user;

//           // Check order status
//           const statusRes = await pool.query(
//             "SELECT status FROM orders WHERE id = $1",
//             [orderId]
//           );

//           if (statusRes.rows[0]?.status !== "assigned") return;

//           const room = clients.get(orderId);
//           if (room?.customer) {
//             room.customer.send(
//               JSON.stringify({
//                 type: "locationUpdate",
//                 userType: "driver",
//                 lat,
//                 lng
//               })
//             );
//           }
//         }
//       } catch (err) {
//         console.error("WS error:", err);
//       }
//     });

//     ws.on("close", () => {
//       if (!ws.user) return;

//       const { orderId, userType } = ws.user;
//       const room = clients.get(orderId);

//       if (room) {
//         delete room[userType];
//         if (Object.keys(room).length === 0) {
//           clients.delete(orderId);
//         }
//       }

//       console.log(`🔴 ${userType} disconnected from order #${orderId}`);
//     });
//   });

//   console.log("🚀 Tracker WebSocket running at /tracker");
// }




import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import pool from "../config/db.js"; // your pg pool

const clients = new Map(); // orderId -> { customer, driver }

export function initTrackerWS(server) {
  const wss = new WebSocketServer({ server, path: "/tracker" });

  wss.on("connection", (ws, req) => {
    ws.user = null;

    ws.on("message", async (msg) => {
      try {
        let data;
        try {
          data = JSON.parse(msg);
        } catch (parseErr) {
          console.error("WS JSON parse error:", parseErr);
          ws.close(4000, "Invalid JSON");
          return;
        }

        // -------------------------
        // REGISTER USER
        // -------------------------
        if (data.type === "register") {
          const { userType, userId, orderId } = data;

          // Validate order
          const orderRes = await pool.query(
            "SELECT status, driver_id, user_id FROM orders WHERE id = $1",
            [orderId]
          );

          if (orderRes.rows.length === 0) {
            ws.close(4001, "Order not found");
            return;
          }

          const order = orderRes.rows[0];

          // Role-based permission
          // if (userType === "customer" && order.user_id !== userId) {
          //   ws.close(4002, "Customer not assigned to this order");
          //   return;
          // }

          // if (userType === "driver" && order.driver_id !== userId) {
          //   ws.close(4003, "Driver not assigned to this order");
          //   return;
          // }

          // Store connection
          if (!clients.has(orderId)) {
            clients.set(orderId, {});
          }

          clients.get(orderId)[userType] = ws;
          ws.user = { userType, userId, orderId };

          console.log(`🟢 ${userType} connected for order #${orderId}`);
        }

        // -------------------------
        // DRIVER GPS UPDATE
        // -------------------------
        if (data.type === "location" && ws.user?.userType === "driver") {
          const { lat, lng } = data;
          const { orderId } = ws.user;

          // Check order status
          const statusRes = await pool.query(
            "SELECT status FROM orders WHERE id = $1",
            [orderId]
          );

          if (statusRes.rows[0]?.status !== "assigned") {
            ws.send(JSON.stringify({ type: "error", message: "Order not assigned" }));
            return;
          }

          const room = clients.get(orderId);
          if (room?.customer) {
            room.customer.send(
              JSON.stringify({
                type: "locationUpdate",
                userType: "driver",
                lat,
                lng
              })
            );
          }
        }
      } catch (err) {
        console.error("WS unexpected error:", err);
        ws.close(1011, "Internal server error"); // 1011 = server error
      }
    });

    ws.on("close", (code, reason) => {
      if (!ws.user) return;

      const { orderId, userType } = ws.user;
      const room = clients.get(orderId);

      if (room) {
        delete room[userType];
        if (Object.keys(room).length === 0) {
          clients.delete(orderId);
        }
      }

      console.log(`🔴 ${userType} disconnected from order #${orderId}. Code: ${code}, Reason: ${reason}`);
    });

    ws.on("error", (err) => {
      console.error("WS connection error:", err);
    });
  });

  console.log("🚀 Tracker WebSocket running at /tracker");
}
