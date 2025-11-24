// src/routes/picture.js
import express from "express"
const path = require("path");
const router = express.Router();

// Supports nested paths like milkshake/biscoff.png
router.get("/*", (req, res) => {
  const filePath = req.params[0]; // the entire nested path
  const imagePath = path.join(__dirname, "../../uploads/menu/", filePath);

  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error("Image not found:", filePath);
      res.status(404).json({ error: "Image not found" });
    }
  });
});

export default router
