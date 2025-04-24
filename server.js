const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/authRoutes');

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes); // 🔥 실제 경로: /auth/check-password

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
