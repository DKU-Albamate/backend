// controllers/groupController.js
const { createGroup, joinGroupByInviteCode } = require('../services/groupService');

const createGroupController = async (req, res) => {
  try {
    const { name, description, useAutoAssignment } = req.body;
    const userId = req.user.uid; // 인증 미들웨어를 통해 전달된 Firebase UID

    const result = await createGroup({ name, description, useAutoAssignment, userId });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('그룹 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const joinGroupController = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.uid;

    const result = await joinGroupByInviteCode({ userId, inviteCode });

    res.status(200).json({
      success: true,
      message: '그룹에 성공적으로 참여했습니다.',
      data: result
    });
  } catch (error) {
    console.error('그룹 참여 오류:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createGroupController,
  joinGroupController
};
