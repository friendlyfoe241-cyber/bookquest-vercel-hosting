/**
 * fetch-book-text
 *
 * Proxy edge function that downloads a plain-text file from Project Gutenberg
 * and returns it to the client. Running this server-side sidesteps the CORS
 * restrictions that Gutenberg places on direct browser fetches.
 *
 * Request body: { textUrl: string, gutenbergId: number }
 * Response:     { text: string }  |  { error: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Project Gutenberg adds a long legal header and footer that we want to strip
// so the AI receives only the actual book text.
// The header ends just before the chapter/story starts; the footer begins at
// the standard END marker.
function stripGutenbergBoilerplate(text: string): string {
  // Strip header — everything up to (and including) the first occurrence of
  // "*** START OF THE PROJECT GUTENBERG" or "***START OF THIS PROJECT GUTENBERG"
  const startMarkerRe =
    /\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i;
  const startMatch = startMarkerRe.exec(text);
  if (startMatch) {
    text = text.slice(startMatch.index + startMatch[0].length);
  }

  // Strip footer — everything from "*** END OF THE PROJECT GUTENBERG" onward
  const endMarkerRe = /\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG/i;
  const endMatch = endMarkerRe.exec(text);
  if (endMatch) {
    text = text.slice(0, endMatch.index);
  }

  return text.trim();
}

// Resolve alternative Gutenberg mirror URLs if the primary URL fails.
// Gutenberg serves plain text at several predictable paths.
function buildCandidateUrls(textUrl: string, gutenbergId: number): string[] {
  const urls: string[] = [textUrl];

  const id = Number(gutenbergId);
  if (!Number.isNaN(id) && id > 0) {
    // Modern cache endpoint (most reliable)
    urls.push(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`);
    // Legacy /files/ layout — try UTF-8 variant first, then plain
    urls.push(`https://www.gutenberg.org/files/${id}/${id}-0.txt`);
    urls.push(`https://www.gutenberg.org/files/${id}/${id}.txt`);
  }

  // De-duplicate while preserving order
  return [...new Set(urls)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { textUrl, gutenbergId } = await req.json();

    if (!textUrl && !gutenbergId) {
      return new Response(
        JSON.stringify({ error: "textUrl or gutenbergId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidates = buildCandidateUrls(textUrl ?? "", gutenbergId ?? 0);

    let rawText: string | null = null;
    let lastError = "";

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: {
            // Gutenberg blocks requests without a user-agent
            "User-Agent": "BookQuestApp/1.0 (educational reading app)",
            "Accept": "text/plain, text/html;q=0.9, */*;q=0.8",
          },
          // 20-second timeout
          signal: AbortSignal.timeout(20_000),
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status} from ${url}`;
          continue;
        }

        const contentType = res.headers.get("content-type") ?? "";
        // Only accept plain text; skip HTML error pages
        if (contentType.includes("text/html")) {
          lastError = `Got HTML instead of plain text from ${url}`;
          continue;
        }

        rawText = await res.text();
        break; // success — stop trying
      } catch (fetchErr) {
        lastError = String(fetchErr);
        // Try next candidate
      }
    }

    if (!rawText || rawText.length < 100) {
      console.error("fetch-book-text failed:", lastError);
      return new Response(
        JSON.stringify({
          error:
            "Could not download book text from Project Gutenberg. " +
            "The server may be temporarily unavailable — please try again in a moment.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanText = stripGutenbergBoilerplate(rawText);

    return new Response(
      JSON.stringify({ text: cleanText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-book-text error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
