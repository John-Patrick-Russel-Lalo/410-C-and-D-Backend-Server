import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js"
import path from "path";

import { authenticate } from "../middleware/auth.js";

const router = express.Router();


const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const NODE_ENV = process.env.NODE_ENV || "development";




export const signupUser = async (name, email, hashedPassword) => {
  // Check if email already exists
  const check = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (check.rowCount > 0) {
    throw new Error("Email already registered");
  }

  // Create user
  const result = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'customer') RETURNING id, name, email, role",
    [name, email, hashedPassword]
  );

  return result.rows[0];
};


// Get user by email
export const findUserByEmail = async (email) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
};

// Login logic (only validate user + password)
export const loginUser = async (email, password) => {
  // 1. Get user from DB
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // 2. Compare password
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error("Invalid email or password");
  }

  // RETURN user but WITHOUT password_hash
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
};

// Save refresh token
export const saveRefreshToken = async (userId, token, expiresAt) => {
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt]
  );
};

// export const login = async (email, password, refreshToken) => {
//     try {
//     const result = await pool.query("SELECT * FROM users WHERE email = $1", [
//       email,
//     ]);

//     const user = result.rows[0];
//     const match = await bcrypt.compare(password, user.password_hash);


//     // Save new refresh token in DB with expiry
//     const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day
//     await pool.query(
//       "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
//       [user.id, refreshToken, expiresAt]
//     );
    
//   } catch (err) {
//     console.error(err);
//   }
// }


// export const refresh = async (refreshToken, res) =>{
//     try {
//     // Verify in DB first (including expiry)
//     const stored = await pool.query(
//       "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
//       [refreshToken]
//     );
//     if (stored.rowCount === 0) {
//       return res
//         .status(403)
//         .json({ error: "Invalid or expired refresh token" });
//     }

//     const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

//     // Fetch user to verify existence and get role
//     const userResult = await pool.query(
//       "SELECT id, role FROM users WHERE id = $1",
//       [decoded.userId]
//     );
//     if (userResult.rowCount === 0) {
//       // Cleanup invalid token
//       await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
//         refreshToken,
//       ]);
//       return res.status(403).json({ error: "User not found" });
//     }
//     const user = userResult.rows[0];

//     // DO NOT delete or rotate the refresh token here!
//     // Just issue a new access token

//     const accessToken = jwt.sign(
//       { userId: user.id, role: user.role },
//       JWT_SECRET,
//       { expiresIn: "15m" }
//     );

//     res.json({ accessToken });
//   } catch (err) {
//     console.error(err);
//     if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
//       // Cleanup invalid token
//       pool
//         .query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken])
//         .catch(console.error);
//       return res
//         .status(403)
//         .json({ error: "Invalid or expired refresh token" });
//     }
//     res.status(403).json({ error: "Refresh failed - server error" });
//   }
// }

// --- FIND VALID REFRESH TOKEN ---
export const findValidRefreshToken = async (token) => {
  const result = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
    [token]
  );

  return result.rows[0]; // returns undefined if not found
};

// --- FIND USER BY ID ---
export const findUserById = async (id) => {
  const result = await pool.query(
    "SELECT id, role FROM users WHERE id = $1",
    [id]
  );

  return result.rows[0]; // returns undefined if not found
};

// --- DELETE REFRESH TOKEN ---
export const deleteRefreshToken = async (token) => {
  await pool.query(
    "DELETE FROM refresh_tokens WHERE token = $1",
    [token]
  );
};

export default {
  findUserByEmail,
  loginUser,
  signupUser,
  saveRefreshToken,
  findValidRefreshToken,
  findUserById,
  deleteRefreshToken,
};