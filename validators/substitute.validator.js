const Joi = require('joi');

const createSubstituteRequestSchema = Joi.object({
    group_id: Joi.string().required().messages({
        'any.required': 'Group ID는 필수입니다.',
        'string.empty': 'Group ID를 입력해 주세요.',
    }),
    requester_name: Joi.string().required().messages({
        'any.required': '요청자 이름은 필수입니다.',
        'string.empty': '요청자 이름을 입력해 주세요.',
    }),
    shift_date: Joi.date().iso().required().messages({
        'any.required': '근무 날짜는 필수입니다.',
        'date.base': '유효한 날짜 형식(YYYY-MM-DD)을 입력해야 합니다.',
    }),
    start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required().messages({
        'any.required': '시작 시간은 필수입니다.',
        'string.pattern.base': '시작 시간은 유효한 시간 형식(HH:MM:SS)이어야 합니다.',
    }),
    end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required().messages({
        'any.required': '종료 시간은 필수입니다.',
        'string.pattern.base': '종료 시간은 유효한 시간 형식(HH:MM:SS)이어야 합니다.',
    }),
    reason: Joi.string().min(5).required().messages({
        'any.required': '요청 사유는 필수입니다.',
        'string.min': '요청 사유는 최소 5자 이상이어야 합니다.',
        'string.empty': '요청 사유를 입력해 주세요.',
    }),
});

// 유효성 검사 미들웨어
const validateCreateSubstituteRequest = (req, res, next) => {
    const { error } = createSubstituteRequestSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }
    next();
};

module.exports = {
    validateCreateSubstituteRequest,
};