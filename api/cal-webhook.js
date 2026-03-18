import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const booking = payload.payload

    await supabase
      .from('sessions')
      .insert({
        user_email: booking.attendees[0].email,
        session_date: booking.startTime,
        duration_minutes: booking.length,
        status: 'upcoming'
      })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)

    return res.status(500).json({
      error: "Webhook failed"
    })
  }
}

