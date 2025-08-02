import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const CoherePromptBox = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/chat");
        setChatHistory(res.data.reverse());
      } catch (err) {
        console.error("Error fetching chat history:", err);
      }
    };
    fetchChats();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    console.log("📜 Chat History Updated:", chatHistory);
  }, [chatHistory]);

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const cohereRes = await axios.post(
        "https://api.cohere.ai/v1/chat",
        {
          message: prompt,
          model: "command-r-plus",
          chat_history: [],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiReply = cohereRes.data.text;
      setResponse(aiReply);

      await axios.post("http://localhost:5000/api/chat", {
        prompt,
        response: aiReply,
      });

      setChatHistory((prev) => [
        ...prev.slice(-4),
        { prompt, response: aiReply },
      ]);

      setPrompt("");
    } catch (err) {
      console.error("Error:", err.response?.data || err.message);
      setResponse("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-100 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Header */}
      <header className="py-6 px-4 bg-white/70 dark:bg-gray-900/70 shadow-md backdrop-blur border-b dark:border-gray-700">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
          Smart AI Doubt Solver 🤖
        </h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Ask any question and get instant help from AI.
        </p>
      </header>

      {/* Chat Area */}
      <div
        className="flex-grow overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full"
        ref={chatContainerRef}
      >
        {chatHistory.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No chats yet. Ask something to get started!
          </p>
        ) : (
          chatHistory.map((chat, index) => (
            <div key={index} className="space-y-3">
              <div className="self-end max-w-[80%] bg-blue-500 text-white p-4 rounded-xl shadow-md">
                <p className="text-sm font-semibold mb-1">You</p>
                <p className="whitespace-pre-wrap">{chat.prompt}</p>
              </div>
              <div className="self-start max-w-[80%] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 rounded-xl shadow-md border dark:border-gray-600">
                <p className="text-sm font-semibold mb-1 text-blue-600 dark:text-blue-400">AI</p>
                <p className="whitespace-pre-wrap">{chat.response}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-900 p-4 shadow-inner border-t dark:border-gray-700">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask your question..."
            className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm shadow-sm focus:outline-none focus:ring focus:ring-blue-300 dark:bg-gray-800 dark:text-white"
            rows={2}
          />
          <button
            onClick={handleAskAI}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !prompt.trim()}
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoherePromptBox;
