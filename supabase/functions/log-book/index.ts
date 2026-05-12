import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, author, type } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate submissions
    const { data: existing } = await supabase
      .from("imported_books")
      .select("id")
      .eq("user_id", user.id)
      .ilike("title", title.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "You've already logged this book!" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limit: max 5 per day
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("imported_books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Daily limit reached (5 books per day)" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate quiz using AI
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a reading comprehension quiz generator for teenagers. Generate exactly 5 higher-order thinking questions about the book. Focus on themes, character motivations, plot implications, and literary analysis rather than surface-level recall. Mix multiple-choice and true/false questions.

Return ONLY a valid JSON array of question objects with this structure:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"type":"mcq"},{"question":"...","options":["True","False"],"correctIndex":0,"type":"truefalse"}]`,
            },
            {
              role: "user",
              content: `Generate a quiz for the book "${title.trim()}"${
                author ? ` by ${author.trim()}` : ""
              }. Include questions about themes, character development, and deeper meaning.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_quiz",
                description: "Generate quiz questions for a book",
                parameters: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: {
                            type: "array",
                            items: { type: "string" },
                          },
                          correctIndex: { type: "integer" },
                          type: {
                            type: "string",
                            enum: ["mcq", "truefalse"],
                          },
                        },
                        required: [
                          "question",
                          "options",
                          "correctIndex",
                          "type",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["questions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_quiz" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, try again later" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let quiz = [];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        quiz = parsed.questions || [];
      }
    } catch {
      console.error("Failed to parse AI quiz response");
    }

    // Store the logged book
    const { data: inserted, error: insertError } = await supabase
      .from("imported_books")
      .insert({
        user_id: user.id,
        title: title.trim(),
        content_text: `Logged: ${title.trim()}${
          author ? ` by ${author.trim()}` : ""
        }`,
        status: "ready",
        quiz: quiz,
        pages: [],
        genre: "Adventure",
        difficulty: "beginner",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Award XP for logging a book
    await supabase.from("xp_log").insert({
      user_id: user.id,
      xp_amount: 25,
      source: "book_log",
    });

    // Update profile XP
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, coins")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          xp: ((profile as any).xp || 0) + 25,
          coins: ((profile as any).coins || 0) + 5,
        } as any)
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        book: inserted,
        quiz_count: quiz.length,
        xp_earned: 25,
        coins_earned: 5,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("log-book error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
