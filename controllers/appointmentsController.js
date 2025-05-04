const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.createAppointment = async (req, res) => {
  const { user_uid, title, start_time, end_time, color } = req.body;

  const { data, error } = await supabase
    .from('appointments')
    .insert([{ user_uid, title, start_time, end_time, color }]);

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

exports.getAppointments = async (req, res) => {
  const { user_uid } = req.query;

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_uid', user_uid);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

exports.updateAppointment = async (req, res) => {
  const { id } = req.params;
  const { title, start_time, end_time, color } = req.body;

  const { data, error } = await supabase
    .from('appointments')
    .update({ title, start_time, end_time, color })
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

exports.deleteAppointment = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
};
