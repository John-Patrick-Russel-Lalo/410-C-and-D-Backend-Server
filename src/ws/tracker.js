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

// import { WebSocketServer } from "ws";
// import jwt from "jsonwebtoken";
// import pool from "../config/db.js"; // your pg pool

// const clients = new Map(); // orderId -> { customer, driver }

// export function initTrackerWS(server) {
//   const wss = new WebSocketServer({ server, path: "/tracker" });

//   wss.on("connection", (ws, req) => {
//     ws.user = null;

//     // On connection
//     ws.on("message", async (msg) => {
//       const data = JSON.parse(msg);

//       // -------------------------
//       // REGISTER USER
//       // -------------------------
//       if (data.type === "register") {
//         const { userType, userId } = data;

//         if (userType === "driver") {
//           driverConnections.set(userId, ws);
//           // fetch all orders assigned to this driver
//           const res = await pool.query(
//             "SELECT id, user_id FROM orders WHERE driver_id = $1 AND status = 'assigned'",
//             [userId]
//           );
//           res.rows.forEach((order) => orderToDriver.set(order.id, userId));
//         } else if (userType === "customer") {
//           customerConnections.set(userId, ws);
//           // fetch all active orders for this customer
//           const res = await pool.query(
//             "SELECT id, driver_id FROM orders WHERE user_id = $1 AND status = 'assigned'",
//             [userId]
//           );
//           res.rows.forEach((order) => {
//             // nothing to store yet; we'll send updates when driver updates location
//           });
//         }

//         ws.user = { userType, userId };
//         console.log(`🟢 ${userType} connected: ${userId}`);
//       }

//       // -------------------------
//       // DRIVER GPS UPDATE
//       // -------------------------
//       if (data.type === "location" && ws.user.userType === "driver") {
//         const driverId = ws.user.userId;
//         const lat = data.lat;
//         const lng = data.lng;

//         // find all orders assigned to this driver
//         const res = await pool.query(
//           "SELECT id, user_id FROM orders WHERE driver_id = $1 AND status = 'assigned'",
//           [driverId]
//         );

//         res.rows.forEach((order) => {
//           const customerWs = customerConnections.get(order.user_id);
//           if (customerWs && customerWs.readyState === 1) {
//             customerWs.send(
//               JSON.stringify({
//                 type: "locationUpdate",
//                 driverId,
//                 orderId: order.id,
//                 lat,
//                 lng,
//               })
//             );
//           }
//         });
//       }
//     });

//     ws.on("close", (code, reason) => {
//       if (!ws.user) return;

//       const { orderId, userType } = ws.user;
//       const room = clients.get(orderId);

//       if (room) {
//         delete room[userType];
//         if (Object.keys(room).length === 0) {
//           clients.delete(orderId);
//         }
//       }

//       console.log(
//         `🔴 ${userType} disconnected from order #${orderId}. Code: ${code}, Reason: ${reason}`
//       );
//     });

//     ws.on("error", (err) => {
//       console.error("WS connection error:", err);
//     });
//   });

//   console.log("🚀 Tracker WebSocket running at /tracker");
// }



import { WebSocketServer } from "ws";
import pool from "../config/db.js";

const driverConnections = new Map();   // driverId -> ws
const customerConnections = new Map(); // customerId -> ws
const orderToDriver = new Map();       // orderId -> driverId

export function initTrackerWS(server) {
  const wss = new WebSocketServer({ server, path: "/tracker" });

  wss.on("connection", (ws) => {
    ws.user = null;

    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch {
        ws.close(4000, "Invalid JSON");
        return;
      }

      // -------------------------
      // REGISTER USER
      // -------------------------
      if (data.type === "register") {
        const { userType, userId } = data;

        if (userType === "driver") {
          driverConnections.set(userId, ws);
          const res = await pool.query(
            "SELECT id, user_id FROM orders WHERE driver_id = $1 AND status = 'assigned'",
            [userId]
          );
          res.rows.forEach((order) => orderToDriver.set(order.id, userId));
        } else if (userType === "customer") {
          customerConnections.set(userId, ws);
        }

        ws.user = { userType, userId };
        console.log(`🟢 ${userType} connected: ${userId}`);
      }

      // -------------------------
      // DRIVER GPS UPDATE
      // -------------------------
      if (data.type === "location" && ws.user.userType === "driver") {
        const driverId = ws.user.userId;
        const { lat, lng } = data;

        const res = await pool.query(
          "SELECT id, user_id FROM orders WHERE driver_id = $1 AND status = 'assigned'",
          [driverId]
        );

        res.rows.forEach((order) => {
          const customerWs = customerConnections.get(order.user_id);
          if (customerWs && customerWs.readyState === 1) {
            customerWs.send(
              JSON.stringify({
                type: "locationUpdate",
                driverId,
                orderId: order.id,
                lat,
                lng,
              })
            );
          }
        });
      }
    });

    ws.on("close", (code, reason) => {
      if (!ws.user) return;
      const { userType, userId } = ws.user;

      driverConnections.delete(userType === "driver" ? userId : undefined);
      customerConnections.delete(userType === "customer" ? userId : undefined);

      console.log(`🔴 ${userType} disconnected: ${userId}. Code: ${code}, Reason: ${reason}`);
    });

    ws.on("error", (err) => {
      console.error("WS connection error:", err);
    });
  });

  console.log("🚀 Tracker WebSocket running at /tracker");
}
