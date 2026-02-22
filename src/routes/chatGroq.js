import { Router } from "express";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const router = Router();

async function callGroqChat({ messages, model = "llama-3.1-70b-versatile", temperature = 0.7, maxTokens = 1024 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error("Invalid Groq API response");
  }

  return {
    content: choice.message.content,
    raw: data,
  };
}

router.post("/completions", async (req, res) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const result = await callGroqChat({ messages, model, temperature, maxTokens });

    res.json({
      message: result.content,
    });
  } catch (err) {
    console.error("/api/chat/completions error", err);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export { callGroqChat };
export default router;
