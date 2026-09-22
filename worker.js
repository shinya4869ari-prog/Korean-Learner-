export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // CORS preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/dictionary" && request.method === "GET") {
      const word = url.searchParams.get("word");

      if (!word) {
        return new Response(
          JSON.stringify({ error: "word parameter is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        console.log(`Searching for word: ${word}`);
        console.log(
          `Using DB binding: ${env.DB ? "available" : "not available"}`,
        );

        const result = await env.DB.prepare(
          "SELECT word, hanja, pos, meaning, level FROM dictionary WHERE word = ? LIMIT 1",
        )
          .bind(word)
          .first();

        console.log(`Result: ${JSON.stringify(result)}`);

        if (result) {
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ error: "Word not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        console.error(`Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
