import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🔥 WEBHOOK VERSION: FINAL-ABSOLUTE-TEST");

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
    const eventType = String(triggerEvent || "").toUpperCase();
    console.log("📡 EVENT TYPE:", eventType);

    if (triggerEvent && String(triggerEvent).toLowerCase().includes("ping")) {
      return res.status(200).json({ success: true, message: "pong" });
    }

    // Cal.com can send nested payloads like { triggerEvent, payload: { ...booking } }
    const booking =
      body?.payload?.booking ||
      body?.payload ||
      body;

    const zoomLink =
      booking?.videoCallData?.url ||
      booking?.location ||
      null;

    console.log("🎥 Zoom link extracted:", zoomLink);

    const attendee = booking?.attendees?.[0] || {};
    const nestedAttendee = attendee?.attendee || {};
    const responseName = booking?.responses?.name?.value || null;
    const responseEmail = booking?.responses?.email?.value || null;

    const clientName =
      attendee?.name ||
      nestedAttendee?.name ||
      responseName ||
      null;
    const clientEmail =
      attendee?.email ||
      nestedAttendee?.email ||
      responseEmail ||
      booking?.email ||
      null;

    console.log("🧠 NEW PARSER ACTIVE:", {
      clientName,
      clientEmail
    });

    console.log("👤 Attendee extracted:", attendee);
    console.log("🧾 Response fallback:", {
      responseName,
      responseEmail,
    });

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

    const externalId =
      booking?.uid ||
      booking?.bookingId ||
      booking?.id ||
      null;

    console.log("🆔 Booking UID:", externalId);

    console.log("🧠 Parsed values:", {
      clientEmail,
      clientName,
      startTime,
      duration,
      externalId,
      keys: booking ? Object.keys(booking) : [],
    });

    const skipEmailStartForLifecycle =
      eventType === "BOOKING_CANCELLED" || eventType === "BOOKING_RESCHEDULED";

    if (!skipEmailStartForLifecycle && (!clientEmail || !startTime)) {
      console.log("❌ Missing required fields");
      // Cal.com sometimes validates webhooks with test events that don't include booking fields.
      // Return 200 so the webhook can be enabled; we only write to Supabase when a booking exists.
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: "missing booking fields",
        clientEmail,
        clientName,
        startTime,
      });
    }

    // 🔌 Init Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (eventType === "BOOKING_CANCELLED") {
      console.log("❌ Handling cancellation for:", externalId);

      const { data, error } = await supabase
        .from("sessions")
        .update({ status: "cancelled" })
        .eq("cal_event_id", externalId)
        .select();

      if (error) {
        console.log("❌ Cancel update error:", error);
        return res.status(500).json({ error });
      }

      console.log("✅ Session cancelled:", data);

      return res.status(200).json({
        success: true,
        action: "cancelled",
      });
    }

    if (eventType === "BOOKING_RESCHEDULED") {
      console.log("🔄 Reschedule detected");

      const oldUid = body?.payload?.rescheduleUid || body?.rescheduleUid || null;
      const newUid = booking?.uid || booking?.bookingId || booking?.id || null;

      console.log("Old UID:", oldUid);
      console.log("New UID:", newUid);

      if (oldUid) {
        const { data: cancelData, error: cancelError } = await supabase
          .from("sessions")
          .update({ status: "cancelled" })
          .eq("cal_event_id", oldUid)
          .select();

        if (cancelError) {
          console.log("❌ Cancel update error (reschedule path):", cancelError);
          return res.status(500).json({ error: cancelError });
        }

        console.log("✅ Old session cancelled (reschedule):", cancelData);
      } else {
        console.log("⚠️ No oldUid (rescheduleUid) provided; skipping cancel step.");
      }

      // Look up user_id the same way as in the create path
      const normalizedEmailForReschedule = String(clientEmail || "").trim().toLowerCase();
      let userIdForReschedule = null;
      if (normalizedEmailForReschedule) {
        const profileResultReschedule = await supabase
          .from("profiles")
          .select("id,email")
          .ilike("email", normalizedEmailForReschedule)
          .maybeSingle();

        if (profileResultReschedule.error) {
          console.log("❌ Supabase profile lookup error (reschedule):", profileResultReschedule.error);
        } else if (profileResultReschedule.data && profileResultReschedule.data.id) {
          userIdForReschedule = profileResultReschedule.data.id;
        }
      }

      if (!userIdForReschedule) {
        console.log("⚠️ No matching profile found for rescheduled email:", clientEmail);
        return res.status(200).json({
          success: true,
          ignored: true,
          reason: "no matching profile for rescheduled attendee email",
          email: clientEmail,
        });
      }

      const newStartTime =
        booking?.startTime ||
        booking?.start ||
        null;

      const { data: insertData, error: insertError } = await supabase
        .from("sessions")
        .insert([
          {
            user_id: userIdForReschedule,
            session_date: newStartTime,
            duration_minutes: Number(duration) || 60,
            status: "upcoming",
            client_name: clientName,
            client_email: clientEmail,
            zoom_link: zoomLink,
            cal_event_id: newUid,
          },
        ])
        .select();

      if (insertError) {
        console.log("❌ Reschedule insert error:", insertError);
        return res.status(500).json({ error: insertError });
      }

      console.log("✅ Session rescheduled (new row inserted):", insertData);

      return res.status(200).json({
        success: true,
        action: "rescheduled",
      });
    }

    // Map attendee email -> profile id so the portal (which queries by user_id) can display it.
    const normalizedEmail = String(clientEmail).trim().toLowerCase();
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
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: "no matching profile for attendee email",
        email: normalizedEmail,
      });
    }

    // 💾 Insert into sessions table
    console.log("🕒 Inserting UTC time:", startTime);
    console.log("🚀 INSERTING:", {
      clientName,
      clientEmail,
    });
    console.log("🔍 FINAL DEBUG:", {
      attendee,
      clientName,
      clientEmail,
      typeofClientName: typeof clientName,
      typeofClientEmail: typeof clientEmail,
    });
    console.log("🚀 INSERTING FULL DATA:", {
      clientName,
      clientEmail,
      zoomLink,
    });
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          user_id: userId,
          session_date: startTime,
          duration_minutes: Number(duration) || 60,
          status: "upcoming",
          client_name: clientName,
          client_email: clientEmail,
          zoom_link: zoomLink,
          cal_event_id: externalId,
        },
      ])
      .select();

    if (error) {
      console.log("❌ Supabase insert error:", JSON.stringify(error, null, 2));
      return res.status(500).json({
        error: "Supabase insert failed",
        details: error,
      });
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