const admin = require('firebase-admin');

// Firebase Admin 초기화 (이미 되어 있다면 중복 초기화 방지)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// 인증 미들웨어
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // 인증된 사용자 정보
    next(); // 다음 미들웨어 또는 컨트롤러로 진행
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.', error: error.message });
  }
};

module.exports = authMiddleware;
