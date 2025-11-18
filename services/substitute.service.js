const supabase = require('../config/supabaseClient'); // Supabase 클라이언트 경로 확인 필요
const { format } = require('date-fns');

/**
 * 💡 요청자가 요청한 날짜에 'confirmed' 상태의 근무가 배정되어 있는지 확인합니다.
 * schedule_posts 테이블의 assignments JSONB 필드에서 해당 날짜에 requester_uid가 포함되어 있는지 확인합니다.
 */
async function checkScheduleOverlap({ group_id, requester_uid, shift_date }) {
    const requestedDate = format(new Date(shift_date), 'yyyy-MM-dd');
    const year = new Date(requestedDate).getFullYear();
    const month = new Date(requestedDate).getMonth() + 1; // JS month는 0부터 시작 (1월=1)

    // 1. 해당 월의 'confirmed' 상태의 schedule_posts를 조회
    const { data: schedulePosts, error } = await supabase
        .from('schedule_posts')
        .select('assignments')
        .eq('group_id', group_id)
        .eq('year', year)
        .eq('month', month)
        .eq('status', 'confirmed') // 💡 'status'가 'confirmed'인 포스트만 조회
        .single(); 

    if (error && error.code !== 'PGRST116') { // PGRST116은 데이터 없음
        console.error('스케줄 포스트 조회 오류:', error);
        // Supabase 에러가 발생했지만 데이터베이스 문제가 아니라면 throw 대신 false 반환 고려
        if (error.code === 'PGRST116') {
             return false; // 해당 월에 확정된 스케줄이 없음
        }
        throw new Error('스케줄 확인 중 데이터베이스 오류 발생');
    }

    if (!schedulePosts || !schedulePosts.assignments) {
        return false; // 'confirmed' 상태의 스케줄 포스트가 없거나 assignments 필드가 비어있음
    }

    const assignments = schedulePosts.assignments;

    // 2. assignments JSONB 필드에서 요청 날짜에 해당하는 근무를 조회합니다.
    const dailyAssignments = assignments[requestedDate];

    if (!dailyAssignments) {
        return false; // 해당 날짜에 배정된 근무가 없음
    }

    // 3. 해당 날짜의 근무 중에서 요청자 UID가 포함되어 있는지 확인합니다.
    const isScheduled = dailyAssignments.some(assignment => {
        // 근무가 요청자에게 배정되었는지 확인
        return assignment.owner_uid === requester_uid;
    });

    return isScheduled;
}


/**
 * 새 대타 요청을 substitute_requests 테이블에 저장합니다.
 */
async function createSubstituteRequest(requestData) {
    const { data, error } = await supabase
        .from('substitute_requests')
        .insert({
            group_id: requestData.group_id,
            requester_uid: requestData.requester_uid,
            shift_date: requestData.shift_date,
            start_time: requestData.start_time,
            end_time: requestData.end_time,
            reason: requestData.reason,
            status: 'PENDING', // 초기 상태는 항상 PENDING
        })
        .select()
        .single();

    if (error) {
        console.error('대타 요청 저장 오류:', error);
        throw new Error('대타 요청 저장에 실패했습니다.');
    }

    return data;
}

module.exports = {
    checkScheduleOverlap,
    createSubstituteRequest,
};