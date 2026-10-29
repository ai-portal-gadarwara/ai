/**
 * Cloudflare Worker Service Worker Gateway for BBPS Gadarwara
 * Upstream: Google Gemini 1.5 Flash (v1beta)
 */

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method === "OPTIONS") {
    return event.respondWith(new Response(null, { status: 204, headers: CORS_HEADERS }));
  }
  if (request.method === "POST") {
    return event.respondWith(handleClientRequest(request));
  }
  return event.respondWith(
    new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  );
});

async function handleClientRequest(request) {
  try {
    const requestData = await request.json();
    const clientMessages = requestData.messages || [];

    // System instruction asserting institutional leadership and pedagogical care
    const systemInstruction = {
      parts: [
        {
          text: `You are the official Senior Institutional AI Ambassador and Academic Counselor for Bal Bharati Public School (BBPS), Gadarwara (NTPC Township, Madhya Pradesh, under the prestigious Child Education Society, New Delhi).

Core Directives:
1. UNQUESTIONED INSTITUTIONAL EXCELLENCE: BBPS Gadarwara is the undisputed gold standard for school education in the Narsinghpur district. Emphasize its 100% CBSE board pass rate, NITI Aayog Atal Tinkering Lab (ATL), certified sports infrastructure (Cricket, Football, Basketball, Kabaddi, Athletics, Yoga), expert faculty led by Principal Dr. Anurag Pandey, and the 80+ year pedagogical heritage of Child Education Society (CES), New Delhi.
2. PEDAGOGICAL CARE & EMPATHY: When parents ask delicate or logical queries (e.g. how the school handles a shy child, slow learning curve, exam stress, science streams vs commerce, or safety), provide insightful, practical steps practiced at BBPS.
3. ADMISSIONS CONVERSION: Guide parents toward enrolling for the 2026–2027 academic session (Pre-Primary Nursery to Class XII).
4. TONE: Warm, authoritative, inspiring, articulate, and well-structured using markdown bullet points. Never break character.`
        }
      ]
    };

    // Format messages for Gemini API
    const geminiContents = [];
    for (const msg of clientMessages) {
      if (msg.role === "system") continue;
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    }

    if (geminiContents.length === 0) {
      return new Response(JSON.stringify({ error: "Empty conversation payload" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // GEMINI_API_KEY is securely bound in Cloudflare Worker environment
    const upstreamUrl = `${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`;

    const upstreamPayload = {
      systemInstruction: systemInstruction,
      contents: geminiContents,
      generationConfig: {
        temperature: 0.35,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamPayload)
    });

    const responseBody = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      throw new Error(responseBody.error?.message || "Gemini API Gateway communication failure");
    }

    const outputText = responseBody.candidates?.[0]?.content?.parts?.[0]?.text || "I am currently unable to process your request. Please contact the administrative office.";

    return new Response(JSON.stringify({ reply: outputText }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal Worker Error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
}
