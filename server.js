const express = require('express');
const cors = require('cors');
const app = express();


const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const appointmentsRouter = require('./routes/appointments'); 
const deleteAccountRouter = require('./routes/delete-account');

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes); // 🔥 실제 경로: /auth/check-password
app.use('/auth/reset-password', passwordResetRoutes);
app.use('/appointments', appointmentsRouter);
app.use('/delete-account', deleteAccountRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});