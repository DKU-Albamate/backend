const { isPasswordValid, passwordRequirementMessage } = require('../validators/passwordValidator');

const checkPassword = (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      valid: false,
      message: "비밀번호를 전달해주세요.",
    });
  }

  if (!isPasswordValid(password)) {
    return res.status(200).json({
      valid: false,
      message: passwordRequirementMessage,
    });
  }

  return res.status(200).json({
    valid: true,
  });
};

module.exports = { checkPassword };
