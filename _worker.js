export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { query } = await request.json();

      // 2. Official BBPS Knowledge Base
      const schoolContext = `
        You are the official AI Helpdesk Assistant for Bal Bharati Public School (BBPS), Gadarwara.
        Use ONLY the following facts to answer the user politely and concisely in 2-3 sentences:
        - Principal: Dr. Anurag Pandey (Visiting hours: 10:00 AM – 11:30 AM).
        - Board: CBSE affiliated, Nursery to Class 12.
        - Streams in Class 11-12: Science (PCM/PCB) and Commerce. Skill subjects include Artificial Intelligence (AI).
        - Timings: Student hours are 7:45 AM to 2:00 PM (Mon-Sat, 2nd Saturday off). Admin office is 8:30 AM to 1:30 PM.
        - Facilities: Atal Tinkering Lab (ATL) for robotics, smart classrooms, 24x7 CCTV, and sports (Football, Cricket, Kabaddi, Yoga).
        - Results: 100% pass record in Class 10 & 12 CBSE boards.
        - Address: NTPC Township, Gangai, Gadarwara, Narsinghpur, MP - 487770.
        If the user asks to fill a form or apply, guide them to click the "Fill Admission Form" button in the menu.
      `;

      // 3. Connect to Gemini securely using your Cloudflare Secret Key
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: schoolContext + "\n\nUser Question: " + query }],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

      return new Response(JSON.stringify({ reply }), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }
  },
};
