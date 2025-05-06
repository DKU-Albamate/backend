const admin = require('firebase-admin');
const axios = require('axios');

//  Firebase Admin 초기화 (controller에서 직접)
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.deleteAccountController = async (req, res) => {
  const { uid } = req.body;

  try {
    // Firestore 유저 문서 삭제
    await admin.firestore().collection('users').doc(uid).delete();

    // Firebase 인증 계정 삭제
    await admin.auth().deleteUser(uid);

    // Supabase 유저 관련 데이터 삭제 (RPC 호출)
    await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/delete_user_data`,
      { uid },
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(200).json({ message: '탈퇴 및 데이터 삭제 완료' });
  } catch (error) {
    // 🔥 이 부분 추가해서 오류 상세 확인
    console.error('❌ 탈퇴 실패:', error.response?.data || error.message);
    return res.status(500).json({
      message: '탈퇴 중 오류 발생',
      error: error.response?.data || error.message,
    });
  }
};
