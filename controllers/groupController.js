const groupService = require('../services/groupService');

const createGroup = async (req, res) => {
  try {
    const { name, description, useAutoAssignment } = req.body;
    const userId = req.user.uid;
    const result = await groupService.createGroup({ name, description, useAutoAssignment, userId });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const regenerateInviteCode = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.uid;
    const result = await groupService.regenerateInviteCode(groupId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const userId = req.user.uid;
    const result = await groupService.getGroups(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, useAutoAssignment } = req.body;
    const userId = req.user.uid;
    await groupService.updateGroup(groupId, { name, description, useAutoAssignment }, userId);
    res.status(200).json({ success: true, message: '그룹이 수정되었습니다.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.uid;
    await groupService.deleteGroup(groupId, userId);
    res.status(200).json({ success: true, message: '그룹이 삭제되었습니다.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ 초대코드로 그룹 자동 가입
const joinGroupByInviteCode = async (req, res) => {
  try {
    const { inviteCode, userUid } = req.body;
    const result = await groupService.joinGroupByInviteCode(inviteCode, userUid);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createGroup,
  regenerateInviteCode,
  getGroups,
  updateGroup,
  deleteGroup,
  joinGroupByInviteCode, // ✅ 라우터 등록도 꼭!
};
