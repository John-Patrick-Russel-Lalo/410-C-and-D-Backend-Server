import * as userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const NODE_ENV = process.env.NODE_ENV || "development";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await userModel.signupUser(name, email, hashedPassword);

    // Create access + refresh tokens
    const { accessToken, refreshToken } = createTokens(user);

    // Save refresh token to DB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await userModel.saveRefreshToken(user.id, refreshToken, expiresAt);

    // Set refresh cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return access token
    res.json({
      message: "Signup successful",
      accessToken,
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed - server error" });
  }
};

function createTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: "1d" }
  );

  return { accessToken, refreshToken };
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 1. Get user from DB using model
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 2. Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 3. Generate access + refresh tokens
    const { accessToken, refreshToken } = createTokens(user);

    // 4. Save refresh token to DB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    await userModel.saveRefreshToken(user.id, refreshToken, expiresAt);

    // 5. Set cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 6. Respond once
    res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed - server error" });
  }
};


// export const refresh = async (req, res) => {
//     try {
//         const refreshToken = req.cookies.refreshToken;
//         if (refreshToken) {
//             await userModel.refresh(refreshToken, res);
//         }
//         res.clearCookie("refreshToken", {
//             httpOnly: true,
//             secure: true,
//             sameSite: "none",
//         });
//         res.json({ message: "Logged out successfully" });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Logout failed - server error" });
//     }
// };

export const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    // 1. Validate refresh token from DB
    const stored = await userModel.findValidRefreshToken(refreshToken);
    if (!stored) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    // 2. Decode JWT refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    // 3. Get user from DB
    const user = await userModel.findUserById(decoded.userId);

    if (!user) {
      await userModel.deleteRefreshToken(refreshToken);
      return res.status(403).json({ error: "User not found" });
    }

    // 4. Create new access token
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken });

  } catch (err) {
    console.error("Refresh Error:", err);

    // Clean up invalid token
    await userModel.deleteRefreshToken(refreshToken).catch(() => {});

    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    // Delete the refresh token from database
    if (refreshToken) {
      await userModel.deleteRefreshToken(refreshToken);
    }
  } catch (err) {
    console.error("Logout DB error:", err);
  }

  // Clear cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return res.json({ message: "Logged out successfully" });
};
