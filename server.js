import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { initWebSocket } from "./src/websocket.js";
import { cleanUpDatabase } from "./src/cleanup.js";
import authRouter from "./src/logAuth.js";

import userRouter from "./src/user.js";
import menuRouter from "./src/menu.js";
import cartRouter from "./src/cart.js";


import authRoutes from "./src/routes/authRoutes.js";
import menuRoutes from "./src/routes/menuRoutes.js";


const app = express();
app.use(express.json());
const server = http.createServer(app);

// CORS Config
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.195.217/",
  "http://localhost:5501",
  "http://127.0.0.1:5501"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps) or matching origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Required for cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

import cookieParser from "cookie-parser";
app.use(cookieParser());

// app.use( authRouter);
app.use(authRoutes);
app.use("/menu", menuRoutes)

initWebSocket(server);
cleanUpDatabase();

// app.use("/menu", menuRouter);
app.use("/images", express.static("./src/pictures"));
app.use("/cart", cartRouter);

const PORT = process.env.PORT
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
