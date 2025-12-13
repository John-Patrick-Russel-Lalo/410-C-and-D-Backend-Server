// GET /kitchen/orders

import express from "express";
import  pool  from "./config/db.js"; // Your PostgreSQL pool
import { authenticate } from "./middleware/auth.js"; // JWT middleware

const router = express.Router();




router.get("/orders", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        o.id, 
        o.item_id, 
        o.quantity, 
        o.status, 
        o.user_id,
        o.created_at,
        m.name, 
        m.price, 
        m.image, 
        m.description,
        u.name AS customer_name,
        u.email AS customer_email
      FROM orders o
      JOIN menu_list m ON o.item_id = m.id
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch ALL kitchen orders:", err);
    res.status(500).json({ error: "Server error fetching kitchen orders" });
  }
});


// PUT /orders/:orderId/assign-driver
router.put("/orders/:orderId/assign-driver", authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    const user = req.user; // Comes from authenticate middleware

    // Only kitchen staff can assign drivers
    if (user.role !== "staff") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if driver exists
    const driverRes = await pool.query("SELECT id, name FROM users WHERE id = $1 AND role = 'driver'", [driverId]);
    if (driverRes.rows.length === 0) {
      return res.status(400).json({ error: "Driver not found" });
    }
    const driver = driverRes.rows[0];

    // Update the order with the driver
    await pool.query(
      "UPDATE orders SET driver_id = $1 WHERE id = $2",
      [driverId, orderId]
    );

    // Return updated info for frontend
    res.json({
      message: `Driver ${driver.name} assigned to order #${orderId}`,
      driverId: driver.id,
      driverName: driver.name,
    });
  } catch (err) {
    console.error("❌ Failed to assign driver:", err);
    res.status(500).json({ error: "Server error assigning driver" });
  }
});

// PUT /kitchen/orders/:id/status
router.put("/orders/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "cooking", "ready", "completed"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const result = await pool.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ error: "Server error updating status" });
  }
});





export default router;
