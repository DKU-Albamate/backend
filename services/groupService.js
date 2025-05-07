const { supabase } = require('../config/supabaseClient');
const { v4: uuidv4 } = require('uuid');

// ✅ 그룹 생성
const createGroup = async ({ name, description, useAutoAssignment, userId }) => {
  const inviteCode = uuidv4().split('-')[0]; // 초대 코드 생성
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7일 후 만료

  const { data, error } = await supabase
    .from('groups')
    .insert([{
      name,
      description,
      use_auto_assignment: useAutoAssignment,
      created_by: userId,
      invite_code: inviteCode,
      invite_code_expires_at: expiresAt.toISOString(),
    }])
    .select();

  if (error) throw new Error(error.message);
  return data[0]; // 생성된 그룹 반환
};

// ✅ 초대 코드로 그룹 참가
const joinGroupByInviteCode = async (inviteCode, userUid) => {
  // 1. 초대 코드로 유효한 그룹 조회
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

  // 3. 이미 가입된 멤버인지 확인
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('user_id', userUid)
    .maybeSingle();

  if (existing) {
    throw new Error('이미 이 그룹에 가입되어 있습니다.');
  }

  // 4. 그룹에 MEMBER로 추가
  const { error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userUid,
      role: 'MEMBER',
    });

  if (insertError) {
    throw new Error('그룹 가입 중 오류가 발생했습니다.');
  }

  return {
    groupId: group.id,
    groupName: group.name,
  };
};

// ✅ 사장님이 생성한 그룹 목록 조회
const getGroups = async (userId) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('created_by', userId); // 생성자 기준 필터링

  if (error) throw new Error(error.message);
  return data;
};

module.exports = {
  createGroup,
  joinGroupByInviteCode,
  getGroups,
};
