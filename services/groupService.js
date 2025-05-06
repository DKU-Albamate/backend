const { supabase } = require('../config/supabaseClient');

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
  const { data: existing, error: existingError } = await supabase
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

module.exports = {
  ...
  joinGroupByInviteCode,
};
