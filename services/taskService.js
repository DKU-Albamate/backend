const { supabase } = require('../config/supabaseClient');

// 🔹 할 일 생성
const createTask = async ({ groupId, content, userId }) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      group_id: groupId,
      content,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// 🔹 할 일 목록 조회
const getTasks = async (groupId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      created_by:users!tasks_created_by_fkey (
        id,
        name
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

// 🔹 할 일 삭제
const deleteTask = async (taskId, userId) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('created_by', userId);

  if (error) throw new Error(error.message);
};

// 🔹 할 일 완료 상태 토글
const toggleTaskCompletion = async (taskId, userId) => {
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('is_completed')
    .eq('id', taskId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: !task.is_completed })
    .eq('id', taskId)
    .eq('created_by', userId);

  if (error) throw new Error(error.message);
};

module.exports = {
  createTask,
  getTasks,
  deleteTask,
  toggleTaskCompletion,
}; 