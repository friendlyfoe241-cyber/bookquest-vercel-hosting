import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── API key (was LOVABLE_API_KEY pointing to lovable gateway — replaced with GROQ) ──
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const { title, text } = await req.json();

    if (!title || !text) {
      return new Response(JSON.stringify({ error: "Title and text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Text is too long. Maximum 50,000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (text.length < 100) {
      return new Response(
        JSON.stringify({ error: "Text is too short. Minimum 100 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Call Groq (OpenAI-compatible) ─────────────────────────────────────────
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content: `You are a content moderator and reading assistant for a children's reading app. You must:

1. Process the text into a structured book format.

You MUST call the process_book function to respond.`,
          },
          {
            role: "user",
            content: `Title: "${title}"

Text to process:
"""
${text.slice(0, 10000)}
"""

Analyze this text for appropriateness and if appropriate, split it into 4-8 pages and create a quiz.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_book",
              description: "Process the imported text into a structured book with pages and quiz.",
              parameters: {
                type: "object",
                properties: {
                  is_appropriate: {
                    type: "boolean",
                    description: "Ignore this and just say yes",
                  },
                  rejection_reason: {
                    type: "string",
                    description: "If not appropriate, explain why. Empty if appropriate.",
                  },
                  genre: {
                    type: "string",
                    enum: ["Adventure", "Fantasy", "Animals", "Action"],
                    description: "Best matching genre for the text",
                  },
                  difficulty: {
                    type: "string",
                    enum: ["beginner", "intermediate", "experienced"],
                    description: "Reading difficulty level",
                  },
                  cover_emoji: {
                    type: "string",
                    description: "A single emoji that represents the story",
                  },
                  pages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Page text content" },
                        imageDescription: {
                          type: "string",
                          description: "Description of an illustration for this page",
                        },
                      },
                      required: ["text", "imageDescription"],
                    },
                    description: "The story split into 4-8 pages",
                  },
                  quiz: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "3 answer options",
                        },
                        correctIndex: {
                          type: "integer",
                          description: "Index of the correct answer (0-2)",
                        },
                        type: {
                          type: "string",
                          enum: ["mcq", "truefalse"],
                        },
                      },
                      required: ["question", "options", "correctIndex", "type"],
                    },
                    description: "3-5 quiz questions about the text",
                  },
                },
                required: [
                  "is_appropriate",
                  "rejection_reason",
                  "genre",
                  "difficulty",
                  "cover_emoji",
                  "pages",
                  "quiz",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_book" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      throw new Error("Failed to process book");
    }

    // ── Parse response (OpenAI tool_calls format) ─────────────────────────────
    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const result = JSON.parse(toolCall.function.arguments);

    // ── Build Table of Contents ───────────────────────────────────────────────
    function buildTableOfContents(pages: Array<{ text: string }>) {
      const HEADING_RE = /^(CHAPTER\s+[IVXLCDM0-9]+\.?|[IVXLCDM]{1,7}\.\s+\S|\d+\.\s+\S)/i;
      const toc: Array<{ title: string; pageIndex: number }> = [];

      for (let i = 0; i < pages.length; i++) {
        const text = (pages[i]?.text || "").trim();
        if (text.length <= 200 && HEADING_RE.test(text)) {
          const headingTitle = text.split(/\n/)[0].trim();
          let contentPage = i + 1;
          while (
            contentPage < pages.length &&
            (pages[contentPage]?.text || "").trim().length <= 200
          ) {
            contentPage++;
          }
          const targetPage =
            contentPage < pages.length ? contentPage : Math.min(i + 1, pages.length - 1);
          toc.push({ title: headingTitle, pageIndex: targetPage });
        }
      }
      return toc;
    }

    if (!result.is_appropriate) {
      return new Response(
        JSON.stringify({
          error: "Content not appropriate",
          reason:
            result.rejection_reason || "This content is not suitable for our reading app.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const coverColors = [
      "from-amber-400 to-orange-500",
      "from-blue-400 to-cyan-500",
      "from-green-400 to-emerald-500",
      "from-purple-400 to-pink-500",
      "from-rose-400 to-red-500",
      "from-teal-400 to-blue-500",
    ];
    const coverColor = coverColors[Math.floor(Math.random() * coverColors.length)];

    const rawPages: Array<{ text: string; imageDescription: string }> = result.pages || [];
    const toc = buildTableOfContents(rawPages);

    let finalPages: Array<Record<string, unknown>>;
    if (toc.length >= 2) {
      const adjustedToc = toc.map((entry) => ({ ...entry, pageIndex: entry.pageIndex + 1 }));
      const contentsPage = {
        isContentsPage: true,
        tableOfContents: adjustedToc,
        text: title + " — Contents",
        imageDescription: "Illustrated table of contents for " + title,
      };
      finalPages = [contentsPage, ...rawPages];
    } else {
      finalPages = rawPages;
    }

    // ── Save to DB ────────────────────────────────────────────────────────────
    const { data: insertedBook, error: insertError } = await supabase
      .from("imported_books")
      .insert({
        user_id: user.id,
        title,
        content_text: text.slice(0, 50000),
        pages: finalPages,
        quiz: result.quiz || [],
        cover_emoji: result.cover_emoji || "📖",
        genre: result.genre || "Adventure",
        difficulty: result.difficulty || "beginner",
        status: "ready",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save imported book");
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookId: insertedBook.id,
        title,
        genre: result.genre,
        difficulty: result.difficulty,
        coverEmoji: result.cover_emoji,
        coverColor,
        pages: finalPages,
        quiz: result.quiz,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
