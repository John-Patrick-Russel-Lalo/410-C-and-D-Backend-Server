import express from "express"
import jwt from "jsonwebtoken"
import pool from "./config/db.js"
const router = express.Router();


const JWT_SECRET = process.env.JWT_SECRET;
import { authenticate } from "./middleware/auth.js"


// GET /menu/items - Fetch all menu items
router.get("/items", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, category, meat, name, price, size, available, description, perkilos, estimatedtime, image FROM menu_list"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// POST /menu/order - Place an order
router.post("/order", authenticate, async (req, res) => {
  const { item_id, quantity } = req.body;
  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid item_id or quantity" });
  }

  try {
    // Check if item exists
    const itemResult = await pool.query(
      "SELECT * FROM menu_list WHERE id = $1",
      [item_id]
    );
    if (itemResult.rowCount === 0) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const orderResult = await pool.query(
      "INSERT INTO orders (user_id, item_id, quantity, status) VALUES ($1, $2, $3, 'pending') RETURNING order_id",
      [req.user.userId, item_id, quantity]
    );

    res.json({
      order_id: orderResult.rows[0].order_id,
      message: "Order placed successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
});





// GET /menu/orders - Fetch user's orders (optional, for viewing orders)
router.get("/orders", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT o.id, o.quantity, o.status, o.created_at, m.name, m.price FROM orders o JOIN menu_items m ON o.item_id = m.id WHERE o.user_id = $1 ORDER BY o.created_at DESC",
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router
