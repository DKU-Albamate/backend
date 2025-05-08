const groupService = require('../services/groupService');

// 🔹 그룹 생성
const createGroup = async (req, res) => {
  try {
    const { name, description, useAutoAssignment } = req.body;
    const userId = req.user.uid; // Firebase UID
    const result = await groupService.createGroup({
      name,
      description,
      useAutoAssignment,
      userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 초대 코드 재발급
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

// 🔹 초대 코드 조회 (초대 코드 보기)
const getInviteCode = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.uid;
    const result = await groupService.regenerateInviteCode(groupId, userId); // 동일한 로직 사용
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 🔹 그룹 목록 조회
const getGroups = async (req, res) => {
  try {
    const userId = req.user.uid;
    const result = await groupService.getGroups(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 그룹 수정
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, useAutoAssignment } = req.body;
    const userId = req.user.uid;
    await groupService.updateGroup(groupId, {
      name,
      description,
      useAutoAssignment,
    }, userId);
    res.status(200).json({ success: true, message: '그룹이 수정되었습니다.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 🔹 그룹 삭제
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

// 🔹 초대 코드로 그룹 가입
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
  getInviteCode,
  getGroups,
  updateGroup,
  deleteGroup,
  joinGroupByInviteCode,
};
