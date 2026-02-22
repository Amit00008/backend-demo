import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import chatGroqRouter from "./routes/chatGroq.js";
import chatbotRouter from "./routes/chatbot.js";
import personalitiesRouter from "./routes/personalities.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/groq", chatGroqRouter);
app.use("/api/chat", chatbotRouter);
app.use("/api/personalities", personalitiesRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
