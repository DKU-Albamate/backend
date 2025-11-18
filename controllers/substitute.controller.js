const substituteService = require('../services/substitute.service');

async function createSubstituteRequestController(req, res) {
    const { group_id, requester_name, shift_date, start_time, end_time, reason } = req.body;
    
    // 서비스 함수에 전달할 데이터
    const requestData = { group_id, requester_name, shift_date, start_time, end_time, reason };

    try {
        // 1. 근무 스케줄 확인 (이름 기반)
        const isScheduled = await substituteService.checkScheduleOverlap(requestData);
        
        if (!isScheduled) {
            return res.status(403).json({
                success: false,
                message: `요청자(${requester_name})님은 요청한 날짜에 확정된 근무가 배정되어 있지 않습니다.`,
            });
        }

        // 2. 대타 요청 저장 
        const newRequest = await substituteService.createSubstituteRequest(requestData);

        return res.status(201).json({
            success: true,
            message: `대타 요청(${requester_name}님)이 성공적으로 등록되었습니다.`,
            data: newRequest,
        });

    } catch (error) {
        console.error('대타 요청 생성 중 서버 오류:', error.message);
        return res.status(500).json({
            success: false,
            message: '대타 요청 처리 중 서버 오류가 발생했습니다.',
        });
    }
}

module.exports = {
    createSubstituteRequestController,
};