// controllers/menuController.js
import {
  getAllMenuItems,
  getMenuItemById,
  createOrder,
  getOrdersByUser,
} from "../models/menuModel.js";

// GET /menu/items
export const fetchMenuItems = async (req, res) => {
  try {
    const items = await getAllMenuItems();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
};

// POST /menu/order
export const placeOrder = async (req, res) => {
  const { item_id, quantity } = req.body;
  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid item_id or quantity" });
  }

  try {
    const item = await getMenuItemById(item_id);
    if (!item) return res.status(404).json({ error: "Menu item not found" });

    const order = await createOrder(req.user.userId, item_id, quantity);
    res.json({ order_id: order.order_id, message: "Order placed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
};

// GET /menu/orders
export const fetchUserOrders = async (req, res) => {
  try {
    const orders = await getOrdersByUser(req.user.userId);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
