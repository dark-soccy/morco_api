require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db");
const multer = require("multer"); // For parsing form-data

const app = express();
app.use(cors());
app.use(bodyParser.json());

const authenticate = require("./auth");
const { productPayloadSchema, filterSchema } = require("./validation");

// Require API key for all endpoints.
app.use(authenticate);

// Initialize multer. .none() means we are only accepting text fields.
const upload = multer();

/* -------------------------
   INSERT PRODUCT (POST)
--------------------------*/
app.post("/products", upload.none(), async (req, res) => {
  let payload = req.body && req.body.products ? req.body.products : req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      // Keep original payload so Joi returns a clear validation message.
    }
  }

  const { error } = productPayloadSchema.validate(payload);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const products = Array.isArray(payload) ? payload : [payload];

  try {
    const insertedIds = [];
    let affectedRows = 0;

    const sql = `
      INSERT INTO products (name, category, color, size, image_url, price)
      VALUES (?, ?, ?, ?, ?, ?);
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS insertId;
    `;

    for (const product of products) {
      const [rows, result] = await db.query(sql, [
        product.name,
        product.category,
        product.color,
        product.size,
        product.image_url,
        product.price,
      ]);

      insertedIds.push(rows[0]?.insertId || null);
      affectedRows += result.rowsAffected?.[0] || 0;
    }

    if (products.length === 1) {
      return res.json({
        message: "Product added successfully",
        productId: insertedIds[0],
        affectedRows,
      });
    }

    return res.json({
      message: "Products added successfully",
      productIds: insertedIds,
      totalInserted: affectedRows,
    });
  } catch (err) {
    console.error("Error in POST /products:", err);
    res.status(500).json({
      message: "An unexpected error occurred.",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

/* -------------------------
   FILTER PRODUCTS (GET)
--------------------------*/
app.get("/products", async (req, res) => {
  const { error } = filterSchema.validate(req.query);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { category, color, size } = req.query;

  let sql = "SELECT * FROM products WHERE 1=1";
  let params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (color) {
    sql += " AND color = ?";
    params.push(color);
  }

  if (size) {
    sql += " AND size = ?";
    params.push(size);
  }

  try {
    const [results] = await db.query(sql, params);
    res.json(results);
  } catch (err) {
    console.error("Error in GET /products:", err);
    res.status(500).json({
      message: "An unexpected error occurred.",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
});

const port = Number.parseInt(process.env.PORT || "3000", 10);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
