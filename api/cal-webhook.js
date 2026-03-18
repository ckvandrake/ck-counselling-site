import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🔥 Webhook hit");

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = req.body;
    let body = rawBody;
    if (typeof rawBody === "string") {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        // Cal.com "ping/test" can send non-JSON text; acknowledge so the webhook validates.
        console.log("ℹ️ Non-JSON body received (likely ping/test).");
        return res.status(200).json({ success: true, message: "pong" });
      }
    }
    console.log("📦 Raw payload:", JSON.stringify(body, null, 2));

    // If Cal.com sends a ping/test structure, treat it as success.
    const triggerEvent = body?.triggerEvent || body?.trigger_event || body?.type || null;
    if (triggerEvent && String(triggerEvent).toLowerCase().includes("ping")) {
      return res.status(200).json({ success: true, message: "pong" });
    }

    // Cal.com can send nested payloads like { triggerEvent, payload: { ...booking } }
    const booking =
      body?.payload?.booking ||
      body?.payload?.payload ||
      body?.payload ||
      body?.booking ||
      body;

    const email =
      booking?.attendees?.[0]?.email ||
      booking?.attendees?.[0]?.attendee?.email ||
      booking?.user?.email ||
      booking?.email ||
      null;

    const startTime =
      booking?.startTime ||
      booking?.start_time ||
      booking?.start ||
      null;

    const duration =
      booking?.eventType?.lengthInMinutes ||
      booking?.eventType?.length ||
      booking?.lengthInMinutes ||
      booking?.length ||
      60;

    // Useful for debugging/idempotency (if you add a column later)
    const externalId =
      booking?.uid ||
      booking?.id ||
      booking?.bookingUid ||
      booking?.bookingId ||
      null;

    console.log("🧠 Parsed values:", {
      email,
      startTime,
      duration,
      externalId,
      keys: booking ? Object.keys(booking) : [],
    });

    if (!email || !startTime) {
      console.log("❌ Missing required fields");
      // Cal.com sometimes validates webhooks with test events that don't include booking fields.
      // Return 200 so the webhook can be enabled; we only write to Supabase when a booking exists.
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: "missing booking fields",
        email,
        startTime,
      });
    }

    // 🔌 Init Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Map attendee email -> profile id so the portal (which queries by user_id) can display it.
    const normalizedEmail = String(email).trim().toLowerCase();
    let userId = null;
    const profileResult = await supabase
      .from("profiles")
      .select("id,email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (profileResult.error) {
      console.log("❌ Supabase profile lookup error:", profileResult.error);
    } else if (profileResult.data && profileResult.data.id) {
      userId = profileResult.data.id;
    }

    if (!userId) {
      console.log("⚠️ No matching profile found for email:", normalizedEmail);
    }

    // 💾 Insert into sessions table
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          user_id: userId,
          user_email: normalizedEmail,
          session_date: startTime,
          duration_minutes: Number(duration) || 60,
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
      userId,
    });

  } catch (err) {
    console.log("💥 Server error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}

