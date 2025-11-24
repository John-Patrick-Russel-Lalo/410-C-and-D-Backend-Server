// models/menuModel.js
import pool from "../config/db.js";

// Fetch all menu items
export const getAllMenuItems = async () => {
  const result = await pool.query(
    `SELECT id, category, meat, name, price, size, available, description, perkilos, estimatedtime, image 
     FROM menu_list`
  );
  return result.rows;
};

// Fetch single menu item by ID
export const getMenuItemById = async (id) => {
  const result = await pool.query("SELECT * FROM menu_list WHERE id = $1", [id]);
  return result.rows[0];
};

// Place a new order
export const createOrder = async (userId, itemId, quantity) => {
  const result = await pool.query(
    "INSERT INTO orders (user_id, item_id, quantity, status) VALUES ($1, $2, $3, 'pending') RETURNING order_id",
    [userId, itemId, quantity]
  );
  return result.rows[0];
};

// Fetch orders for a specific user
export const getOrdersByUser = async (userId) => {
  const result = await pool.query(
    `SELECT o.id, o.quantity, o.status, o.created_at, m.name, m.price
     FROM orders o
     JOIN menu_items m ON o.item_id = m.id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
};
