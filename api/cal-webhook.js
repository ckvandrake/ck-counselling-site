import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🔥 Webhook hit");

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    console.log("📦 Raw payload:", JSON.stringify(body, null, 2));

    // 🔍 Extract payload safely (Cal.com sometimes nests it)
    const payload = body.payload || body;

// Cal.com actual structure
const booking = payload.booking || payload;

const email =
  booking?.attendees?.[0]?.email ||
  booking?.user?.email ||
  null;

const startTime =
  booking?.startTime ||
  booking?.start_time ||
  null;

const duration =
  booking?.eventType?.length ||
  booking?.length ||
  60;

console.log("🧠 Parsed values:");
console.log("Email:", email);
console.log("Start Time:", startTime);
console.log("Duration:", duration);

    if (!email || !startTime) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        error: "Missing required fields",
        email,
        startTime,
      });
    }

    // 🔌 Init Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 💾 Insert into sessions table
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          user_email: email,
          session_date: startTime,
          duration_minutes: duration,
          status: "upcoming",
        },
      ])
      .select();

    if (error) {
      console.log("❌ Supabase insert error:", error);
      return res.status(500).json({ error });
    }

    console.log("✅ Insert success:", data);

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (err) {
    console.log("💥 Server error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}

