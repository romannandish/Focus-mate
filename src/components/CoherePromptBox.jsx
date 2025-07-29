import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const CoherePromptBox = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);

  // Fetch last 5 chats on mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/chat");
        setChatHistory(res.data.reverse()); // Show oldest top, newest bottom
      } catch (err) {
        console.error("Error fetching chat history:", err);
      }
    };
    fetchChats();
  }, []);

  // Scroll to bottom when chatHistory updates
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
            Authorization: `Bearer vZodwx9DUzsqFyq8xVo3v422AjAxRCvDLODAsyit`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiReply = cohereRes.data.text;
      setResponse(aiReply);

      // Save to backend
      await axios.post("http://localhost:5000/api/chat", {
        prompt,
        response: aiReply,
      });

      // Update chat history (only last 5)
      setChatHistory((prev) => [
        ...prev.slice(-4), // keep only 4 to make space for the new one
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
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-grow overflow-y-auto p-6" ref={chatContainerRef}>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          AI Doubt Solver 🤖
        </h2>

        {/* Chat History */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {chatHistory.length === 0 ? (
            <p className="text-center text-gray-500">
              No chats yet. Ask something to get started!
            </p>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600 mb-1 font-semibold">You:</p>
                <p className="text-gray-800 whitespace-pre-wrap mb-3">{chat.prompt}</p>
                <p className="text-sm text-blue-600 font-semibold">AI:</p>
                <p className="text-gray-900 whitespace-pre-wrap">{chat.response}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className="bg-white shadow-inner p-4 border-t">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask your question..."
            className="flex-1 resize-none border border-gray-300 rounded-lg p-3 text-sm shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
            rows={2}
          />
          <button
            onClick={handleAskAI}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
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
