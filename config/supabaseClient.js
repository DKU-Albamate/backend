// src/services/groupService.js
const { supabase } = require('./supabaseClient');
const axios = require('axios');

const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const createGroup = async ({ name, description, useAutoAssignment, userId }) => {
  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 1. 그룹 생성
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      owner_id: userId,
      invite_code: inviteCode,
      invite_code_expires_at: expiresAt,
      use_auto_assignment: useAutoAssignment
    })
    .select()
    .single();
  if (error) throw error;

  // 2. 그룹 멤버에 OWNER로 추가
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'OWNER'
  });

  // 3. Firebase Dynamic Link 생성
  const response = await axios.post(
    `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${process.env.FIREBASE_WEB_API_KEY}`,
    {
      dynamicLinkInfo: {
        domainUriPrefix: 'https://yourapp.page.link', // Firebase Dynamic Link 도메인 접두사  
        link: `https://yourapp.com/invite?code=${inviteCode}`, // 초대 링크
        androidInfo: { androidPackageName: 'com.yourcompany.albamate' }, // 안드로이드 패키지 이름
        iosInfo: { iosBundleId: 'com.yourcompany.albamate.ios' } // iOS 번들 ID(삭제예정)
      }
    }
  );

  return {
    groupId: group.id,
    inviteCode,
    inviteCodeExpiresAt: expiresAt,
    dynamicLink: response.data.shortLink
  };
};

module.exports = { createGroup };
