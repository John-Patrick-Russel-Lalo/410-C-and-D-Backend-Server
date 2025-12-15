import express from "express";
import pool from "../config/db.js";
import { authenticate } from "../middleware/auth.js"; // if you have auth

const router = express.Router();

// PUT /driver/orders/:orderId/start
router.put("/orders/:orderId/start", authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    if (user.role !== "driver") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check the order exists and belongs to this driver
    const orderRes = await pool.query(
      "SELECT id, status FROM orders WHERE id = $1 AND driver_id = $2",
      [orderId, user.id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found or not assigned to you" });
    }

    if (orderRes.rows[0].status !== "assigned") {
      return res.status(400).json({ error: `Order is already ${orderRes.rows[0].status}` });
    }

    // Update status to delivering
    const updateRes = await pool.query(
      "UPDATE orders SET status = 'delivering' WHERE id = $1 RETURNING *",
      [orderId]
    );

    const updatedOrder = updateRes.rows[0];

    // Return the updated order
    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error("Start delivery error:", err);
    res.status(500).json({ error: "Server error starting delivery" });
  }
});

export default router;
