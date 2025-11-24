// inject-csv.js
require("dotenv").config();
const fs = require("fs");
const { Pool } = require("pg");
const csv = require("csv-parser");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// EDIT THIS: set your table name + columns
const tableName = "menu_list";
const columns = ["Category", "Meat", "Name", "Price", "Size", "Available", "Description", "PerKilos", "EstimatedTime"]; // must match CSV headers

async function insertRow(row) {
  const values = columns.map((col) => row[col]); // auto-map CSV → DB

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  const query = `
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES (${placeholders})
  `;

  await pool.query(query, values);
}

async function importCSV(path) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          console.log("Starting import...");

          for (const row of results) {
            await insertRow(row);
          }

          console.log("CSV import completed!");
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          pool.end();
        }
      });
  });
}

// RUN SCRIPT
importCSV("src/Menulist.csv") // <-- change path to your CSV
  .catch((err) => console.error("Import failed:", err));

