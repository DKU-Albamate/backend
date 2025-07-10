const multer = require('multer')();
const { supabase } = require('../config/supabaseClient');
const { extractSchedule } = require('../services/clovaOcr');

exports.uploadMiddleware = multer.single('photo');

/**
 * POST /ocr/schedule?preview=1  (미리보기)
 * POST /ocr/schedule            (즉시 저장)
 */
exports.handleOcr = async (req, res) => {
  const { user_uid, display_name } = req.body;
  if (!req.file || !user_uid)
    return res.status(400).json({ error: 'photo·user_uid 필요' });

  const preview = req.query.preview === '1';

  try {
    const events = await extractSchedule(req.file.buffer, display_name || '');

    if (!preview) {
      const rows = events.map(e => ({
        user_uid,
        title     : e.title,
        start_time: `${e.date}T${e.start}:00+09`,
        end_time  : `${e.date}T${e.end}:00+09`,
        color     : null,
        source    : 'ocr',
      }));
      const { error } = await supabase.from('appointments').insert(rows);
      if (error) throw error;
    }

    res.status(preview ? 200 : 201).json({
      inserted : preview ? 0 : events.length,
      schedules: events,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
