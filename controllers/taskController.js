const taskService = require('../services/taskService');

// 🔹 할 일 생성
const createTask = async (req, res) => {
  try {
    const { groupId, content } = req.body;
    const userId = req.user.uid;

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