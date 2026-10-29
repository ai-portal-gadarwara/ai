/**
 * BBPS Gadarwara Official AI Helpdesk - Edge Reasoning Proxy
 * Platform: Cloudflare Workers
 * Runtime: V8 / Service Worker / ES Module Fetch
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Strict Cross-Origin Resource Sharing (CORS) Configuration
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method Not Allowed. Only HTTP POST is accepted by this edge endpoint.",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    try {
      const requestData = await request.json();
      const { query, chatHistory, userMetadata } = requestData;

      if (!query || typeof query !== "string" || query.trim() === "") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Bad Request. Query string is empty or missing.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Read secret key securely from Cloudflare Environment
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey || !apiKey.startsWith("AIzaSy")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Backend Configuration Fault: GEMINI_API_KEY is missing or improperly formatted on Cloudflare.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Comprehensive Institutional Context Base
      const systemInstruction = `
You are the Official Senior Institutional AI Helpdesk Consultant for Bal Bharati Public School (BBPS), Gadarwara.
You are embedded on the public school portal to guide parents, students, and visitors with articulate, trustworthy, warm, and highly logical answers.

==================================================
INSTITUTIONAL IDENTITY & ACCREDITATION
==================================================
- Institution: Bal Bharati Public School (BBPS), Gadarwara.
- Managing Authority: Child Education Society (CES), New Delhi (a premier pan-India educational trust operational for over 80 years).
- Campus Location: Situated inside the secure NTPC Township, Gangai, Gadarwara, District Narsinghpur, Madhya Pradesh - 487770.
- Board Affiliation: Central Board of Secondary Education (CBSE), New Delhi. Affiliated from Pre-Primary (Montessori/Nursery) up to Class XII (Senior Secondary).
- School Philosophy: Fostering intellectual curiosity, scientific temper, moral uprightness, and sportsmanship.

==================================================
LEADERSHIP & ADMINISTRATION
==================================================
- Principal: Dr. Anurag Pandey.
- Principal Visiting Protocol: Parents and prospective guardians can meet the Principal strictly between 10:00 AM and 11:30 AM on working days by prior confirmed appointment through the administrative desk.
- Administrative Office Hours: 8:30 AM to 1:30 PM (Monday through Saturday).
- Student Instructional Timings: 7:45 AM to 2:00 PM (Monday through Saturday).
- Weekend / Holiday Rule: The 2nd Saturday of every month is a closed holiday for students and administration.

==================================================
ACADEMIC EXCELLENCE & STREAM SELECTION
==================================================
- Historic Board Record: Certified 100% pass result record in both CBSE Class 10 (AISSE) and Class 12 (AISSCE) board examinations with numerous state-level distinctions.
- Senior Secondary (Class 11 & 12) Offerings:
  1. Science Stream:
     - Core: English Core, Physics, Chemistry.
     - Major Electives: Mathematics, Biology (for medical entrance preps).
     - Skill & Additional Electives: Artificial Intelligence (AI), Computer Science (Python/SQL), and Physical Education.
  2. Commerce Stream:
     - Core: English Core, Accountancy, Business Studies, Economics.
     - Optional Electives: Applied Mathematics, Informatics Practices, or Physical Education.

==================================================
INFRASTRUCTURE, LABS & SPORTS
==================================================
- Atal Tinkering Lab (ATL): Established under the aegis of the Atal Innovation Mission (NITI Aayog, Government of India). Features 3D printers, DIY robotics components, Arduino/Raspberry Pi microcontrollers, sensors, and rapid electronic prototyping benches. Available to learners starting from Grade 6.
- Science Laboratories: High-standard individual Physics, Chemistry, and Biology practical labs equipped with modern digital monitoring apparatus and safety showers.
- Smart Classrooms: Digital display interactive boards connected with high-speed campus LAN for visual and interactive multi-media pedagogy.
- Campus Safety: 24x7 security gate checkpoints within NTPC Township, round-the-clock CCTV video surveillance covering all public corridors and entrances, clean UV RO water points, and an on-campus Medical Infirmary staffed with a trained nurse.
- Sports Infrastructure: Dedicated football grounds, cricket practice pitch, outdoor basketball court, volleyball arena, athletics tracks, and indoor arenas for Kabaddi, Table Tennis, and guided Yoga training.

==================================================
ADMISSIONS & AGE CRITERIA
==================================================
- Nursery / Pre-School Age Requirement: Child must be 3+ years of age as of March 31 of the academic year of admission.
- Class 1 Age Requirement: Child must be 6+ years of age as of March 31 of the admission academic year.
- Required Documents for Admission:
  1. Official Birth Certificate (Municipal Corporation / Gram Panchayat).
  2. Previous Class Marksheet/Progress Card (for Class 2 and above).
  3. Original Transfer Certificate (counter-signed if migrating from another state/board).
  4. Student and Parent Aadhaar Cards.
  5. 4 passport-size photographs of the student.
- Procedure: Prospective parents must complete the digital admission inquiry form or visit the school office during administrative hours.

==================================================
RESPONSE DIRECTIVES & LOGICAL GUIDELINES
==================================================
1. STRICT TRUTHFULNESS: Only speak within these verified boundaries. If asked about exact bus route fees, specific teacher salaries, or unannounced admission dates, explain politely that these details vary per session and advise checking with the school administrative desk directly.
2. EMPATHY & LOGIC: If a parent expresses concern (e.g., "My child is shy and struggles with math", or "How safe is the campus?"), analyze their query logically. Highlight BBPS Gadarwara's student-to-teacher ratio, smart classrooms, dedicated sports, and supportive remedial focus.
3. CONCISENESS & ELEGANCE: Use clear bullet points when summarizing facts. Avoid verbose rambling; deliver impactful, professional answers in 2 to 4 structured paragraphs or lists.
4. ACTION INCENTIVES: If the query expresses an intent to enroll or inquire about admission, always advise clicking the "📝 Fill Admission Form" button in the menu.
`;

      // Build Multi-turn Context Payload
      const contents = [];

      // Append verified recent chat turns
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        // Retain up to the last 6 conversation turns
        const recentTurns = chatHistory.slice(-6);
        for (const turn of recentTurns) {
          if (turn && turn.role && turn.text) {
            contents.push({
              role: turn.role === "assistant" || turn.role === "model" ? "model" : "user",
              parts: [{ text: String(turn.text) }],
            });
          }
        }
      }

      // Push current user query
      contents.push({
        role: "user",
        parts: [{ text: query.trim() }],
      });

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const geminiPayload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: contents,
        generationConfig: {
          temperature: 0.25, // Lower temperature ensures logical grounding
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        },
      };

      const geminiResponse = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: "Gemini API rejected request",
            details: errorText,
          }),
          {
            status: geminiResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const geminiData = await geminiResponse.json();
      const outputText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (!outputText) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No text generated by the reasoning engine.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          reply: outputText,
          model: "gemini-1.5-flash-grounded",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Edge runtime exception: " + err.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};
