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
        //  [핵심] 서버 오류 발생 시, 실제 에러 메시지와 스택 트레이스를 콘솔에 자세히 출력합니다.
        console.error('대타 요청 생성 중 서버 오류 발생. 상세 메시지:', error.message); 
        console.error('스택 트레이스:', error.stack); 

        // 클라이언트에는 일반적인 500 에러 메시지를 반환
        return res.status(500).json({
            success: false,
            message: '대타 요청 처리 중 서버 오류가 발생했습니다.',
        });
    }
}
/**
 * 대타 요청 리스트 조회 컨트롤러 (GET /api/substitute/requests)
 *  [수정] group_id에 해당하는 모든 상태의 요청을 조회합니다.
 */
async function getSubstituteRequestsController(req, res) {
    // 쿼리 파라미터에서 group_id만 추출
    const { group_id } = req.query; 

    if (!group_id) {
        return res.status(400).json({
            success: false,
            message: 'Group ID (group_id) 쿼리 파라미터는 필수입니다.'
        });
    }

    try {
        //  [수정] 서비스 함수에 group_id만 전달합니다.
        const requests = await substituteService.getSubstituteRequests(group_id);

        return res.status(200).json({
            success: true,
            message: `Group ID ${group_id}의 모든 대타 요청 ${requests.length}건을 조회했습니다.`,
            data: requests,
        });

    } catch (error) {
        console.error('대타 요청 리스트 조회 중 서버 오류 발생. 상세 메시지:', error.message);
        console.error('스택 트레이스:', error.stack);
        return res.status(500).json({
            success: false,
            message: '대타 요청 리스트 조회 중 서버 오류가 발생했습니다.',
        });
    }
}
/**
 *  GET /api/substitute/requests/:request_id: 특정 대타 요청의 상세 정보를 조회합니다.
 */
async function getSubstituteRequestDetail(req, res) {
    const requestId = req.params.request_id; 

    if (!requestId) {
        return res.status(400).json({ 
            success: false, 
            message: '요청 ID가 URL에 포함되어야 합니다.' 
        });
    }

    try {
        const request = await substituteService.getSubstituteRequestById(requestId);
        return res.status(200).json({ success: true, data: request });

    } catch (error) {
        // 404 Not Found (요청 ID 없음) 에러 처리
        if (error.message.includes('찾을 수 없습니다')) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        console.error('대타 요청 상세 조회 중 오류 발생:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: error.message || '서버에서 요청 상세 정보를 조회하는 데 실패했습니다.' 
        });
    }
}
/**
 *  대타 요청 수락 컨트롤러 (PUT /api/substitute/requests/:request_id/accept)
 * 알바생이 특정 대타 요청을 수락하고, 상태를 'IN_REVIEW'로 변경합니다.
 */
async function acceptSubstituteRequestController(req, res) {
    const requestId = req.params.request_id; // URL 경로에서 요청 ID 추출
    const { substitute_name } = req.body; // 요청 본문에서 수락 알바생 이름 추출

    if (!substitute_name) {
        return res.status(400).json({
            success: false,
            message: '대타를 수락하는 알바생의 이름(substitute_name)은 필수입니다.'
        });
    }

    try {
        const updatedRequest = await substituteService.acceptSubstituteRequest(
            requestId, 
            substitute_name
        );

        return res.status(200).json({
            success: true,
            message: `${substitute_name}님이 대타 요청을 성공적으로 수락했습니다. 관리자 승인을 기다려주세요.`,
            data: updatedRequest,
        });

    } catch (error) {
        // 404 Not Found (요청 ID 없음, 이미 처리됨) 에러 처리
        if (error.message.includes('찾을 수 없거나 이미 처리')) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        
        console.error('대타 요청 수락 중 서버 오류 발생. 상세 메시지:', error.message);
        return res.status(500).json({
            success: false,
            message: '대타 요청 수락 처리 중 서버 오류가 발생했습니다.',
        });
    }
}
/**
 * PUT /api/substitute/requests/:request_id/manage: 사장님 요청 관리 (승인/거절)
 */
async function manageSubstituteRequestController(req, res) {
    const requestId = req.params.request_id;
    const { final_status } = req.body;

    // 1. final_status 유효성 검사
    if (!final_status || (final_status !== 'APPROVED' && final_status !== 'REJECTED')) {
        return res.status(400).json({
            success: false,
            message: '최종 상태(final_status)는 APPROVED 또는 REJECTED여야 합니다.'
        });
    }

    try {
        const updatedRequest = await substituteService.manageSubstituteRequest(
            requestId, 
            final_status
        );
        
        // 메시지 설정
        const action = final_status === 'APPROVED' ? '승인' : '거절';

        return res.status(200).json({
            success: true,
            message: `대타 요청 ID ${requestId}가 성공적으로 ${action} 처리되었습니다.`,
            data: updatedRequest,
        });

    } catch (error) {
        // 404 Not Found (요청 ID 없음, 상태 불일치 등) 에러 처리
        if (error.message.includes('찾을 수 없') || 
            error.message.includes('IN_REVIEW 상태가 아닙니다') ||
            error.message.includes('대타가 정해지지 않았습니다') ||
            error.message.includes('확정된 스케줄 포스트를 찾을 수 없습니다')) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        
        console.error('대타 요청 관리 중 서버 오류 발생. 상세 메시지:', error.message);
        return res.status(500).json({
            success: false,
            message: '대타 요청 관리 처리 중 서버 오류가 발생했습니다.',
        });
    }
}
module.exports = {
    createSubstituteRequestController,
    getSubstituteRequestsController,
    getSubstituteRequestDetail,
    acceptSubstituteRequestController,
    manageSubstituteRequestController,
};
