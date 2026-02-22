import { Router } from "express";
import { db } from "../lib/db.js";
import { personalities } from "../lib/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(personalities);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/personalities error", err);
    res.status(500).json({ error: "Failed to fetch personalities" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, systemPrompt } = req.body;
    if (!name || !systemPrompt) {
      return res.status(400).json({ error: "name and systemPrompt are required" });
    }

    const inserted = await db
      .insert(personalities)
      .values({ name, description: description || null, systemPrompt })
      .returning();

    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("POST /api/personalities error", err);
    res.status(500).json({ error: "Failed to create personality" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, systemPrompt } = req.body;

    const updated = await db
      .update(personalities)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(systemPrompt !== undefined ? { systemPrompt } : {}),
      })
      .where(eq(personalities.id, id))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: "Personality not found" });

    res.json(updated[0]);
  } catch (err) {
    console.error("PUT /api/personalities/:id error", err);
    res.status(500).json({ error: "Failed to update personality" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(personalities)
      .where(eq(personalities.id, id))
      .returning();

    if (deleted.length === 0) return res.status(404).json({ error: "Personality not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/personalities/:id error", err);
    res.status(500).json({ error: "Failed to delete personality" });
  }
});

export default router;
