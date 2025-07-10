const { supabase } = require('../config/supabaseClient');

/**
 * POST /appointments/bulk
 * body: { user_uid, events: [{date,start,end,title,color?}, ...] }
 */
exports.bulkUpsert = async (req, res) => {
  const { user_uid, events } = req.body;
  if (!user_uid || !Array.isArray(events))
    return res.status(400).json({ error: 'user_uid·events 필요' });

  const rows = events.map(e => ({
    user_uid,
    title     : e.title,
    start_time: `${e.date}T${e.start}:00+09`,
    end_time  : `${e.date}T${e.end}:00+09`,
    color     : e.color ?? null,
    source    : 'ocr',
  }));

  const { error } = await supabase
    .from('appointments')
    .upsert(rows, { onConflict: 'user_uid,start_time' });

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ saved: rows.length });
};
