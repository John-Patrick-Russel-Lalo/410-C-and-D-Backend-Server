import express from "express"
import jwt from "jsonwebtoken"
import pool from "./config/db.js"
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
import { authenticate } from "./middleware/auth.js";

// Get details of the logged-in user
router.get("/user/details", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Example: Get driver's name (for future use)
router.get("/user/driver/:driverId", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM users WHERE id = $1 AND role = 'driver'",
      [req.params.driverId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;