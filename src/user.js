import express from "express";
import jwt from "jsonwebtoken";
import pool from "./config/db.js";
import { authenticate } from "./middleware/auth.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.get("/user/details", authenticate, async (req, res) => {
  try {
    const [result] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.userId]
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/delivery", authenticate, async (req, res) => {
  try {
    const { orderId, deliveryTime } = req.body;
    const [result] = await pool.query(
      "UPDATE orders SET status = 'delivered', delivery_time = ? WHERE order_id = ?",
      [deliveryTime, orderId]
    );
    res.json({ message: "Delivery updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;