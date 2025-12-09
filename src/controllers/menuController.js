// controllers/menuController.js
import * as menuModel from "../models/menuModel.js";

// GET /menu/items
export const fetchMenuItems = async (req, res) => {
  try {
    const items = await menuModel.getAllMenuItems();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
};


// GET /menu/orders
export const fetchUserOrders = async (req, res) => {
  try {
    const orders = await menuModel.getOrdersByUser(req.user.userId);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

