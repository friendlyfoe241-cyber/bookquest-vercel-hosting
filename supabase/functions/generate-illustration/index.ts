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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pageText } = await req.json();

    if (!pageText || typeof pageText !== "string") {
      return json({ error: "pageText is required" }, 400);
    }

    const POLLINATIONS_API_KEY = Deno.env.get("POLLINATIONS_API_KEY");
    if (!POLLINATIONS_API_KEY) {
      return json({ image: null, error: "POLLINATIONS_API_KEY not configured" });
    }

    // Build a concise prompt from page text
    const summary = pageText.slice(0, 400);
    const prompt = `Storybook illustration, no text in image, painterly style, soft lighting, detailed characters setting and action. Scene: ${summary}`;

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=512&height=512&nologo=true`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${POLLINATIONS_API_KEY}` },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`Pollinations error [${response.status}]`);
      return json({ image: null, error: "Generation failed" });
    }

    // Pollinations returns raw image bytes — convert to data URL
    const imageBytes = new Uint8Array(await response.arrayBuffer());
    if (imageBytes.length < 1000) {
      console.error("Pollinations returned too-small response, likely an error");
      return json({ image: null, error: "Generation returned empty image" });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Base64 encode
    let binary = "";
    for (let i = 0; i < imageBytes.length; i++) {
      binary += String.fromCharCode(imageBytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${contentType};base64,${base64}`;

    return json({ image: dataUrl });
  } catch (error) {
    console.error("generate-illustration error:", error);
    return json({ image: null, error: "Internal server error" });
  }
});
