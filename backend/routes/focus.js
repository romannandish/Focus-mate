const express = require("express");
const router = express.Router();
const FocusSession = require("../models/FocusSession");
require("dotenv").config();

// POST /api/focus/stop
router.post("/stop", async (req, res) => {
  try {
    const { startTime, endTime, distractionTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "startTime and endTime required" });
    }

    const duration = (new Date(endTime) - new Date(startTime)) / 1000; // seconds

    const session = new FocusSession({
      startTime,
      endTime,
      duration,
      distractionTime: distractionTime || 0,
    });

    await session.save();
    res.status(201).json({ message: "Session saved", session });
  } catch (error) {
    console.error("Error saving session:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/today
router.get("/today", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sessions = await FocusSession.find({ startTime: { $gte: startOfDay } });

    const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalDistractionSeconds = sessions.reduce((sum, s) => sum + (s.distractionTime || 0), 0);

    res.json({ totalSeconds, totalDistractionSeconds });
  } catch (error) {
    console.error("Error fetching today's sessions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/streak
router.get("/streak", async (req, res) => {
  try {
    const sessions = await FocusSession.find().sort({ startTime: -1 });
    const days = new Set(sessions.map(s => s.startTime.toISOString().split("T")[0]));

    let streak = 0;
    let date = new Date();

    while (days.has(date.toISOString().split("T")[0])) {
      streak++;
      date.setDate(date.getDate() - 1);
    }

    res.json({ streak });
  } catch (error) {
    console.error("Error fetching streak:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/last-sessions
router.get("/last-sessions", async (req, res) => {
  try {
    const sessions = await FocusSession.find().sort({ endTime: -1 }).limit(7);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching last sessions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/last
router.get("/last", async (req, res) => {
  try {
    const lastSession = await FocusSession.findOne().sort({ endTime: -1 });
    if (!lastSession) return res.status(404).json({ message: "No session found" });

    const duration = Math.round((new Date(lastSession.endTime) - new Date(lastSession.startTime)) / 60_000);

    res.json({
      startTime: lastSession.startTime,
      endTime: lastSession.endTime,
      duration,
      distractionTime: lastSession.distractionTime || 0,
    });
  } catch (err) {
    console.error("Error fetching last session:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ UPDATED: GET /api/focus/daily-summary — now returns seconds
router.get("/daily-summary", async (req, res) => {
  try {
    const daysBack = parseInt(req.query.days || 30); // default to 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const sessions = await FocusSession.find({ startTime: { $gte: startDate } });

    const dailyMap = {};

    sessions.forEach((s) => {
      const dateKey = s.startTime.toISOString().split("T")[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = 0;
      dailyMap[dateKey] += s.duration; // already in seconds
    });

    const result = Object.entries(dailyMap).map(([date, focusSeconds]) => ({
      date,
      focusSeconds: Math.round(focusSeconds),
    }));

    res.json(result);
  } catch (err) {
    console.error("Error in /daily-summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/heatmap
router.get("/heatmap", async (req, res) => {
  try {
    const daysBack = 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const sessions = await FocusSession.find({ startTime: { $gte: startDate } });

    const map = {};
    sessions.forEach((s) => {
      const dateKey = s.startTime.toISOString().split("T")[0];
      if (!map[dateKey]) map[dateKey] = 0;
      map[dateKey] += s.duration;
    });

    const result = Object.entries(map).map(([date, count]) => ({ date, count }));
    res.json(result);
  } catch (err) {
    console.error("Error in /heatmap:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/distractions-summary
router.get("/distractions-summary", async (req, res) => {
  try {
    const sessions = await FocusSession.find();

    const totalDistraction = sessions.reduce((sum, s) => sum + (s.distractionTime || 0), 0);
    const focusedTime = sessions.reduce((sum, s) => sum + s.duration, 0);

    res.json({ totalDistraction, focusedTime });
  } catch (err) {
    console.error("Error in /distractions-summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/insights/peak
router.get("/insights/peak", async (req, res) => {
  try {
    const sessions = await FocusSession.find();

    const hourMap = new Array(24).fill(0);
    sessions.forEach((s) => {
      const hour = new Date(s.startTime).getHours();
      hourMap[hour] += s.duration;
    });

    const peakHour = hourMap.indexOf(Math.max(...hourMap));
    res.json({ peakHour, peakRange: `${peakHour}:00 - ${peakHour + 1}:00` });
  } catch (err) {
    console.error("Error in /insights/peak:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/last-7-days
router.get("/last-7-days", async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);

    const sessions = await FocusSession.find({ startTime: { $gte: startDate } });

    const dayMap = {};
    sessions.forEach((s) => {
      const dateKey = s.startTime.toISOString().split("T")[0];
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { totalDuration: 0, totalDistraction: 0 };
      }
      dayMap[dateKey].totalDuration += s.duration;
      dayMap[dateKey].totalDistraction += s.distractionTime || 0;
    });

    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];

      result.unshift({
        date: key,
        focusSeconds: Math.round(dayMap[key]?.totalDuration || 0),
        distractionSeconds: Math.round(dayMap[key]?.totalDistraction || 0),
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Error in /last-7-days:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/focus/streak-cal
router.get("/streak-cal", async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);

    const sessions = await FocusSession.find({
      startTime: { $gte: thirtyDaysAgo, $lte: today },
    });

    const streakMap = {};

    sessions.forEach((session) => {
      const dateKey = new Date(session.startTime).toISOString().split("T")[0];
      streakMap[dateKey] = 1; // Mark day as active
    });

    res.json(streakMap);
  } catch (error) {
    console.error("Error fetching streak:", error);
    res.status(500).json({ message: "Failed to fetch streak data" });
  }
});

module.exports = router;
