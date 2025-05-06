exports.validateDeleteAccount = (req, res, next) => {
    const { uid } = req.body;
  
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ message: '유효한 uid가 필요합니다.' });
    }
  
    next();
  };