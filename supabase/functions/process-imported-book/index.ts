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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user from JWT
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

    const { title, text } = await req.json();

    if (!title || !text) {
      return new Response(JSON.stringify({ error: "Title and text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: "Text is too long. Maximum 50,000 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length < 100) {
      return new Response(JSON.stringify({ error: "Text is too short. Minimum 100 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Content moderation + processing in a single AI call
    const systemPrompt = `You are a content moderator and reading assistant for a children's reading app. You must:

1. MODERATE: Check if the text is appropriate for children (ages 6-14). Reject any content with:
   - Violence, gore, or horror
   - Sexual content or innuendo
   - Profanity or hate speech
   - Drug or alcohol references
   - Self-harm or dangerous activities
   - Discriminatory content

2. If APPROPRIATE, process the text into a structured book format.

You MUST respond using the provided tool.`;

    const userPrompt = `Title: "${title}"

Text to process:
"""
${text.slice(0, 10000)}
"""

Analyze this text for appropriateness and if appropriate, split it into 4-8 pages and create a quiz.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
                    description: "Whether the content is appropriate for children",
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
                required: ["is_appropriate", "rejection_reason", "genre", "difficulty", "cover_emoji", "pages", "quiz"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_book" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("Failed to process book");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const result = JSON.parse(toolCall.function.arguments);

    if (!result.is_appropriate) {
      return new Response(
        JSON.stringify({
          error: "Content not appropriate",
          reason: result.rejection_reason || "This content is not suitable for our reading app.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Save to database
    const coverColors = [
      "from-amber-400 to-orange-500",
      "from-blue-400 to-cyan-500",
      "from-green-400 to-emerald-500",
      "from-purple-400 to-pink-500",
      "from-rose-400 to-red-500",
      "from-teal-400 to-blue-500",
    ];
    const coverColor = coverColors[Math.floor(Math.random() * coverColors.length)];

    const { data: insertedBook, error: insertError } = await supabase
      .from("imported_books")
      .insert({
        user_id: user.id,
        title,
        content_text: text.slice(0, 50000),
        pages: result.pages || [],
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
        pages: result.pages,
        quiz: result.quiz,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
