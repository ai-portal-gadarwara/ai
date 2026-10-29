export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const { query, chatHistory } = await request.json();

      if (!query || typeof query !== "string") {
        return new Response(JSON.stringify({ error: "Invalid query payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "API key configuration missing on Cloudflare server" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const systemInstruction = `
You are the official Senior Institutional AI Helpdesk Consultant for Bal Bharati Public School (BBPS), Gadarwara.
Institution Details:
- Affiliation: CBSE, New Delhi. Co-educational, Nursery to Class 12.
- Governance: Managed by the Child Education Society (CES), New Delhi, situated inside the NTPC Gadarwara Super Thermal Power Project Township, Gangai, Narsinghpur District, Madhya Pradesh (PIN 487770).
- Principal: Dr. Anurag Pandey. Visitor office hours with the Principal are strictly 10:00 AM to 11:30 AM by prior appointment.
- Academic Standards: Proven track record of 100% board examination pass rates in both Class X and Class XII.
- Senior Secondary Streams: 
  * Science: English Core, Physics, Chemistry, with options for Mathematics, Biology, Computer Science, Artificial Intelligence (AI), and Physical Education.
  * Commerce: English Core, Accountancy, Business Studies, Economics, with Applied Mathematics, Informatics Practices, or Physical Education.
- Infrastructure: Atal Tinkering Lab (ATL - NITI Aayog supported featuring 3D Printers, Microcontrollers, and Robotics testbenches), modern Science & Computer Laboratories, High-Definition Smart Classrooms, complete campus CCTV surveillance, Infirmary, and multi-sport grounds (Football, Cricket, Basketball, Athletics, Kabaddi, and Yoga).
- School Timings: Student hours run 7:45 AM – 2:00 PM (Monday through Saturday; closed on 2nd Saturdays). The Administrative Office is accessible 8:30 AM – 1:30 PM.
- Admissions: Nursery entry age is 3+ years; Class I age requirement is 6+ years as of March 31st of the academic year. Official admission inquiries are formalized through the digital portal admission form.

Response Directives:
1. Grounding: Answer strictly using verified facts above. Never fabricate fee figures, names of unverified faculty, or speculative promises.
2. Structure: Maintain a professional, articulate tone. Format responses with concise bullet points where appropriate. Maximum 3 to 4 sentences or a tightly formatted list.
3. Call to Action: When the user asks about enrollment, admissions, or registrations, explicitly instruct them to use the "Fill Admission Form" action button inside the portal.
`;

      const contents = [];
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        chatHistory.slice(-4).forEach((msg) => {
          contents.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.text }]
          });
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: query }]
      });

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300
        }
      };

      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(JSON.stringify({ error: "Gemini Engine Error", details: errText }), {
          status: geminiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const geminiData = await geminiRes.json();
      const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
