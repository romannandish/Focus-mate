const express = require("express");
const router = express.Router();
const axios = require("axios");

const Journal = require("../models/Journal");

// POST /api/journal
router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Journal text is required" });
    }

    const summaryResponse = await axios.post(
      "https://api.cohere.ai/v1/generate",
      {
        model: "command-r-plus",
        prompt: `Summarize this personal journal entry: ${text}`,
        max_tokens: 100,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`, // your key
          "Content-Type": "application/json",
        },
      }
    );

    const summary = summaryResponse.data.generations[0].text.trim();

    const journal = new Journal({
      text,
      summary,
      date: new Date(),
    });

    await journal.save();
    res.status(201).json(journal);
  } catch (err) {
    console.error("Error saving journal:", err.message);
    res.status(500).json({ error: "Failed to create journal" });
  }
});

// GET /api/journal
router.get("/", async (req, res) => {
  try {
    const journals = await Journal.find().sort({ date: -1 });
    res.json(journals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch journals" });
  }
});

module.exports = router;
