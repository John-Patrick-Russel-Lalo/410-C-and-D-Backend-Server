
// server/src/drivers.js
import express from "express";
import { pool } from "./db.js"; // Your PostgreSQL pool
import { authenticate } from "./middleware/auth.js"; // JWT middleware

const router = express.Router();

// GET /drivers
router.get("/", authenticate, async (req, res) => {
  try {
    // Optional: Only allow kitchen staff to access
    if (req.user.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch users with role 'driver'
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE role = $1",
      ["driver"]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch drivers:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
