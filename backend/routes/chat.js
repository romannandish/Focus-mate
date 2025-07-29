const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");

// GET last 5 chats
router.get("/", async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 }).limit(5);
    res.json(chats);
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST new chat
router.post("/", async (req, res) => {
  try {
    const { prompt, response } = req.body;
    const newChat = new Chat({ prompt, response });
    await newChat.save();
    res.status(201).json(newChat);
  } catch (err) {
    console.error("Error saving chat:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
