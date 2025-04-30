const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');

// CORS 설정
app.use(cors({
  origin: '*', // 실제 배포시에는 프론트엔드 도메인으로 변경
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 라우트 설정
app.use('/auth', authRoutes);
app.use('/auth', passwordResetRoutes); // /auth/reset-password 경로로 접근 가능

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
