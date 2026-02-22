import { Router } from "express";
import { db } from "../lib/db.js";
import { users, personalities, conversations, messages } from "../lib/schema.js";
import { eq, and } from "drizzle-orm";
import { callGroqChat } from "./chatGroq.js";

const router = Router();

async function getOrCreateUser(email, name) {
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(users)
    .values({ email, name })
    .returning();
  return inserted[0];
}

async function getPersonalityById(id) {
  const rows = await db.select().from(personalities).where(eq(personalities.id, id));
  return rows[0] || null;
}

router.post("/send", async (req, res) => {
  try {
    const { email, name, personalityId, message, conversationId } = req.body;

    if (!email || !personalityId || !message) {
      return res.status(400).json({ error: "email, personalityId and message are required" });
    }

    const user = await getOrCreateUser(email, name || null);
    const personality = await getPersonalityById(personalityId);
    if (!personality) {
      return res.status(404).json({ error: "Personality not found" });
    }

    let convId = conversationId;

    if (!convId) {
      const inserted = await db
        .insert(conversations)
        .values({
          userId: user.id,
          personalityId,
          title: message.slice(0, 80),
        })
        .returning();
      convId = inserted[0].id;
    } else {
      const existingConv = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, convId), eq(conversations.userId, user.id)));
      if (existingConv.length === 0) {
        return res.status(404).json({ error: "Conversation not found for this user" });
      }
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const groqMessages = [
      { role: "system", content: personality.systemPrompt },
      ...history.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const groqResult = await callGroqChat({ messages: groqMessages });

    const insertedMessages = await db.transaction(async (tx) => {
      const userMsg = await tx
        .insert(messages)
        .values({
          conversationId: convId,
          sender: "user",
          content: message,
        })
        .returning();

      const assistantMsg = await tx
        .insert(messages)
        .values({
          conversationId: convId,
          sender: "assistant",
          content: groqResult.content,
        })
        .returning();

      await tx
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, convId));

      return { userMsg: userMsg[0], assistantMsg: assistantMsg[0] };
    });

    res.json({
      conversationId: convId,
      userMessage: insertedMessages.userMsg,
      assistantMessage: insertedMessages.assistantMsg,
    });
  } catch (err) {
    console.error("/api/chat/send error", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.get("/conversations", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email is required" });

    const userRows = await db.select().from(users).where(eq(users.email, email));
    if (userRows.length === 0) return res.json([]);

    const user = userRows[0];

    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id));

    res.json(convs);
  } catch (err) {
    console.error("/api/chat/conversations error", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { email } = req.query;
    const { id } = req.params;

    if (!email) return res.status(400).json({ error: "email is required" });

    const userRows = await db.select().from(users).where(eq(users.email, email));
    if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = userRows[0];

    const convRows = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));
    if (convRows.length === 0) return res.status(404).json({ error: "Conversation not found" });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    res.json(msgs);
  } catch (err) {
    console.error("/api/chat/conversations/:id/messages error", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
