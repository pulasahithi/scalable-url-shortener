const express = require("express");
const router = express.Router();
const pool = require("../db");
const { nanoid } = require("nanoid");

router.post("/shorten", async (req, res) => {
  try {

    const { longUrl } = req.body;

    if (!longUrl) {
      return res.status(400).json({ error: "URL required" });
    }

    const shortCode = nanoid(6);

    await pool.query(
      "INSERT INTO urls(short_code,long_url) VALUES($1,$2)",
      [shortCode, longUrl]
    );

    res.json({
      shortUrl: `http://localhost:5000/${shortCode}`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;