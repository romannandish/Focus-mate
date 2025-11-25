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

    // Attempt to call Cohere for summarization. If it fails for any reason
    // (missing API key, network issue, changed response format) we fall back
    // to a lightweight local summarizer and continue saving the journal.
    let summary = "";
    const cohereKey = process.env.COHERE_API_KEY;

    // quick content detection so that request prompts and fallbacks match the
    // entry intent (e.g., learning vs completion)
    const lowerText = (text || "").toLowerCase();
    const isCompletion = /\b(complet|finish|done|delivery|deliverable|project)\b/.test(lowerText);
    const isLearning = /\b(learn|learned|study|studied|practic|understand|reading)\b/.test(lowerText);

    if (cohereKey) {
      try {
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
              Authorization: `Bearer ${cohereKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Be defensive with response structure
        summary = summaryResponse?.data?.generations?.[0]?.text?.trim() || "";
        // If the model simply echoed the input, we will ask for a paraphrase/expanded rewrite
        // to ensure the summary is useful and not verbatim.
        const normalize = (s = "") => s.replace(/[\W_]+/g, " ").toLowerCase().trim();
        if (normalize(summary) === normalize(text)) {
          // create a stronger, content-aware prompt that requires paraphrase, expansion and emphasis
          // choose a paraphrase prompt tailored to the entry's intent
          let paraphrasePrompt = `Rewrite and expand this journal entry into a concise 2-3 sentence professional summary that emphasizes what you completed, any outcomes or deliverables, and suggested next steps. Do NOT repeat the input verbatim. Entry: ${text}`;
          if (isLearning) {
            paraphrasePrompt = `Rewrite and expand this journal entry into a concise 2-3 sentence summary focusing on what you learned, key takeaways, and suggested next learning steps. Do NOT repeat the input verbatim. Entry: ${text}`;
          } else if (!isCompletion && !isLearning) {
            paraphrasePrompt = `Rewrite and expand this journal entry into a concise 2-3 sentence summary that captures the main point, any outcomes, and suggested next steps. Do NOT repeat the input verbatim. Entry: ${text}`;
          }
          try {
            const paraphraseResp = await axios.post(
              "https://api.cohere.ai/v1/generate",
              {
                model: "command-r-plus",
                prompt: paraphrasePrompt,
                max_tokens: 120,
                temperature: 0.4,
              },
              {
                headers: {
                  Authorization: `Bearer ${cohereKey}`,
                  "Content-Type": "application/json",
                },
              }
            );
            const alt = paraphraseResp?.data?.generations?.[0]?.text?.trim();
            if (alt && normalize(alt) !== normalize(text)) summary = alt;
          } catch (err) {
            console.warn("Paraphrase attempt failed, continuing with fallback:", err?.response?.data || err.message || err);
          }
        }
      } catch (err) {
        // Log the detailed error for debugging but don't stop flow.
        console.warn("Cohere call failed, falling back to local summary:", err?.response?.data || err.message || err);
        summary = "";
      }
    }

    // Local fallback summarizer: if Cohere didn't return anything or produced
    // a verbatim copy, try a small rewrite/expand step locally.
    const normalize = (s = "") => s.replace(/[\W_]+/g, " ").toLowerCase().trim();
    if (!summary || normalize(summary) === normalize(text)) {
      // If the input is short, produce a small rewritten expansion that adds
      // context and outcome language, otherwise keep the first couple sentences.
      const firstSentences = (text || "").replace(/\s+/g, " ").split(/(?<=[.?!])\s+/).filter(Boolean);
      if (!summary && firstSentences.length >= 2) {
        summary = firstSentences.slice(0, 2).join(" ").slice(0, 500);
      } else {
        // Smart short-input rewrite (avoid echo): build a simple structured rewrite
        // that is aware of the entry's intent (learning vs completion vs neutral).
        const trimmed = (text || "").trim();
        if (!trimmed) summary = "No summary available.";
        else if (trimmed.length < 80 || firstSentences.length < 2) {
          // craft a friendly 2-sentence expansion tailored by content keywords
          const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          if (isLearning) {
            summary = `${cap}. I studied and practiced the topic and gained useful insights; next steps are to apply this knowledge in examples or small projects.`;
          } else if (isCompletion) {
            summary = `${cap}. I completed this multi-day project, finishing the main deliverables and validating key functionality. Next I plan to review and iterate on feedback or move on to follow-up tasks.`;
          } else {
            summary = `${cap}. This is a short note — consider adding outcomes and next steps to make it actionable.`;
          }
        } else {
          summary = firstSentences.slice(0, 2).join(" ").slice(0, 500);
        }
      }
    }

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

// POST /api/journal/rephrase  -- return an array of alternate summaries (non-destructive)
router.post("/rephrase", async (req, res) => {
  try {
    const { text, count = 3 } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    const cohereKey = process.env.COHERE_API_KEY;
    const normalize = (s = "") => s.replace(/[\W_]+/g, " ").toLowerCase().trim();

    // local fallback variants generator (safe, no external API)
    const localVariants = (src, n) => {
      const out = [];
      const base = (src || "").trim();
      const SENT_LIMIT = 3;
      const sentences = base.replace(/\s+/g, " ").split(/(?<=[.?!])\s+/).filter(Boolean);

      // Very simple content-type detection so local fallbacks are sensible.
      // We infer intent from keywords: 'complete/project/finish' => completion templates,
      // 'learn/learned/studied' => learning templates, otherwise produce neutral summaries.
      const lower = base.toLowerCase();
      const isCompletion = /\b(complet|finish|done|delivery|deliverable|project)\b/.test(lower);
      const isLearning = /\b(learn|learned|study|studied|practic|understand|reading)\b/.test(lower);

      const makeCompletion = (i) => {
        if (i % 3 === 0) return `${base.charAt(0).toUpperCase() + base.slice(1)} I completed this task after several days of work and finished the main deliverables.`;
        if (i % 3 === 1) return `Completed a multi-day project: ${base}. The work included validation and final delivery.`;
        return `Finished this project after sustained effort; next steps include reviewing feedback and iterating on improvements.`;
      };

      const makeLearning = (i) => {
        if (i % 3 === 0) return `${base.charAt(0).toUpperCase() + base.slice(1)} I studied the topic and practiced examples to deepen my understanding.`;
        if (i % 3 === 1) return `Learning progress: ${base}. I experimented with examples and built small exercises to reinforce concepts.`;
        return `Explored ${base} and gained practical experience; next steps are to apply this knowledge in a small project.`;
      };

      const makeNeutral = (i) => {
        if (base.length < 80 || sentences.length < 2) {
          if (i % 3 === 0) return `${base.charAt(0).toUpperCase() + base.slice(1)} — noted. Consider next actions or follow-ups.`;
          if (i % 3 === 1) return `Short summary: ${base}. Add details about outcomes and future steps when available.`;
          return `Brief entry: ${base}. Consider recording concrete outcomes or next steps.`;
        }
        const take = Math.min(SENT_LIMIT, sentences.length);
        // produce slight variations by taking 1..take sentences
        return sentences.slice(0, Math.max(1, (i % take) + 1)).join(' ');
      };

      for (let i = 0; i < n; i++) {
        if (isCompletion) out.push(makeCompletion(i));
        else if (isLearning) out.push(makeLearning(i));
        else out.push(makeNeutral(i));
      }

      // ensure uniqueness and trim
      return Array.from(new Set(out.map((o) => o.trim()))).slice(0, n);
    };

    // If we have an API key try Cohere to generate structured JSON array of variants
    if (cohereKey) {
      try {
        // ask the model to return JSON array of strings only
        const prompt = `Rewrite the following journal entry into ${count} different concise summaries (2-3 sentences each). Return output as a JSON array of strings ONLY, no commentary. Entry: ${text}`;
        const resp = await axios.post(
          "https://api.cohere.ai/v1/generate",
          {
            model: "command-r-plus",
            prompt,
            max_tokens: 256,
            temperature: 0.45,
            num_generations: 1,
          },
          {
            headers: { Authorization: `Bearer ${cohereKey}`, "Content-Type": "application/json" },
          }
        );

        const raw = resp?.data?.generations?.[0]?.text || "";
        // try to find a JSON array in the response
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // truncate to requested count and ensure strings
              const result = parsed.map((s) => String(s).trim()).slice(0, count);
              // if results are identical or few, supplement with local variants
              if (result.length < count || (result.every((r) => normalize(r) === normalize(text)))) {
                const fallback = localVariants(text, count);
                return res.json(Array.from(new Set([...result, ...fallback])).slice(0, count));
              }
              return res.json(result);
            }
          } catch (e) {
            console.warn('Cohere returned non-JSON list:', e);
          }
        }

        // Try to parse if model returned newline-separated variants
        const lines = raw.split(/\r?\n+/).map(s=>s.trim()).filter(Boolean);
        if (lines.length >= 1) {
          const result = lines.slice(0, count);
          if (result.every((r) => normalize(r) === normalize(text))) throw new Error('Echoed');
          return res.json(result);
        }
      } catch (err) {
        console.warn('Cohere rephrase failed, falling back to local variants:', err?.message || err);
      }
    }

    // fallback: local variants
    const fallback = localVariants(text, count);
    return res.json(fallback);
  } catch (err) {
    console.error('Rephrase error', err?.message || err);
    return res.status(500).json({ error: 'Failed to generate rephrases' });
  }
});

// PATCH /api/journal/:id - update a journal's summary (client can save a chosen variant)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;
    if (!summary) return res.status(400).json({ error: 'summary is required' });

    const updated = await Journal.findByIdAndUpdate(id, { summary }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Journal not found' });
    return res.json(updated);
  } catch (err) {
    console.error('Failed to update journal summary:', err?.message || err);
    return res.status(500).json({ error: 'Failed to update summary' });
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
