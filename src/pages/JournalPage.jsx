import React, { useState, useEffect } from "react";
import axios from "axios";

const JournalPage = () => {
  const [text, setText] = useState("");
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchJournals = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/journal");
      setJournals(res.data);
    } catch (err) {
      console.error("Error loading journals:", err);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/journal", {
        text,
      });
      setText("");
      setJournals([res.data, ...journals]);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Daily Journal</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full border rounded p-2 mb-2"
          placeholder="Write your thoughts..."
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Summarizing..." : "Submit"}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Your Entries</h2>
      <div className="space-y-4">
        {journals.map((entry, i) => (
          <div key={i} className="border rounded p-3 bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">
              {new Date(entry.date).toLocaleString()}
            </p>
            <p className="mb-2"><strong>Text:</strong> {entry.text}</p>
            <p className="text-green-700">
              <strong>AI Summary:</strong> {entry.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JournalPage;
