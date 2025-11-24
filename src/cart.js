import express from "express";
import jwt from "jsonwebtoken"
const router = express.Router();
import pool from "./config/db.js";
const JWT_SECRET = process.env.JWT_SECRET;
import { authenticate } from "./middleware/auth.js";


// POST /menu/order - Place an order
router.post("/addToCart", authenticate, async (req, res) => {
  const { item_id, quantity } = req.body;
  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid item_id or quantity" });
  }

  try {
    // Check if item exists
    const itemResult = await query(
      "SELECT * FROM menu_list WHERE id = $1",
      [item_id]
    );
    if (itemResult.rowCount === 0) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const orderResult = await pool.query(
      "INSERT INTO cart (user_id, item_id, quantity) VALUES ($1, $2, $3) RETURNING id",
      [req.user.userId, item_id, quantity]
    );

    res.json({
      id: orderResult.rows[0].id,
      message: "Cart placed successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

router.post("/removeCart", authenticate, async (req, res) => {
    const { item_id } = req.body;
    if (!item_id) {
        return res.status(400).json({ error: "Invalid item_id" });
    }

    try {
        const deleteResult = await pool.query(
            "DELETE FROM cart WHERE user_id = $1 AND item_id = $2 RETURNING id",
            [req.user.userId, item_id]
        );
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: "Cart item not found" });
        }
        res.json({
            id: deleteResult.rows[0].id,
            message: "Cart item removed successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove cart item" });
    }
})

router.get("/carts", authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.item_id,
        c.quantity,
        m.name,
        m.price,
        m.description,
        m.image,
        m.category
      FROM cart c
      JOIN menu_list m ON c.item_id = m.id
      WHERE c.user_id = $1
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});


export default router
