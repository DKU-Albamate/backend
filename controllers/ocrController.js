const { createClient } = require('@supabase/supabase-js');
const { extractSchedule } = require('../services/clovaOcr');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /ocr/schedule
 * multipart/form-data:
 *   - photo        : 이미지 파일
 *   - user_uid     : UID
 *   - display_name : 이름(선택)
 */
exports.handleOcr = async (req, res) => {
  const { user_uid, display_name } = req.body;
  if (!req.file || !user_uid) {
    return res.status(400).json({ error: 'photo·user_uid 필요' });
  }

  try {
    // 1) OCR → 일정 파싱
    const events = await extractSchedule(req.file.buffer, display_name || '');

    if (!events.length) return res.status(200).json({ inserted: 0, schedules: [] });
    // 2) Supabase INSERT (source='ocr')
    const { error } = await supabase
      .from('appointments')
      .insert(events.map(e => ({
        user_uid,
        title     : e.title,
        start_time: `${e.date}T${e.start}:00+09`,
        end_time  : `${e.date}T${e.end}:00+09`,
        color     : null,
        source    : 'ocr'
      })));

    if (error) throw error;
       res.status(201).json({
        inserted : events.length,
        schedules: events
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
