/**
 * Bal Bharati Public School (BBPS), Gadarwara - Official AI Gateway Worker
 * Standard: ES Modules (Cloudflare Workers Runtime v3)
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    };

    // 1. Handle Preflight OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 2. Health check endpoint (Useful for verifying deployment status)
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          entity: "Bal Bharati Public School, Gadarwara",
          engine: "Gemini 1.5 Flash Proxy",
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Only POST is accepted." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      // 3. Verify GEMINI_API_KEY binding
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({
            error: "Configuration Error: GEMINI_API_KEY is not defined in Cloudflare Worker secrets."
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Parse incoming payload safely
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON in request body." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientMessages = Array.isArray(body.messages) ? body.messages : [];
      if (clientMessages.length === 0) {
        return new Response(
          JSON.stringify({ error: "No messages provided in conversation payload." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 5. System Knowledge & Thinking Directive
      const institutionalSystemInstruction = {
        parts: [
          {
            text: `You are the official Senior Academic Counselor and Lead Pedagogical Ambassador for Bal Bharati Public School (BBPS), Gadarwara (NTPC Township, Narsinghpur District, MP; under the Child Education Society, New Delhi).

PRIMARY INSTITUTIONAL FACTS:
- Leadership: Dr. Anurag Pandey, Principal (Visiting hours: 10:00 AM – 11:30 AM on working days).
- Academic Record: 100% CBSE pass result consistently in Class 10 and Class 12.
- Innovation Infrastructure: Sanctioned Atal Tinkering Lab (ATL - NITI Aayog supported with 3D Printing, Robotics, IoT Sensors, Microcontrollers).
- Senior Secondary Streams:
  1. Science: PCM / PCB with English Core, accompanied by electives: Artificial Intelligence (AI), Computer Science, and Physical Education.
  2. Commerce: Accountancy, Business Studies, Economics, with Applied Mathematics, Informatics Practices, or Physical Education.
- Campus: CCTV secured, lush green township, medical infirmary, RO water facilities.
- Sports Arenas: Football, Cricket, Basketball, Athletics, Kabaddi, and certified Yoga.
- Admissions: Nursery (3+ years), Class 1 (6+ years) as of March 31.

THINKING & REASONING RULES:
1. When parents or students ask logical, diagnostic, or sensitive educational questions (e.g., "My child is weak in mathematics", "How do you help shy students?", "Why choose BBPS over local alternatives?"):
   - Think pedagogically before answering.
   - Outline concrete, empathetic, multi-step solutions practiced at BBPS (diagnostic gap analysis, zero-period clearing, hands-on ATL math lab visualization, regular mentor-parent sync, stress-free continuous assessment).
2. Present structured, clear Markdown responses using bold headings, bullet points, and actionable takeaways.
3. Keep the tone warm, highly professional, encouraging, and authoritative.`
          }
        ]
      };

      // 6. Map messages for Gemini contents array
      const contents = [];
      for (const msg of clientMessages) {
        if (!msg.content || typeof msg.content !== "string") continue;
        if (msg.role === "system") continue;
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }

      if (contents.length === 0) {
        return new Response(
          JSON.stringify({ error: "Payload did not contain valid text messages." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 7. Request to Google Gemini API
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const upstreamResponse = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: institutionalSystemInstruction,
          contents: contents,
          generationConfig: {
            temperature: 0.35,
            topP: 0.95,
            maxOutputTokens: 1200
          }
        })
      });

      const responseData = await upstreamResponse.json();

      if (!upstreamResponse.ok) {
        const errorMsg = responseData.error?.message || "Upstream Gemini API returned an error.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: upstreamResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to formulate an answer. Please contact the administrative desk.";

      return new Response(
        JSON.stringify({ reply: generatedText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Internal Worker Proxy Exception" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
};
