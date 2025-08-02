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
      const res = await axios.post("http://localhost:5000/api/journal", { text });
      setText("");
      setJournals([res.data, ...journals]);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 sm:p-10 space-y-8 transition-all duration-300">

        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">📝 Daily Journal</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Reflect, write, and let AI help summarize your day.</p>
        </header>

        {/* Journal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="journal" className="block text-lg font-medium text-gray-700 dark:text-gray-200">
            Write your thoughts
          </label>
          <textarea
            id="journal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-4 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="What's on your mind today?"
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md transition disabled:opacity-50"
          >
            {loading ? "Summarizing..." : "Submit"}
          </button>
        </form>

        {/* Journal Entries */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">📚 Your Entries</h2>
          <div className="space-y-6">
            {journals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No journal entries yet.</p>
            ) : (
              journals.map((entry, i) => (
                <div
                  key={i}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm transition-all duration-300"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {new Date(entry.date).toLocaleString()}
                  </p>
                  <p className="mb-3 text-gray-800 dark:text-gray-200">
                    <strong>Text:</strong> {entry.text}
                  </p>
                  <p className="text-green-700 dark:text-green-400 font-medium">
                    <strong>AI Summary:</strong> {entry.summary}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default JournalPage;
