import express from "express";
import jwt from "jsonwebtoken";
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
    const itemResult = await pool.query(
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

// router.post("/placeOrder", authenticate, async (req, res) => {
//   try {
//     const userId = req.user.userId;

//     // 1. Get all cart items for this user
//     const cartItems = await pool.query(
//       "SELECT item_id, quantity FROM cart WHERE user_id = $1",
//       [userId]
//     );

//     if (cartItems.rowCount === 0) {
//       return res.status(400).json({ error: "Cart is empty" });
//     }

//     // 2. Insert each cart item into the orders table
//     const orders = [];
//     for (const item of cartItems.rows) {
//       const result = await pool.query(
//         `INSERT INTO orders (user_id, item_id, quantity, status)
//          VALUES ($1, $2, $3, 'pending')
//          RETURNING id`,
//         [userId, item.item_id, item.quantity]
//       );

//       orders.push(result.rows[0]);
//     }

//     // 3. Clear cart after placing order
//     await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);

//     res.json({
//       message: "Order placed successfully",
//       orders
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to place order" });
//   }
// });

// router.post("/placeOrder", authenticate, async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const { items } = req.body;

//     if (!userId || !Array.isArray(items) || items.length === 0) {
//       console.log(userId, items);
//       return res.status(400).json({ error: "Missing order items" });
//     }

//     // Insert each item as an order
//     const orderResults = [];

//     for (const item of items) {
//       if (!item.id || !item.quantity) continue;

//       const result = await pool.query(
//         `INSERT INTO orders (user_id, item_id, quantity, status, total_price)
//          VALUES ($1, $2, $3, 'pending', $4)
//          RETURNING id`,
//         [userId, item.item_id, item.quantity, item.price * item.quantity]
//       );

//       orderResults.push(result.rows[0]);
//     }

//     res.json({
//       message: "Orders placed!",
//       orders: orderResults,
//     });

//     await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);

//     console.log("BODY RECEIVED:", req.body);
//     console.log("USER FROM TOKEN:", req.user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error placing order" });
//   }
// });

router.post("/placeOrder", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing order items" });
    }

    const orderResults = [];

    for (const item of items) {
      if (!item.menuId || !item.quantity) continue;

      // get price from menu_list
      const menuResult = await pool.query(
        `SELECT price FROM menu_list WHERE id = $1`,
        [item.menuId]
      );

      if (menuResult.rows.length === 0) continue;

      const price = menuResult.rows[0].price;
      const quantity = Number(item.quantity);

      const result = await pool.query(
        `INSERT INTO orders (user_id, item_id, quantity, status, total_price)
     VALUES ($1, $2, $3, 'pending', $4)
     RETURNING id`,
        [userId, item.menuId, quantity, price * quantity]
      );

      orderResults.push(result.rows[0]);
    }

    res.json({
      message: "Orders placed!",
      orders: orderResults,
    });

    await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error placing order" });
  }
});

router.get("/orders", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Query orders and join with menu items to get name, price, image, description
    const result = await pool.query(
      `
      SELECT o.id, o.item_id, o.quantity, o.status, 
             m.name, m.price, m.image, m.description
      FROM orders o
      JOIN menu_list m ON o.item_id = m.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    res.status(500).json({ error: "Server error fetching orders" });
  }
});

router.post("/updateQuantity", authenticate, async (req, res) => {
  try {
    const { id, quantity } = req.body;
    const userId = req.user.userId;

    await pool.query(
      "UPDATE cart SET quantity = $1 WHERE user_id = $2 AND item_id = $3",
      [quantity, userId, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update quantity" });
  }
});

router.post("/removeCart", authenticate, async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Invalid item_id" });
  }

  try {
    const deleteResult = await pool.query(
      "DELETE FROM cart WHERE user_id = $1 AND id = $2 RETURNING id",
      [req.user.userId, id]
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
});

router.get("/carts", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        c.id,
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
    `,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});

export default router;
