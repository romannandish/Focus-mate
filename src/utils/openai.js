const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.generateSummary = async (text) => {
  const prompt = `Summarize the following journal entry in 1-2 lines:\n\n${text}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content.trim();
};

exports.generateTip = async (text) => {
  const prompt = `You are a helpful AI assistant. Based on this week's journal reflections, suggest 1 self-improvement or productivity tip:\n\n${text}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content.trim();
};
