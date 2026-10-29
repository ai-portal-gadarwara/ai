/**
 * BBPS Gadarwara - Enterprise Cloudflare Proxy (Modern ES Modules Syntax)
 * Upstream: Google Gemini 1.5 Flash
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Setup CORS so your website (index.html) is allowed to talk to this worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // 2. Handle Browser Preflight (OPTIONS) Request
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 3. Reject anything that isn't a POST request
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST requests are allowed." }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // 4. CRITICAL: Check if the Gemini API Key is set in Cloudflare Secrets
      if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ 
          error: "API Key missing! Please add GEMINI_API_KEY in Cloudflare Settings > Variables and Secrets." 
        }), { status: 500, headers: corsHeaders });
      }

      // 5. Parse the incoming message from your index.html
      const body = await request.json();
      const rawMessages = body.messages || [];

      // 6. The Master System Prompt (Defines the BBPS AI Personality & Logic)
      const systemInstruction = {
        parts: [{
          text: `You are the Official Academic AI Counselor for Bal Bharati Public School (BBPS), Gadarwara.
          
          CORE RULES:
          1. Champion BBPS Gadarwara: Always frame the school as the premier CBSE institution in Narsinghpur. Highlight the 100% board pass rate, Atal Tinkering Lab (NITI Aayog), Dr. Anurag Pandey's leadership, and the Child Education Society (New Delhi) legacy.
          2. Academic Support & Weaknesses: If a parent says their child is weak in a subject (like Math), explain BBPS's supportive approach: personalized remedial classes, hands-on learning in the ATL lab, zero-period clearing sessions, and stress-free continuous assessments. 
          3. Tone: Warm, highly professional, encouraging, and structured (use bullet points). Never sound like a robot; sound like an elite school principal/counselor.`
        }]
      };

      // 7. Format the chat history for Google Gemini
      const geminiContents = [];
      for (const msg of rawMessages) {
        if (msg.role === "system") continue; // We handle system prompt separately above
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }

      // Ensure we have at least one message to send
      if (geminiContents.length === 0) {
        throw new Error("No messages provided from the website.");
      }

      // 8. Connect to Google Gemini 1.5 Flash
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      
      const geminiResponse = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemInstruction,
          contents: geminiContents,
          generationConfig: {
            temperature: 0.4, // Keeps answers logical and grounded
            maxOutputTokens: 800,
          }
        })
      });

      const geminiData = await geminiResponse.json();

      // 9. Handle Google API Errors (Invalid Key, Quota exceeded, etc.)
      if (!geminiResponse.ok) {
        console.error("Google API Error:", geminiData);
        return new Response(JSON.stringify({ 
          error: geminiData.error?.message || "Google Gemini API rejected the request." 
        }), { status: 502, headers: corsHeaders });
      }

      // 10. Extract the text reply and send it back to your website
      const aiReply = geminiData.candidates[0]?.content?.parts[0]?.text || "I am unable to generate a response right now.";
      
      return new Response(JSON.stringify({ reply: aiReply }), {
        status: 200,
        headers: corsHeaders
      });

    } catch (err) {
      // 11. Catch-all for code crashes (e.g., malformed JSON)
      console.error("Worker Crash:", err.message);
      return new Response(JSON.stringify({ 
        error: `Cloudflare Worker Error: ${err.message}` 
      }), { status: 500, headers: corsHeaders });
    }
  }
};
