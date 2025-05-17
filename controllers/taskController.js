const taskService = require('../services/taskService');
const { supabase } = require('../config/supabaseClient');
const admin = require('firebase-admin');

// 🔹 할 일 생성
const createTask = async (req, res) => {
  try {
    const { groupId, content } = req.body;
    const userId = req.user.uid;

    // Firebase 사용자 정보를 Supabase에 동기화
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('uid', userId)
      .single();

    if (!existingUser) {
      // Firebase에서 사용자 정보 가져오기
      const userRecord = await admin.auth().getUser(userId);
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      
      // Supabase에 사용자 정보 저장
      const { error: userError } = await supabase
        .from('users')
        .insert({
          uid: userId,
          name: userDoc.data()?.name || userRecord.displayName,
          email: userRecord.email,
          role: userDoc.data()?.role || '알바생'
        });

      if (userError) throw new Error('사용자 정보 동기화 실패: ' + userError.message);
    }

    const task = await taskService.createTask({
      groupId,
      content,
      userId,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 🔹 할 일 목록 조회
const getTasks = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.uid;

    // Firebase 사용자 정보를 Supabase에 동기화
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('uid', userId)
      .single();

    if (!existingUser) {
      // Firebase에서 사용자 정보 가져오기
      const userRecord = await admin.auth().getUser(userId);
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      
      // Supabase에 사용자 정보 저장
      const { error: userError } = await supabase
        .from('users')
        .insert({
          uid: userId,
          name: userDoc.data()?.name || userRecord.displayName,
          email: userRecord.email,
          role: userDoc.data()?.role || '알바생'
        });

      if (userError) throw new Error('사용자 정보 동기화 실패: ' + userError.message);
    }

    const tasks = await taskService.getTasks(groupId);

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 🔹 할 일 삭제
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;

    await taskService.deleteTask(taskId, userId);

    res.status(200).json({
      success: true,
      message: '할 일이 삭제되었습니다.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 🔹 할 일 완료 상태 토글
const toggleTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;

    await taskService.toggleTaskCompletion(taskId, userId);

    res.status(200).json({
      success: true,
      message: '할 일 상태가 변경되었습니다.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  deleteTask,
  toggleTaskCompletion,
}; 