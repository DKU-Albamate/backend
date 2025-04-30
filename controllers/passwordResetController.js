const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const { isPasswordValid, passwordRequirementMessage } = require('../validators/passwordValidator');



// Firebase 초기화
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


// 비밀번호 재설정
const resetPassword = async (req, res) => {
  try {
    const { email, name, role, newPassword } = req.body;

    // 필수 필드 확인
    if (!email || !name || !role || !newPassword) {
      return res.status(400).json({
        message: '모든 필드를 입력해주세요.'
      });
    }

    // 새 비밀번호 유효성 검사
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        message: passwordRequirementMessage
      });
    }

    // Firestore에서 사용자 조회
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('email', '==', email)
      .where('name', '==', name)
      .where('role', '==', role)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        message: '일치하는 사용자 정보가 없습니다.'
      });
    }

    // 사용자 문서 가져오기
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;

    try {
      // Firebase Authentication에서 비밀번호 업데이트
      await admin.auth().updateUser(userId, {
        password: newPassword
      });

      // Firestore에서도 비밀번호 해시 업데이트
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await usersRef.doc(userId).update({
        password: hashedPassword,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({
        message: '비밀번호가 성공적으로 변경되었습니다.'
      });
    } catch (error) {
      console.error('Firebase 업데이트 오류:', error);
      res.status(500).json({
        message: '비밀번호 변경 중 오류가 발생했습니다.'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

module.exports = {
  resetPassword
}; 