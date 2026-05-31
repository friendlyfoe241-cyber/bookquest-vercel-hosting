/**
 * identify-book-cover
 *
 * Uses the existing GROQ_API_KEY with llama-3.2-90b-vision-preview to:
 *  1. Identify a book from a cover photo
 *  2. Generate 5 quiz questions about it
 *
 * Two-step approach (vision first, then quiz tool-call) because GROQ vision
 * models work more reliably when tool-calling is separated from image input.
 *
 * Request body: { imageBase64: string, mimeType: string }
 * Response:     { title, author, genre, difficulty, coverEmoji, quiz[] }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "").trim(),
    );
    if (authErr || !user) return json({ error: "Invalid authentication" }, 401);

    // ── Parse request ─────────────────────────────────────────────────────────
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);

    if (imageBase64.length > 7_000_000) {
      return json({ error: "Image too large — please use a smaller photo." }, 400);
    }

    // ── STEP 1: Vision model identifies the book ──────────────────────────────
    const visionRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: "text",
                text: `Look at this book cover and identify it. Reply with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "title": "...",
  "author": "...",
  "confidence": "high" | "medium" | "low"
}
If you cannot identify the book, set confidence to "low" and use your best guess for title/author.`,
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      console.error("GROQ vision error:", visionRes.status, errText.slice(0, 300));
      if (visionRes.status === 429)
        return json({ error: "Too many requests — please try again shortly." }, 429);
      throw new Error(`GROQ vision returned ${visionRes.status}`);
    }

    const visionData = await visionRes.json();
    const rawText = visionData.choices?.[0]?.message?.content || "";

    let identified = { title: "", author: "", confidence: "low" };
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      identified = JSON.parse(cleaned);
    } catch {
      // Try regex extraction as fallback
      const titleMatch  = rawText.match(/"title"\s*:\s*"([^"]+)"/);
      const authorMatch = rawText.match(/"author"\s*:\s*"([^"]+)"/);
      const confMatch   = rawText.match(/"confidence"\s*:\s*"([^"]+)"/);
      identified = {
        title:      titleMatch?.[1]  || "",
        author:     authorMatch?.[1] || "Unknown",
        confidence: confMatch?.[1]   || "low",
      };
    }

    if (!identified.title || identified.confidence === "low") {
      return json({
        error:
          "Couldn't identify this book clearly. " +
          "Try a well-lit, straight-on photo of the front cover.",
      }, 422);
    }

    // ── STEP 2: Generate quiz + metadata with tool calling ────────────────────
    const quizRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a reading quiz generator for a children's app (ages 10-17). " +
              "Generate thoughtful questions about themes, characters, and plot — not trivial facts.",
          },
          {
            role: "user",
            content: `Generate quiz metadata and 5 questions for the book "${identified.title}" by ${identified.author}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_quiz",
              description: "Return genre, difficulty, emoji, and quiz questions for the book",
              parameters: {
                type: "object",
                additionalProperties: false,
                required: ["genre", "difficulty", "cover_emoji", "quiz"],
                properties: {
                  genre: {
                    type: "string",
                    enum: ["Adventure", "Fantasy", "Animals", "Action"],
                  },
                  difficulty: {
                    type: "string",
                    enum: ["beginner", "intermediate", "experienced"],
                  },
                  cover_emoji: {
                    type: "string",
                    description: "Single emoji representing the book",
                  },
                  quiz: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["question", "options", "correctIndex", "type"],
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "3-4 answer choices",
                        },
                        correctIndex: {
                          type: "integer",
                          description: "0-based index of correct answer",
                        },
                        type: {
                          type: "string",
                          enum: ["mcq", "truefalse"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_quiz" } },
        temperature: 0.4,
      }),
    });

    if (!quizRes.ok) {
      const errText = await quizRes.text();
      console.error("GROQ quiz error:", quizRes.status, errText.slice(0, 300));
      throw new Error(`GROQ quiz generation returned ${quizRes.status}`);
    }

    const quizData  = await quizRes.json();
    const toolCall  = quizData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return quiz data");

    const quizResult = JSON.parse(toolCall.function.arguments);

    return json({
      title:      identified.title,
      author:     identified.author,
      genre:      quizResult.genre      || "Adventure",
      difficulty: quizResult.difficulty || "intermediate",
      coverEmoji: quizResult.cover_emoji || "📖",
      quiz:       quizResult.quiz        || [],
    });

  } catch (err) {
    console.error("identify-book-cover error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});
