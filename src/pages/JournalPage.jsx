import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const JournalPage = () => {
  const [text, setText] = useState("");
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rephrasing, setRephrasing] = useState({}); // { [id]: { loading: bool, variants: string[] } }

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
      toast.success("Journal saved — summary generated");
    } catch (err) {
      console.error("Submit error:", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to save journal";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternates = async (entry, count = 3) => {
    const id = entry._id || entry.date || Math.random().toString(36).slice(2, 9);
    setRephrasing((p) => ({ ...p, [id]: { loading: true, variants: [] } }));
    try {
      const res = await axios.post("http://localhost:5000/api/journal/rephrase", { text: entry.text, count });
      const variants = Array.isArray(res.data) ? res.data : [];
      setRephrasing((p) => ({ ...p, [id]: { loading: false, variants } }));
    } catch (err) {
      console.error("Rephrase error:", err);
      setRephrasing((p) => ({ ...p, [id]: { loading: false, variants: [] } }));
      toast.error(err?.response?.data?.error || "Failed to get variants");
    }
  };

  const saveChosenSummary = async (journalId, summary) => {
    if (!journalId) return toast.error("Cannot update: missing id");
    try {
      const res = await axios.patch(`http://localhost:5000/api/journal/${journalId}`, { summary });
      // update local list
      setJournals((prev) => prev.map((j) => (j._id === journalId ? res.data : j)));
      toast.success("Summary updated");
    } catch (err) {
      console.error("Save summary error:", err);
      toast.error(err?.response?.data?.error || "Failed to update summary");
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
            <Toaster position="top-right" />
            {journals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No journal entries yet.</p>
            ) : (
              journals.map((entry) => (
                <div
                  key={entry._id || entry.date || Math.random().toString(36).slice(2, 9)}
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
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => fetchAlternates(entry, 3)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full shadow"
                    >
                      🔁 Get alternate summaries
                    </button>
                    <div className="text-xs text-gray-500">Try different rewrites of this entry</div>
                  </div>

                  {(() => {
                    const id = entry._id || entry.date || Math.random().toString(36).slice(2, 9);
                    const info = rephrasing[id];
                    if (!info) return null;
                    if (info.loading) return <div className="mt-3 text-xs text-gray-500">Generating variants...</div>;
                    if (Array.isArray(info.variants) && info.variants.length > 0) {
                      return (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-gray-600">Choose one to replace the AI summary:</div>
                          {info.variants.map((v, idx) => (
                            <div key={idx} className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                              <div className="text-sm text-gray-800 dark:text-gray-200">{v}</div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={() => saveChosenSummary(entry._id, v)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded shadow">Save as summary</button>
                                <button onClick={() => navigator.clipboard?.writeText(v) && toast.success('Copied')} className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded">Copy</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
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
