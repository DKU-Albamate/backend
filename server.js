const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const appointmentsRouter = require('./routes/appointments'); 
const deleteAccountRouter = require('./routes/delete-account');
const groupRoutes = require('./routes/groupRoutes');  // 그룹 라우트 추가
const postRoutes = require('./routes/postRoutes');
const taskRoutes = require('./routes/taskRoutes');  // 할 일 라우트 추가
const llmNoticeRoutes = require('./routes/llmNoticeRoutes'); // gemini notice

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우트 설정
app.use('/auth', authRoutes);
app.use('/auth/reset-password', passwordResetRoutes);
app.use('/appointments', appointmentsRouter);
app.use('/delete-account', deleteAccountRouter);
app.use('/api/groups', groupRoutes);  // 그룹 API 엔드포인트 추가
app.use('/api/posts', postRoutes);
app.use('/api/tasks', taskRoutes);  // 할 일 API 엔드포인트 추가
app.use('/ocr', require('./routes/ocr'));
app.use('/notice', llmNoticeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});