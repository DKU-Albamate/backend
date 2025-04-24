const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+~`{}\[\]:;"'<>,.?\/\\|-]).{8,}$/;

const isPasswordValid = (password) => {
  return passwordRegex.test(password);
};

const passwordRequirementMessage = "비밀번호는 8자 이상이며, 영문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.";

module.exports = { isPasswordValid, passwordRequirementMessage };
