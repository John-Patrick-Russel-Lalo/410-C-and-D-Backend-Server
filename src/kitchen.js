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



export default router;
