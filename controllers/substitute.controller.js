const substituteService = require('../services/substitute.service');

async function createSubstituteRequestController(req, res) {
    // 요청 본문에서 필요한 필드를 구조 분해 할당
    const { group_id, requester_name, shift_date, start_time, end_time, reason } = req.body;
    
    // 서비스 함수에 전달할 데이터 객체
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

        // 2. 대타 요청 저장 (DB의 requester_name 필드에 저장)
        const newRequest = await substituteService.createSubstituteRequest(requestData);

        return res.status(201).json({
            success: true,
            message: `대타 요청(${requester_name}님)이 성공적으로 등록되었습니다.`,
            data: newRequest,
        });

    } catch (error) {
        // 💡 [핵심] 서버 오류 발생 시, 실제 에러 메시지와 스택 트레이스를 콘솔에 자세히 출력합니다.
        console.error('대타 요청 생성 중 서버 오류 발생. 상세 메시지:', error.message); 
        console.error('스택 트레이스:', error.stack); 

        // 클라이언트에는 일반적인 500 에러 메시지를 반환
        return res.status(500).json({
            success: false,
            message: '대타 요청 처리 중 서버 오류가 발생했습니다.',
        });
    }
}

module.exports = {
    createSubstituteRequestController,
};
