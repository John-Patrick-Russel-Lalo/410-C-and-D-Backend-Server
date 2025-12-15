// routes/menuRoutes.js

import express from "express";
import { authenticate } from "../middleware/auth.js";
import * as menuController from "../controllers/menuController.js";

const router = express.Router();

router.get("/items", authenticate, menuController.fetchMenuItems);
router.get("/orders", authenticate, menuController.fetchUserOrders);

export default router;
