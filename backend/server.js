const express = require("express");
const cors = require("cors");
const pool = require("./db");
const redisClient = require("./redisClient");
const urlRoutes = require("./routes/urlRoutes");

const app = express();

app.use(cors());
app.use(express.json());

/*
===============================
SHORTEN URL ROUTES
===============================
*/
app.use("/api", urlRoutes);


/*
===============================
REDIRECT SHORT URL
===============================
*/
app.get("/:code", async (req, res) => {

  const code = req.params.code;

  try {

    // Check Redis cache
    const cachedUrl = await redisClient.get(code);

    if (cachedUrl) {

      await pool.query(
        "UPDATE urls SET clicks = clicks + 1 WHERE short_code=$1",
        [code]
      );

      return res.redirect(cachedUrl);
    }

    // Fetch from database
    const result = await pool.query(
      "SELECT long_url FROM urls WHERE short_code=$1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("URL not found");
    }

    const longUrl = result.rows[0].long_url;

    // Store in Redis
    await redisClient.set(code, longUrl);

    // Increase clicks
    await pool.query(
      "UPDATE urls SET clicks = clicks + 1 WHERE short_code=$1",
      [code]
    );

    res.redirect(longUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }

});


/*
===============================
CLICK ANALYTICS
===============================
*/
app.get("/api/stats/:code", async (req, res) => {

  const code = req.params.code;

  try {

    const result = await pool.query(
      "SELECT short_code,long_url,clicks FROM urls WHERE short_code=$1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "URL not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

});


/*
===============================
URL HISTORY
===============================
*/
app.get("/api/urls", async (req, res) => {

  try {

    const result = await pool.query(
      "SELECT short_code,long_url,clicks FROM urls ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

});


/*
===============================
START SERVER
===============================
*/
app.listen(5000, () => {
  console.log("Server running on port 5000");
});