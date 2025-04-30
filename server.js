const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');

app.use(cors());
app.use(express.json());

// 라우트 설정
app.use('/auth', authRoutes);
app.use('/auth', passwordResetRoutes); // /auth/reset-password 경로로 접근 가능

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
