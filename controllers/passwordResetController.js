const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const { isPasswordValid, passwordRequirementMessage } = require('../validators/passwordValidator');

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Firebase 초기화
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 비밀번호 재설정 요청
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // TODO: 데이터베이스에서 사용자 확인

    // 재설정 토큰 생성
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 재설정 링크 생성
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // 이메일 전송
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '비밀번호 재설정 요청',
      html: `
        <h1>비밀번호 재설정</h1>
        <p>아래 링크를 클릭하여 비밀번호를 재설정하세요:</p>
        <a href="${resetLink}">비밀번호 재설정하기</a>
        <p>이 링크는 1시간 동안만 유효합니다.</p>
      `
    });

    res.status(200).json({
      message: '비밀번호 재설정 이메일이 발송되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 재설정 토큰 검증
const verifyResetToken = (req, res) => {
  try {
    const { token } = req.body;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(400).json({
          valid: false,
          message: '유효하지 않은 토큰입니다.'
        });
      }

      res.status(200).json({
        valid: true,
        email: decoded.email
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

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
  requestPasswordReset,
  verifyResetToken,
  resetPassword
}; 