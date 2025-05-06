const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const groupRoutes = require('./routes/groupRoutes');  // 그룹 라우트 추가

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우트 설정
app.use('/auth', authRoutes);
app.use('/auth/reset-password', passwordResetRoutes);
app.use('/api/groups', groupRoutes);  // 그룹 API 엔드포인트 추가

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});