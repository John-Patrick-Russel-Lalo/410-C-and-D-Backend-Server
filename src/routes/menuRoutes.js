// routes/menuRoutes.js
import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  fetchMenuItems,
  placeOrder,
  fetchUserOrders,
} from "../controllers/menuController.js";

const router = express.Router();

router.get("/items", authenticate, fetchMenuItems);
router.post("/order", authenticate, placeOrder);
router.get("/orders", authenticate, fetchUserOrders);

export default router;
