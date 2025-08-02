import React, { useEffect, useRef, useState } from "react";
import * as faceMesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import jsPDF from "jspdf";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const SummaryModal = ({ isOpen, stats, onReset }) => {
  if (!isOpen) return null;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Focus Session Summary", 20, 20);
    doc.text(`Session Duration: ${stats.totalDuration} mins`, 20, 40);
    doc.text(`Focus Time: ${stats.focusTime} mins`, 20, 50);
    doc.text(`Distraction Time: ${stats.distractionTime} secs`, 20, 60);
    doc.save("session-summary.pdf");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-[90%] max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">Session Summary</h2>
        <p className="dark:text-white"><strong>Total Duration:</strong> {stats.totalDuration} mins</p>
        <p className="dark:text-white"><strong>Focus Time:</strong> {stats.focusTime} mins</p>
        <p className="dark:text-white"><strong>Distraction Time:</strong> {stats.distractionTime} secs</p>
        <div className="flex justify-center gap-4 mt-6 flex-wrap">
          <button onClick={exportPDF} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition shadow-md">📄 Export PDF</button>
          <button onClick={onReset} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition shadow-md">🔄 Reset</button>
        </div>
      </div>
    </div>
  );
};

const FocusMode = () => {
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const runningRef = useRef(false);
  const currentDistractionRef = useRef(null);
  const distractionStartRef = useRef(null);
  const totalDistractionTimeRef = useRef(0);
  const beepSound = useRef(new Audio("/beep.mp3"));
  const beepTimeout = useRef(null);

  const [isRunning, setIsRunning] = useState(() => JSON.parse(localStorage.getItem("isRunning")) || false);
  const [sessionLength, setSessionLength] = useState(() => Number(localStorage.getItem("sessionLength")) || 25);
  const [timeLeft, setTimeLeft] = useState(() => Number(localStorage.getItem("timeLeft")) || 1500);
  const [sessionStartTime, setSessionStartTime] = useState(() => localStorage.getItem("sessionStartTime") || null);
  const [distractionAlert, setDistractionAlert] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState({});
  const [pdfURL, setPdfURL] = useState(() => localStorage.getItem("pdfBase64") || null);

  useEffect(() => {
    const storedBase64 = localStorage.getItem("pdfBase64");
    if (storedBase64) {
      setPdfURL(storedBase64);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isRunning", JSON.stringify(isRunning));
    localStorage.setItem("sessionLength", sessionLength);
    localStorage.setItem("timeLeft", timeLeft);
    if (sessionStartTime) localStorage.setItem("sessionStartTime", sessionStartTime);
  }, [isRunning, sessionLength, timeLeft, sessionStartTime]);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0)
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    else if (isRunning && timeLeft === 0)
      stopSession();
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (isRunning) startCamera();
    return () => stopCamera();
  }, []);

  const formatTime = () => {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

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
            beepSound.current.currentTime = 0;
            beepSound.current.play();
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
        beepSound.current.pause();
        beepSound.current.currentTime = 0;
      }
    }
  };

  const startCamera = async () => {
    const instance = new faceMesh.FaceMesh({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
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
        if (runningRef.current) {
          await faceMeshRef.current.send({ image: videoRef.current });
        }
      },
      width: 320,
      height: 240,
    });
    cameraRef.current.start();
  };

  const stopCamera = () => {
    cameraRef.current?.stop();
    videoRef.current?.srcObject?.getTracks()?.forEach((t) => t.stop());
  };

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
    beepSound.current.pause();
    beepSound.current.currentTime = 0;

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
      });
      toast.success("Focus session saved!");
    } catch {
      toast.error("Error saving session!");
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
    setPdfURL(null);
    totalDistractionTimeRef.current = 0;
    currentDistractionRef.current = null;
    distractionStartRef.current = null;
    localStorage.removeItem("pdfBase64");
    localStorage.removeItem("isRunning");
    localStorage.removeItem("sessionLength");
    localStorage.removeItem("timeLeft");
    localStorage.removeItem("sessionStartTime");
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      const base64 = await fileToBase64(file);
      setPdfURL(base64);
      localStorage.setItem("pdfBase64", base64);
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-black text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column */}
        <div className="w-full md:w-[360px] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex flex-col items-center gap-4">
          <video ref={videoRef} autoPlay muted className="w-full max-w-[320px] rounded-lg border dark:border-gray-600" />
          {distractionAlert && (
            <p className="text-center text-red-500 font-semibold animate-pulse">{distractionAlert}</p>
          )}
          <div className="text-4xl font-mono text-blue-700 dark:text-blue-400">{formatTime()}</div>
          <select
            value={sessionLength}
            onChange={(e) => setSessionLength(Number(e.target.value))}
            disabled={isRunning}
            className="border px-3 py-2 rounded w-4/5 bg-white dark:bg-gray-700 dark:border-gray-600"
          >
            {[15, 25, 30, 45, 60].map((mins) => (
              <option key={mins} value={mins}>{mins} min</option>
            ))}
          </select>
          {!isRunning ? (
            <>
              <button onClick={startSession} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded w-4/5 transition shadow">▶ Start</button>
              <button onClick={resetSession} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded w-4/5 transition shadow">🔄 Reset</button>
            </>
          ) : (
            <button onClick={stopSession} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded w-4/5 transition shadow">⏹ Stop</button>
          )}
          <input type="file" accept="application/pdf" onChange={handlePDFUpload} className="w-4/5" />
        </div>

        {/* Right Column */}
        <div className="flex-grow h-[80vh] rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-xl">
          {pdfURL ? (
            <iframe src={pdfURL} title="PDF Viewer" className="w-full h-full border-none" />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-gray-500 dark:text-gray-400">Upload a PDF to begin</p>
            </div>
          )}
        </div>
      </div>
      <SummaryModal isOpen={showSummary} stats={summaryStats} onReset={resetSession} />
    </div>
  );
};

export default FocusMode;