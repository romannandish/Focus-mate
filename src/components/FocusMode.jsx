import React, { useEffect, useRef, useState } from "react";
import * as faceMesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import jsPDF from "jspdf";
import axios from "axios";

// ✅ Summary Modal
const SummaryModal = ({ isOpen, stats, onClose, onStartNew }) => {
  if (!isOpen) return null;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Focus Session Summary", 20, 20);
    doc.setFontSize(12);
    doc.text(`Session Duration: ${stats.totalDuration} mins`, 20, 40);
    doc.text(`Focus Time: ${stats.focusTime} mins`, 20, 50);
    doc.text(`Distraction Time: ${stats.distractionTime} secs`, 20, 60);
    doc.save("session-summary.pdf");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[90%] max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-blue-600">Session Summary</h2>
        <p><strong>Total Duration:</strong> {stats.totalDuration} mins</p>
        <p><strong>Focus Time:</strong> {stats.focusTime} mins</p>
        <p><strong>Distraction Time:</strong> {stats.distractionTime} secs</p>
        <div className="flex justify-center gap-4 mt-6 flex-wrap">
          <button onClick={exportPDF} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">📄 Export PDF</button>
          <button onClick={onStartNew} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">🔁 Start New</button>
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">❌ Dismiss</button>
        </div>
      </div>
    </div>
  );
};

const FocusMode = () => {
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const currentDistractionRef = useRef(null);
  const distractionStartRef = useRef(null);
  const totalDistractionTimeRef = useRef(0);

  const [isRunning, setIsRunning] = useState(false);
  const [sessionLength, setSessionLength] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(sessionLength * 60);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [distractionAlert, setDistractionAlert] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState({});

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (isRunning && timeLeft === 0) {
      stopSession();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = () => {
    const min = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const sec = String(timeLeft % 60).padStart(2, "0");
    return `${min}:${sec}`;
  };

  const onResults = (results) => {
    let type = "";
    if (!results.multiFaceLandmarks?.length) {
      type = "face_not_visible";
    } else {
      const [landmarks] = results.multiFaceLandmarks;
      const leftEye = landmarks[33], rightEye = landmarks[263], noseTip = landmarks[1];
      const eyeMid = (leftEye.x + rightEye.x) / 2;
      const noseOffset = Math.abs(noseTip.x - eyeMid) / Math.abs(rightEye.x - leftEye.x);
      if (noseOffset > 0.10) type = "looking_away";
    }

    if (type) {
      setDistractionAlert(type === "looking_away" ? "👀 Looking Away" : "🚫 No Face");
      if (!currentDistractionRef.current) {
        currentDistractionRef.current = type;
        distractionStartRef.current = new Date();
      }
    } else {
      setDistractionAlert("");
      if (currentDistractionRef.current) {
        const now = new Date();
        const duration = Math.round((now - distractionStartRef.current) / 1000);
        if (duration > 0) totalDistractionTimeRef.current += duration;
        currentDistractionRef.current = null;
        distractionStartRef.current = null;
      }
    }
  };

  const startSession = async () => {
    const faceMeshInstance = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMeshInstance.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMeshInstance.onResults(onResults);
    cameraRef.current = new cam.Camera(videoRef.current, {
      onFrame: async () => await faceMeshInstance.send({ image: videoRef.current }),
      width: 640,
      height: 480,
    });
    cameraRef.current.start();

    setSessionStartTime(new Date().toISOString());
    setIsRunning(true);
    setTimeLeft(sessionLength * 60);
    totalDistractionTimeRef.current = 0;
  };

  const stopSession = async () => {
  cameraRef.current?.stop();
  videoRef.current?.srcObject?.getTracks()?.forEach((track) => track.stop());

  setIsRunning(false);
  const endTime = new Date();
  const startTime = new Date(sessionStartTime);
  const actualSeconds = Math.round((endTime - startTime) / 1000);
  const distractionSeconds = totalDistractionTimeRef.current;
  const focusSeconds = Math.max(0, actualSeconds - distractionSeconds);
  const totalMinutes = Math.round(actualSeconds / 60);
  const focusMinutes = Math.round(focusSeconds / 60);

  setSummaryStats({
    totalDuration: totalMinutes,
    focusTime: focusMinutes,
    distractionTime: distractionSeconds,
  });

  // ✅ Save session to backend
  try {
    await axios.post("http://localhost:5000/api/focus/stop", {
      startTime: sessionStartTime,
      endTime: endTime.toISOString(),
      duration: totalMinutes,
      distractionTime: distractionSeconds,
    });
  } catch (err) {
    console.error("Failed to save focus session:", err);
  }

  setShowSummary(true);
};

  const resetSession = () => {
    cameraRef.current?.stop();
    videoRef.current?.srcObject?.getTracks()?.forEach((track) => track.stop());

    setIsRunning(false);
    setTimeLeft(sessionLength * 60);
    setSessionStartTime(null);
    setDistractionAlert("");
    setShowSummary(false);
    setSummaryStats({});
    totalDistractionTimeRef.current = 0;
    currentDistractionRef.current = null;
    distractionStartRef.current = null;
  };

  return (
    <div className="p-6 max-w-xl mx-auto rounded-lg shadow-xl bg-white relative">
      <video ref={videoRef} autoPlay muted className="mx-auto rounded-lg" />
      <div className="text-center text-4xl font-mono text-blue-700 mt-4">{formatTime()}</div>
      {distractionAlert && (
        <p className="text-center text-red-600 font-semibold mt-3 animate-pulse">{distractionAlert}</p>
      )}
      <div className="flex justify-center gap-4 mt-6 flex-wrap">
        {!isRunning ? (
          <>
            <button onClick={startSession} className="bg-green-500 text-white px-6 py-2 rounded">▶ Start</button>
            <button onClick={resetSession} className="bg-yellow-500 text-white px-6 py-2 rounded">🔄 Reset</button>
          </>
        ) : (
          <button onClick={stopSession} className="bg-red-500 text-white px-6 py-2 rounded">⏹ Stop</button>
        )}
      </div>

      <SummaryModal
        isOpen={showSummary}
        stats={summaryStats}
        onClose={() => setShowSummary(false)}
        onStartNew={() => {
          setShowSummary(false);
          startSession();
        }}
      />
    </div>
  );
};

export default FocusMode;
