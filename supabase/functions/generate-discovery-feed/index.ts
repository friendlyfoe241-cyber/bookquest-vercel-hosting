import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map reading levels to difficulty preferences
const DIFFICULTY_WEIGHTS: Record<string, Record<string, number>> = {
  beginner:    { beginner: 0.7, intermediate: 0.25, experienced: 0.05 },
  reader:      { beginner: 0.2, intermediate: 0.5, experienced: 0.3 },
  experienced: { beginner: 0.05, intermediate: 0.25, experienced: 0.7 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date();
    const hourKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}`;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, reading_level");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: allBooks, error: booksError } = await supabase
      .from("books")
      .select("id, genre, difficulty");

    if (booksError) throw booksError;

    let generated = 0;

    for (const profile of profiles) {
      const userId = profile.user_id;
      const readingLevel = profile.reading_level || "beginner";

      // Check if feed already exists for this hour
      const { data: existing } = await supabase
        .from("discovery_feed")
        .select("id")
        .eq("user_id", userId)
        .eq("feed_date", hourKey)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Get user's liked/disliked books
      const { data: userBooks } = await supabase
        .from("user_books")
        .select("book_id, status")
        .eq("user_id", userId);

      const likedIds = (userBooks || []).filter((b) => b.status === "liked" || b.status === "read").map((b) => b.book_id);
      const dislikedIds = (userBooks || []).filter((b) => b.status === "disliked").map((b) => b.book_id);
      const seenIds = new Set([...likedIds, ...dislikedIds]);

      const likedGenres = [...new Set(
        (allBooks || []).filter((b) => likedIds.includes(b.id)).map((b) => b.genre)
      )];

      const unseenBooks = (allBooks || []).filter((b) => !seenIds.has(b.id));
      if (unseenBooks.length === 0) continue;

      const seed = hashString(hourKey + userId);
      const weights = DIFFICULTY_WEIGHTS[readingLevel] || DIFFICULTY_WEIGHTS.beginner;

      // Score each book by genre preference + difficulty match
      const scored = unseenBooks.map(book => {
        const genreScore = likedGenres.includes(book.genre) ? 0.7 : 0.3;
        const diffScore = weights[book.difficulty] || 0.1;
        // Combined score with some randomness from seed
        const noise = ((hashString(book.id + hourKey) % 100) / 100) * 0.2;
        return { ...book, score: genreScore * 0.5 + diffScore * 0.5 + noise };
      });

      // Sort by score descending, pick top 5
      scored.sort((a, b) => b.score - a.score);
      const topCandidates = scored.slice(0, Math.min(10, scored.length));
      const shuffled = seededShuffle([...topCandidates], seed);
      const feedBooks = shuffled.slice(0, 5);

      const rows = feedBooks.map((book, i) => ({
        user_id: userId,
        book_id: book.id,
        feed_date: hourKey,
        position: i,
        shown: false,
      }));

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("discovery_feed").insert(rows);
        if (insertError) console.error(`Error inserting feed for ${userId}:`, insertError);
        else generated++;
      }
    }

    // Clean up old feed entries (older than 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}T${String(yesterday.getUTCHours()).padStart(2, '0')}`;
    await supabase.from("discovery_feed").delete().lt("feed_date", yesterdayKey);

    return new Response(
      JSON.stringify({ message: `Generated feeds for ${generated} users`, hourKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 2654435761) % (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
