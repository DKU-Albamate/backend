const { supabase } = require('../config/supabaseClient');
const { v4: uuidv4 } = require('uuid');

// 🔹 그룹 생성
const createGroup = async ({ name, description, useAutoAssignment, userId }) => {
  const inviteCode = uuidv4().split('-')[0];
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7일 후 만료

  // 1. groups 테이블에 INSERT
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      use_auto_assignment: useAutoAssignment,
      owner_uid: userId,
      invite_code: inviteCode,
      invite_code_expires_at: expiresAt,
    })
    .select()
    .single();

  if (groupError) throw new Error(groupError.message);

  // 2. group_members 테이블에 OWNER로 추가
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_uid: userId,
      group_role: 'OWNER',
    });

  if (memberError) throw new Error(memberError.message);

  return {
    groupId: group.id,
    inviteCode,
    inviteCodeExpiresAt: expiresAt,
  };
};

// 🔹 초대코드로 그룹 참가
const joinGroupByInviteCode = async (inviteCode, userUid) => {
  // 1. 초대 코드로 그룹 조회
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  if (groupError || !group) {
    throw new Error('유효하지 않은 초대 코드입니다.');
  }

  // 2. 초대 코드 유효 시간 확인
  const now = new Date();
  const expiresAt = new Date(group.invite_code_expires_at);
  if (now > expiresAt) {
    throw new Error('초대 코드가 만료되었습니다.');
  }

  // 3. 중복 가입 확인
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('user_uid', userUid)
    .maybeSingle();

  if (existing) {
    throw new Error('이미 이 그룹에 가입되어 있습니다.');
  }

  // 4. MEMBER로 추가
  const { error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_uid: userUid,
      group_role: 'MEMBER',
    });

  if (insertError) {
    throw new Error('그룹 가입 중 오류가 발생했습니다.');
  }

  return {
    groupId: group.id,
    groupName: group.name,
  };
};

// 🔹 초대코드 재발급
const regenerateInviteCode = async (groupId, userId) => {
  const newCode = uuidv4().split('-')[0];
  const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const { data, error } = await supabase
    .from('groups')
    .update({
      invite_code: newCode,
      invite_code_expires_at: newExpiresAt,
    })
    .eq('id', groupId)
    .eq('owner_uid', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    inviteCode: newCode,
    inviteCodeExpiresAt: newExpiresAt,
  };
};

// 🔹 그룹 목록 조회
const getGroups = async (userId) => {
  // 1. 먼저 사용자가 속한 그룹 ID들을 조회
  const { data: memberData, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_uid', userId);

  if (memberError) throw new Error(memberError.message);

  // 2. 조회된 그룹 ID들로 그룹 정보 조회
  const groupIds = memberData.map(member => member.group_id);
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description')
    .in('id', groupIds);

  if (error) throw new Error(error.message);
  return data;
};

// 🔹 그룹 수정
const updateGroup = async (groupId, { name, description, useAutoAssignment }, userId) => {
  const { error } = await supabase
    .from('groups')
    .update({
      name,
      description,
      use_auto_assignment: useAutoAssignment,
    })
    .eq('id', groupId)
    .eq('owner_uid', userId);

  if (error) throw new Error(error.message);
};

// 🔹 그룹 삭제
const deleteGroup = async (groupId, userId) => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_uid', userId);

  if (error) throw new Error(error.message);
};

module.exports = {
  createGroup,
  joinGroupByInviteCode,
  regenerateInviteCode,
  getGroups,
  updateGroup,
  deleteGroup,
};
