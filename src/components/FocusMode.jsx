// FocusMode.jsx
import React, { useEffect, useRef, useState } from "react";
import * as faceMesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import jsPDF from "jspdf";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

// --- PDF.js import for Vite ---
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.js?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
// -------------------------------------

// IMPORTANT: Put your Cohere key here if you want AI generation to run.
// For security, don't commit your real key to source control. If you previously leaked a key, rotate it immediately.
const COHERE_API_KEY = "suTpYlwD0dv2woDV1v5GAiuuexgAcva6b5GNC42V";

/* -------------------------
   Utility helpers (unchanged logic)
   ------------------------- */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const splitSentences = (text) => {
  if (!text) return [];
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const simpleSummarize = (text, maxSentences = 4) => {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences.join(" ");
  const freq = {};
  const stop = new Set([
    "the",
    "is",
    "and",
    "of",
    "in",
    "to",
    "a",
    "for",
    "that",
    "on",
    "with",
    "as",
    "are",
    "by",
    "an",
    "be",
    "this",
    "we",
    "it",
  ]);
  text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .forEach((w) => {
      if (!w || stop.has(w) || w.length < 3) return;
      freq[w] = (freq[w] || 0) + 1;
    });
  const scoreSent = sentences.map((s) => {
    const words = s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
    let score = 0;
    words.forEach((w) => {
      if (freq[w]) score += freq[w];
    });
    return { s, score };
  });
  scoreSent.sort((a, b) => b.score - a.score);
  const top = scoreSent
    .slice(0, Math.min(maxSentences, scoreSent.length))
    .map((x) => x.s);
  top.sort((a, b) => sentences.indexOf(a) - sentences.indexOf(b));
  return top.join(" ");
};

const simpleFlashcardsFromText = (text, count = 10) => {
  const sentences = splitSentences(text);
  const flashcards = [];
  for (let s of sentences) {
    if (flashcards.length >= count) break;
    const lowered = s.toLowerCase();
    if (lowered.length < 30) continue;
    if (
      lowered.includes(" is ") ||
      lowered.includes(" are ") ||
      lowered.includes(":") ||
      lowered.includes(" defined ")
    ) {
      const front = s.length > 120 ? s.slice(0, 120) + "..." : s;
      const back = s;
      flashcards.push({ front: `Explain: "${front}"`, back });
    }
  }
  let i = 0;
  while (flashcards.length < count && i < sentences.length) {
    const s = sentences[i++];
    if (s.length > 80) flashcards.push({ front: `Recall: "${s.slice(0, 80)}..."`, back: s });
  }
  return flashcards.slice(0, count);
};

const simpleQuizFromText = (text, count = 10) => {
  const sentences = splitSentences(text);
  const quiz = [];
  let i = 0;
  while (quiz.length < count && i < sentences.length) {
    const s = sentences[i++];
    if (s.length < 40 || s.split(" ").length < 6) continue;
    const words = s.split(/\s+/);
    const idx = Math.min(Math.floor(words.length / 2), words.length - 1);
    const answerWord = words[idx].replace(/[^a-zA-Z]/g, "");
    if (!answerWord || answerWord.length < 3) continue;
    const question = s.replace(answerWord, "_____");
    const options = [answerWord, (answerWord + "ly").slice(0, 12), "example", "something"];
    for (let j = options.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [options[j], options[k]] = [options[k], options[j]];
    }
    const correctLetter = String.fromCharCode(65 + options.indexOf(answerWord));
    if (!correctLetter.match(/[A-D]/)) continue;
    quiz.push({ question, options, answer: correctLetter });
  }
  while (quiz.length < count) {
    quiz.push({
      question: "What is the main idea of the text?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: "A",
    });
  }
  return quiz;
};

// Create longer bullet point summaries (select up to `count` sentences prioritized by word frequency)
const simpleBulletPointsFromText = (text, count = 12) => {
  if (!text) return [];
  const sentences = splitSentences(text).filter(Boolean);
  if (!sentences.length) return [];
  const freq = {};
  const stop = new Set(["the","is","and","of","in","to","a","for","that","on","with","as","are","by","an","be","this","we","it"]);
  text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).forEach((w) => { if (w && !stop.has(w) && w.length>2) freq[w] = (freq[w]||0)+1; });
  const scored = sentences.map((s) => {
    let score = 0;
    s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).forEach((w) => { if (freq[w]) score += freq[w]; });
    return { s, score };
  });
  scored.sort((a,b)=>b.score-a.score);
  const top = scored.slice(0, Math.min(count, scored.length)).map(x=>x.s);
  // keep approximate original order for readability
  top.sort((a,b)=>sentences.indexOf(a)-sentences.indexOf(b));
  return top;
};

// Convert a list (or text) into first-person "I learned ..." learning points
const formatLearnedPoints = (input, max = 15) => {
  const toPoint = (s) => {
    if (!s || typeof s !== 'string') return '';
    const trimmed = s.trim().replace(/[\.\?\!]+$/g, '');
    if (/^(i\s+learned|i\s+learn|what\s+i\s+learn)/i.test(trimmed)) return trimmed;
    return `I learned ${trimmed.charAt(0).toLowerCase() === trimmed.charAt(0) ? '' : ''}${trimmed}`;
  };
  if (Array.isArray(input)) return input.slice(0, max).map((s) => toPoint(s)).filter(Boolean);
  if (typeof input === 'string') {
    const parts = splitSentences(input).filter(Boolean);
    if (!parts.length) return [];
    return parts.slice(0, max).map((p) => toPoint(p));
  }
  return [];
};

/* -------------------------
   SUMMARY MODAL (UI only)
   ------------------------- */
const SummaryModal = ({ isOpen, stats, onReset, onClose }) => {
  if (!isOpen) return null;
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Focus Session Summary", 20, 20);
    doc.setFontSize(11);
    doc.text(`Session Duration: ${stats.totalDuration} mins`, 20, 36);
    doc.text(`Focus Time: ${stats.focusTime} mins`, 20, 46);
    doc.text(`Distraction Time: ${stats.distractionTime} secs`, 20, 56);
    doc.save("session-summary.pdf");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border dark:border-gray-700">
        <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-300">Session Summary</h3>
        <div className="mt-4 text-sm text-gray-700 dark:text-gray-200 space-y-2">
          <div><strong>Total Duration:</strong> {stats.totalDuration} mins</div>
          <div><strong>Focus Time:</strong> {stats.focusTime} mins</div>
          <div><strong>Distraction Time:</strong> {stats.distractionTime} secs</div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={exportPDF}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-lg shadow"
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => { onReset(); onClose(); }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg shadow"
          >
            🔄 Reset
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------
   MAIN COMPONENT
   (functionality preserved)
   ------------------------- */
const FocusMode = () => {
  // Refs
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const runningRef = useRef(false);
  const currentDistractionRef = useRef(null);
  const distractionStartRef = useRef(null);
  const totalDistractionTimeRef = useRef(0);
  const beepSound = useRef(typeof Audio !== "undefined" ? new Audio("/beep.mp3") : { play: () => {}, pause: () => {}, currentTime: 0 });
  const beepTimeout = useRef(null);

  // States (kept same names so logic calls remain identical)
  const [isRunning, setIsRunning] = useState(() => JSON.parse(localStorage.getItem("isRunning")) || false);
  const [sessionLength, setSessionLength] = useState(() => Number(localStorage.getItem("sessionLength")) || 25);
  const [timeLeft, setTimeLeft] = useState(() => Number(localStorage.getItem("timeLeft")) || 1500);
  const [sessionStartTime, setSessionStartTime] = useState(() => localStorage.getItem("sessionStartTime") || null);
  const [distractionAlert, setDistractionAlert] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState({});
  const [pdfURL, setPdfURL] = useState(() => localStorage.getItem("pdfBase64") || null);
  // We keep a runtime-only blob URL for reliably displaying/opening PDFs
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // AI + PDF state
  const [pdfText, setPdfText] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  // UI-only helpers for improved UX
  const [processingPdf, setProcessingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState(null);
  const [pdfFileSize, setPdfFileSize] = useState(null);
  const [aiFlashcards, setAiFlashcards] = useState([]);
  const [aiQuiz, setAiQuiz] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Helper: safeText
  const safeText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(" ");
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return String(value);
  };

  const normalizeFlashcards = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 100).map((card) => {
      if (typeof card === "string") return { front: card, back: "" };
      const front = safeText(card?.front ?? card?.question ?? card?.q ?? "");
      const back = safeText(card?.back ?? card?.answer ?? "");
      return { front, back };
    }).slice(0, 10);
  };

  const normalizeQuiz = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 100).map((q) => {
      if (typeof q === "string") return { question: q, options: [], answer: "" };
      const question = safeText(q?.question ?? q?.q ?? q?.prompt ?? "");
      const optionsRaw = q?.options ?? q?.choices ?? q?.answers ?? [];
      const options = Array.isArray(optionsRaw) ? optionsRaw.map((o) => safeText(o)) : [];
      const answer = safeText(q?.answer ?? q?.correct ?? "");
      while (options.length < 4) options.push("—");
      return { question, options: options.slice(0, 4), answer };
    }).slice(0, 10);
  };

  // Init: load from localStorage
  useEffect(() => {
    const storedBase64 = localStorage.getItem("pdfBase64");
    if (storedBase64) setPdfURL(storedBase64);
    const storedAI = localStorage.getItem("aiPDFData");
    if (storedAI) {
      try {
        const data = JSON.parse(storedAI);
        const summaryRaw = data.summary || "";
        const summaryFormatted = formatLearnedPoints(summaryRaw, 15);
        setAiSummary(summaryFormatted.length ? summaryFormatted : (Array.isArray(summaryRaw) ? summaryRaw : [safeText(summaryRaw || "")]));
        setAiFlashcards(normalizeFlashcards(data.flashcards || []));
        setAiQuiz(normalizeQuiz(data.quiz || []));
        setPdfText(data.text || "");
      } catch (e) {
        console.error("Error loading AI data:", e);
      }
    }
    // we intentionally don't auto-start camera here (startCamera called when session starts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever a base64 PDF is set we create a Blob URL for the viewer / opening in a new tab
  useEffect(() => {
    let current = null;
    const makeBlobUrlFromBase64 = (base64) => {
      try {
        if (!base64) return null;
        const matches = base64.match(/^data:(.+);base64,(.*)$/);
        let mime = "application/pdf";
        let b64data = base64;
        if (matches) {
          mime = matches[1] || mime;
          b64data = matches[2];
        }

        // Convert base64 to byte array
        const binaryString = atob(b64data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        return url;
      } catch (e) {
        console.error("Failed to create blob url from base64", e);
        return null;
      }
    };

    if (pdfURL) {
      const url = makeBlobUrlFromBase64(pdfURL);
      if (url) {
        current = url;
        setPdfBlobUrl(url);
      } else {
        setPdfBlobUrl(null);
      }
    } else {
      setPdfBlobUrl(null);
    }

    return () => {
      if (current) URL.revokeObjectURL(current);
    };
  }, [pdfURL]);

  // Clean up blob URL on unmount (if created from file upload)
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        try { URL.revokeObjectURL(pdfBlobUrl); } catch (e) {}
      }
    };
  }, [pdfBlobUrl]);

  // Persist some state
  useEffect(() => {
    localStorage.setItem("isRunning", JSON.stringify(isRunning));
    localStorage.setItem("sessionLength", sessionLength);
    localStorage.setItem("timeLeft", timeLeft);
    if (sessionStartTime) localStorage.setItem("sessionStartTime", sessionStartTime);
  }, [isRunning, sessionLength, timeLeft, sessionStartTime]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    else if (isRunning && timeLeft === 0) stopSession();
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  // Start camera when component mounts if running
  useEffect(() => {
    if (isRunning) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = () => {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // Session progress percentage for UI (pure visual)
  const sessionTotalSeconds = sessionLength * 60;
  const sessionElapsed = Math.max(0, sessionTotalSeconds - timeLeft);
  const sessionProgress = sessionTotalSeconds > 0 ? Math.round((sessionElapsed / sessionTotalSeconds) * 100) : 0;

  /* -------------------------
     FaceMesh onResults (same logic)
     ------------------------- */
  const onResults = (results) => {
    if (!runningRef.current) return;
    let type = "";
    if (!results.multiFaceLandmarks?.length) type = "face_not_visible";
    else {
      const [lm] = results.multiFaceLandmarks;
      const noseOffset = Math.abs(lm[1].x - (lm[33].x + lm[263].x) / 2) / Math.abs(lm[263].x - lm[33].x);
      if (noseOffset > 0.10) type = "looking_away";
    }

    if (type) {
      setDistractionAlert(type === "looking_away" ? "👀 Looking Away" : "🚫 No Face");
      if (!currentDistractionRef.current) {
        currentDistractionRef.current = type;
        distractionStartRef.current = new Date();
        beepTimeout.current = setTimeout(() => {
          if (runningRef.current && currentDistractionRef.current === type) {
            try { beepSound.current.currentTime = 0; } catch {}
            try { beepSound.current.play(); } catch {}
          }
        }, 5000);
      }
    } else {
      setDistractionAlert("");
      if (currentDistractionRef.current) {
        const duration = Math.round((new Date() - distractionStartRef.current) / 1000);
        if (duration > 0) totalDistractionTimeRef.current += duration;
        currentDistractionRef.current = null;
        distractionStartRef.current = null;
        clearTimeout(beepTimeout.current);
        try { beepSound.current.pause(); beepSound.current.currentTime = 0; } catch {}
      }
    }
  };

  /* -------------------------
     Camera control (same logic)
     ------------------------- */
  const startCamera = async () => {
    try {
      const instance = new faceMesh.FaceMesh({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
      instance.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      instance.onResults(onResults);
      faceMeshRef.current = instance;

      runningRef.current = true;
      cameraRef.current = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          if (runningRef.current) await faceMeshRef.current.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      cameraRef.current.start();
    } catch (e) {
      console.error("Camera start error:", e);
    }
  };

  const stopCamera = () => {
    try {
      cameraRef.current?.stop();
      videoRef.current?.srcObject?.getTracks?.()?.forEach((t) => t.stop());
    } catch (e) {
      // ignore
    }
  };

  /* -------------------------
     Session control (same logic)
     ------------------------- */
  const startSession = () => {
    totalDistractionTimeRef.current = 0;
    setSessionStartTime(new Date().toISOString());
    setIsRunning(true);
    runningRef.current = true;
    startCamera();
  };

  const stopSession = async () => {
    runningRef.current = false;
    stopCamera();
    clearTimeout(beepTimeout.current);
    try { beepSound.current.pause(); beepSound.current.currentTime = 0; } catch {}

    const endTime = new Date();
    const durationSec = Math.round((endTime - new Date(sessionStartTime)) / 1000);
    const distractionSec = totalDistractionTimeRef.current;
    const focusSec = Math.max(0, durationSec - distractionSec);

    setSummaryStats({
      totalDuration: Math.round(durationSec / 60),
      focusTime: Math.round(focusSec / 60),
      distractionTime: distractionSec,
    });

    try {
      await axios.post("http://localhost:5000/api/focus/stop", {
        startTime: sessionStartTime,
        endTime: endTime.toISOString(),
        duration: Math.round(durationSec / 60),
        distractionTime: distractionSec,
      }, { timeout: 3000 });
      toast.success("Focus session saved!");
    } catch (err) {
      console.warn("Could not save session to backend:", err?.message || err);
      toast("Session ended (local).", { icon: "⏱️" });
    }

    setIsRunning(false);
    setShowSummary(true);
  };

  const resetSession = () => {
    stopCamera();
    setIsRunning(false);
    setTimeLeft(sessionLength * 60);
    setSessionStartTime(null);
    setDistractionAlert("");
    setShowSummary(false);
    setSummaryStats({});
    // cleanup blob and base64
    if (pdfBlobUrl) {
      try { URL.revokeObjectURL(pdfBlobUrl); } catch (e) {}
      setPdfBlobUrl(null);
    }
    setPdfURL(null);
    setPdfFileName(null);
    setPdfFileSize(null);
    setProcessingPdf(false);
    setPdfText("");
    setAiSummary("");
    setAiFlashcards([]);
    setAiQuiz([]);
    totalDistractionTimeRef.current = 0;
    currentDistractionRef.current = null;
    distractionStartRef.current = null;
    localStorage.removeItem("pdfBase64");
    localStorage.removeItem("aiPDFData");
    localStorage.removeItem("isRunning");
    localStorage.removeItem("sessionLength");
    localStorage.removeItem("timeLeft");
    localStorage.removeItem("sessionStartTime");
  };

  /* -------------------------
     PDF extraction + AI logic (unchanged)
     ------------------------- */
  // Accept either a base64 data URL OR raw bytes (Uint8Array / ArrayBuffer)
  const extractPDFText = async (input) => {
    try {
      if (!input) return "";
      let bytes;
      if (typeof input === "string") {
        // base64 data URL
        const binaryString = atob(input.split(",")[1]);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      } else if (input instanceof ArrayBuffer) {
        bytes = new Uint8Array(input);
      } else if (input instanceof Uint8Array) {
        bytes = input;
      } else {
        return "";
      }

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(" ") + " ";
        if (i % 20 === 0) await new Promise((r) => setTimeout(r, 50));
      }
      return fullText.substring(0, 12000);
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      toast.error("Failed to extract PDF text");
      return "";
    }
  };

  const parseCohereJsonFromResponse = (rawData) => {
    try {
      console.log("DEBUG - Cohere raw response:", rawData);
      let text = null;
      if (rawData?.message?.content) {
        const contentArr = rawData.message.content;
        if (Array.isArray(contentArr)) {
          const joined = contentArr.map((c) => (c?.text ?? (typeof c === "string" ? c : ""))).join("\n");
          text = joined;
        } else if (typeof contentArr === "string") {
          text = contentArr;
        }
      } else if (rawData?.output?.[0]?.content?.[0]?.text) {
        text = rawData.output[0].content[0].text;
      } else if (rawData?.generations?.[0]?.text) {
        text = rawData.generations[0].text;
      } else if (typeof rawData === "string") {
        text = rawData;
      } else {
        text = JSON.stringify(rawData);
      }

      const jsonMatch = text && text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("No JSON object found in Cohere response text.");
        return null;
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (e) {
      console.error("parseCohereJsonFromResponse error", e);
      return null;
    }
  };

  const generateAIContent = async (text) => {
    if (!text || text.trim().length < 20) {
      toast.error("PDF text is too short for AI generation.");
      return;
    }

    setLoadingAI(true);
    const useCohere = COHERE_API_KEY && COHERE_API_KEY !== "YOUR_KEY_HERE";

    try {
      if (useCohere) {
        const prompt = `You are an expert study assistant. Analyze the given text and RETURN ONLY A JSON OBJECT (no markdown, no commentary).
{
  "summary": ["I learned ...", "..."],          // array of 12-15 first-person learning points
  "flashcards": [{"front":"question","back":"answer"}],
  "quiz": [{"question":"...","options":["A","B","C","D"],"answer":"A"}]
}
Create a summary array of 12-15 detailed, pointwise learning outcomes phrased in first-person ("I learned ..."). Create exactly 10 flashcards and exactly 10 quiz questions (each MCQ with 4 options). Return JSON only.
Text:
${text}
`;
        const resp = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "command-r-08-2024",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.2,
          }),
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          console.error("Cohere API error:", resp.status, txt);
          toast.error("Cohere API returned an error — falling back to local generation.");
        } else {
          const data = await resp.json();
          const parsed = parseCohereJsonFromResponse(data);
          if (parsed && (parsed.summary || parsed.flashcards || parsed.quiz)) {
            const summaryRaw = parsed.summary || parsed.summary === 0 ? parsed.summary : "";
            const flashcards = normalizeFlashcards(parsed.flashcards || []);
            const quiz = normalizeQuiz(parsed.quiz || []);

            // Normalize and format summary into first-person 'I learned ...' bullets
            const summaryArr = Array.isArray(summaryRaw) ? summaryRaw.map((s) => safeText(s)) : [safeText(summaryRaw)];
            const formatted = formatLearnedPoints(summaryArr, 15);
            setAiSummary(formatted.length ? formatted : summaryArr);
            setAiFlashcards(flashcards);
            setAiQuiz(quiz);

            localStorage.setItem("aiPDFData", JSON.stringify({ summary: (formatted.length ? formatted : summaryArr), flashcards, quiz, text }));
            toast.success("Study materials generated (Cohere).");
            setLoadingAI(false);
            return;
          } else {
            console.warn("Cohere returned but parsing produced no usable JSON, falling back to local generator.");
            toast("Cohere response unparseable — using local fallback.", { icon: "⚠️" });
          }
        }
      } else {
        toast("Cohere API key not set — using local fallback.", { icon: "ℹ️" });
      }

      // fallback
      const bullets = simpleBulletPointsFromText(text, 15);
      const summaryFallback = bullets.length ? bullets : [safeText(simpleSummarize(text, 8))];
      const summaryFallbackFormatted = formatLearnedPoints(summaryFallback, 15);
      const flashcardsFallback = normalizeFlashcards(simpleFlashcardsFromText(text, 10));
      const quizFallback = normalizeQuiz(simpleQuizFromText(text, 10));

      setAiSummary(summaryFallbackFormatted.length ? summaryFallbackFormatted : summaryFallback);
      setAiFlashcards(flashcardsFallback);
      setAiQuiz(quizFallback);

      localStorage.setItem("aiPDFData", JSON.stringify({ summary: (summaryFallbackFormatted.length ? summaryFallbackFormatted : summaryFallback), flashcards: flashcardsFallback, quiz: quizFallback, text }));

      toast.success("Study materials generated (fallback).");
    } catch (error) {
      console.error("Error generating AI content (generateAIContent):", error);
      toast.error("Failed to generate study materials");
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setProcessingPdf(true);
      setPdfFileName(file.name);
      setPdfFileSize(file.size || null);
      // create a runtime-only blob url for viewing (works for large files)
      try {
        if (pdfBlobUrl) try { URL.revokeObjectURL(pdfBlobUrl); } catch (e) {}
      } catch (e) {}
      const blobUrl = URL.createObjectURL(file);
      setPdfBlobUrl(blobUrl);

      // Persist base64 only for reasonably-sized files (localStorage has limits)
      // Files larger than threshold won't be stored as base64 to avoid quota issues.
      const SIZE_LIMIT = 2.5 * 1024 * 1024; // 2.5MB
      let base64 = null;
      if (file.size <= SIZE_LIMIT) {
        try {
          base64 = await fileToBase64(file);
          setPdfURL(base64);
          localStorage.setItem("pdfBase64", base64);
        } catch (e) {
          console.warn("Could not convert PDF to base64 for persistence", e);
          setPdfURL(null);
          localStorage.removeItem("pdfBase64");
        }
      } else {
        // large file: don't persist base64
        setPdfURL(null);
        localStorage.removeItem("pdfBase64");
      }

      // extract text using raw bytes (prefer this over base64 when possible)
      let bytes = null;
      try {
        const buf = await file.arrayBuffer();
        bytes = new Uint8Array(buf);
      } catch (e) {
        // fallback to base64 extraction
      }

      const text = await extractPDFText(bytes || base64);
      setPdfText(text);
      console.log("Extracted text (first 400 chars):", text ? text.slice(0, 400) : "(empty)");

      if (text) await generateAIContent(text);
      else {
        const summaryFallback = "No extractable text found in PDF. If this is a scanned PDF, OCR is required.";
        setAiSummary(summaryFallback);
        setAiFlashcards([]);
        setAiQuiz([]);
        localStorage.setItem("aiPDFData", JSON.stringify({ summary: summaryFallback, flashcards: [], quiz: [], text: "" }));
      }
      setProcessingPdf(false);
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  const toggleFlipCard = (idx) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      newSet.has(idx) ? newSet.delete(idx) : newSet.add(idx);
      return newSet;
    });
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    const correct = aiQuiz.filter((q, idx) => {
      const selected = quizAnswers[idx];
      return selected && q.answer && selected === q.answer;
    }).length;
    toast.success(`Score: ${correct}/${aiQuiz.length}`);
  };

  /* -------------------------
     Render (UI/UX improved)
     ------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-sky-50 dark:from-gray-900 dark:to-black text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <Toaster position="top-right" />
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

        {/* Left panel: camera + controls */}
        <aside className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl border border-white/30 dark:border-gray-700 p-5 flex flex-col gap-4 shadow-lg">
          <div className="relative">
            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
            </div>

            {distractionAlert && (
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-md animate-pulse">
                {distractionAlert}
              </div>
            )}
          </div>

          {/* Session progress */}
          <div className="mt-3 px-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-300 mb-1">
              <div className="font-semibold">Session Progress</div>
              <div className="font-mono">{sessionProgress}%</div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden border border-gray-100 dark:border-gray-600 shadow-inner">
              <div
                className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
                style={{ width: `${sessionProgress}%` }}
                aria-hidden
              />
            </div>
          </div>

          <div className="text-center mt-1">
            <div className="text-5xl font-mono font-extrabold text-indigo-600 dark:text-indigo-300">{formatTime()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Session time left</div>
          </div>

          <div className="flex gap-3 items-center mt-2">
            <label className="sr-only" htmlFor="session-length">Session Length</label>
            <select
              id="session-length"
              value={sessionLength}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSessionLength(v);
                setTimeLeft(v * 60);
              }}
              disabled={isRunning}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm shadow-sm"
            >
              {[15, 25, 30, 45, 60].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} minutes
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-2 w-32">
              {!isRunning ? (
                <>
                  <button onClick={startSession} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg shadow">▶ Start</button>
                  <button onClick={resetSession} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg shadow">🔄 Reset</button>
                </>
              ) : (
                <button onClick={stopSession} className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg shadow">⏹ Stop</button>
              )}
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Upload PDF (study material)</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePDFUpload}
                className="flex-1 text-sm"
                disabled={processingPdf}
                aria-label="Upload PDF"
              />
              {processingPdf && (
                <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="60" strokeLinecap="round" fill="none" />
                  </svg>
                  Processing
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Supports text PDFs. For scanned PDFs, OCR is required.</div>
            {/* file info */}
            {pdfFileName && (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-300">
                <div className="truncate max-w-[160px]">📄 {pdfFileName}</div>
                <div className="flex items-center gap-2">
                  {pdfURL ? (
                    <div className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[11px]">Persisted</div>
                  ) : pdfBlobUrl ? (
                    <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[11px]">Runtime only</div>
                  ) : null}
                  {pdfFileSize ? <div className="text-[11px] text-gray-400">{(pdfFileSize / 1024).toFixed(1)} KB</div> : null}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={() => {
                if (!pdfText) return toast("No extracted text available");
                navigator.clipboard?.writeText(pdfText.slice(0, 2000));
                toast.success("PDF text sample copied to clipboard");
              }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg shadow text-sm"
            >
              Copy text sample
            </button>
            <button
              onClick={() => {
                  if (!pdfURL && !pdfBlobUrl) return toast("No PDF uploaded");
                  // open in new tab (prefer blob URL for large PDFs / browser consistency)
                  window.open(pdfBlobUrl || pdfURL, "_blank");
                }}
              className="bg-white/60 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 py-2 px-3 rounded-lg text-sm shadow"
            >
              View PDF
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            Tip: While session is running, camera is used for lightweight head tracking — no images are saved.
          </div>
        </aside>

        {/* Right panel: PDF viewer + AI output */}
        <main className="space-y-6">
          {/* PDF viewer */}
          {/* PDF Viewer Section */}
<div className="w-full mt-4">
  <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">
    PDF Viewer
  </h3>

  {pdfURL ? (
    <iframe
      src={pdfBlobUrl || pdfURL}
      className="w-full h-[500px] border rounded-xl shadow"
      title="PDF Viewer"
    />
  ) : (
    <div className="w-full h-[500px] flex items-center justify-center border rounded-xl text-gray-500 dark:text-gray-300">
      Upload a PDF to view it here.
    </div>
  )}
</div>

          

          {/* AI area: loading, summary, flashcards, quiz */}
          {/* show only processing indicator while extracting text; preview removed */}
          {processingPdf && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <svg className="w-4 h-4 animate-spin text-indigo-600" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="60" strokeLinecap="round" fill="none" /></svg>
                <div>Processing PDF — extracting text…</div>
              </div>
            </div>
          )}
          <section className="space-y-6">
            {loadingAI && (
              <div className="bg-white/70 dark:bg-gray-800/60 p-4 rounded-2xl border border-white/30 shadow text-center">
                <div className="text-indigo-600 font-semibold">Generating study materials...</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">This may take a few seconds — using Cohere if available, otherwise local fallback.</div>
              </div>
            )}

            {aiSummary && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-white/30 shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-300">📝 What I learned</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{Array.isArray(aiSummary) ? `${aiSummary.length} points` : `1 item`}</div>
                </div>
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {Array.isArray(aiSummary) ? (
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      {aiSummary.map((b, i) => (
                        <li key={i} className="text-sm text-gray-800 dark:text-gray-200">{safeText(b)}</li>
                      ))}
                    </ol>
                  ) : (
                    <div>{safeText(aiSummary)}</div>
                  )}
                </div>
              </div>
            )}

            {aiFlashcards.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-white/30 shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-300">🎴 Flashcards ({aiFlashcards.length})</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Tap a card to flip</div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiFlashcards.map((card, idx) => {
                    const flipped = flippedCards.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleFlipCard(idx)}
                        className={`relative h-40 rounded-lg p-0 transform transition-transform duration-500 shadow-lg overflow-hidden perspective-1000 ${flipped ? "rotate-y-180" : ""}`}
                        aria-label={`Flashcard ${idx + 1}`}
                      >
                        <div className="relative w-full h-full rounded-lg">
                          <div className={`absolute inset-0 backface-hidden w-full h-full rounded-lg flex items-center justify-center p-4 text-center font-semibold text-sm text-white transition-transform duration-300 ${flipped ? "opacity-0" : "opacity-100"}`} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            <div className="px-2">{safeText(card.front)}</div>
                          </div>
                          <div className={`absolute inset-0 backface-hidden w-full h-full rounded-lg flex items-center justify-center p-4 text-center font-semibold text-sm text-white transform rotate-y-180 transition-transform duration-300 ${flipped ? "opacity-100" : "opacity-0"}`} style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                            <div className="px-2">{safeText(card.back)}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {aiQuiz.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-white/30 shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-300">❓ Quiz ({aiQuiz.length})</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Multiple choice — submit to score</div>
                </div>

                <div className="mt-4 space-y-4">
                  {aiQuiz.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{idx + 1}. {safeText(q.question)}</div>
                      <div className="grid grid-cols-1 gap-2">
                        {Array.isArray(q.options) ? q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          const checked = quizAnswers[idx] === letter;
                          const correct = quizSubmitted && q.answer === letter;
                          const wrongSelected = quizSubmitted && checked && q.answer !== letter;
                          return (
                            <label key={optIdx} className={`flex items-center gap-3 cursor-pointer p-2 rounded ${correct ? "bg-green-50 dark:bg-green-900/40" : ""} ${wrongSelected ? "bg-red-50 dark:bg-red-900/40" : ""}`}>
                              <input
                                type="radio"
                                name={`q${idx}`}
                                value={letter}
                                checked={checked || false}
                                onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                                disabled={quizSubmitted}
                                className="w-4 h-4"
                              />
                              <div className="text-sm text-gray-700 dark:text-gray-200">
                                <span className="font-semibold mr-2">{letter}.</span> {safeText(opt)}
                              </div>
                              {quizSubmitted && q.answer === letter && <div className="ml-auto text-green-600 font-bold">✓</div>}
                              {quizSubmitted && checked && q.answer !== letter && <div className="ml-auto text-red-600 font-bold">✗</div>}
                            </label>
                          );
                        }) : (
                          <div className="text-sm italic text-gray-500 dark:text-gray-400">No options available</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {!quizSubmitted ? (
                    <button onClick={handleQuizSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg shadow">
                      Submit Quiz
                    </button>
                  ) : (
                    <div className="text-center text-sm text-gray-600 dark:text-gray-300">Quiz submitted — review your answers above.</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <SummaryModal isOpen={showSummary} stats={summaryStats} onReset={resetSession} onClose={() => setShowSummary(false)} />
    </div>
  );
};

export default FocusMode;
