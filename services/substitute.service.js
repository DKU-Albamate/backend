const supabase = require('../config/supabaseClient'); 
const { format } = require('date-fns');

/**
 * 💡 요청자가 요청한 날짜에 'confirmed' 상태의 근무가 배정되어 있는지 확인합니다.
 * assignments JSONB 필드의 "이름" 배열과 요청자의 "이름"을 비교합니다.
 */
async function checkScheduleOverlap({ group_id, requester_name, shift_date }) {
    const requestedDate = format(new Date(shift_date), 'yyyy-MM-dd');
    const year = new Date(requestedDate).getFullYear();
    const month = new Date(requestedDate).getMonth() + 1;

    // 1. 해당 월의 'confirmed' 상태의 schedule_posts를 조회
    const { data: schedulePosts, error } = await supabase
        .from('schedule_posts')
        .select('assignments')
        .eq('group_id', group_id)
        .eq('year', year)
        .eq('month', month)
        .eq('status', 'confirmed') 
        .single(); 

    if (error && error.code !== 'PGRST116') {
        console.error('스케줄 포스트 조회 오류:', error);
        if (error.code === 'PGRST116') {
             return false; 
        }
        throw new Error('스케줄 확인 중 데이터베이스 오류 발생');
    }

    if (!schedulePosts || !schedulePosts.assignments) {
        return false; 
    }

    const assignments = schedulePosts.assignments;

    // 2. assignments JSONB 필드에서 요청 날짜에 해당하는 근무자 리스트(이름 배열)를 조회합니다.
    const dailyAssignments = assignments[requestedDate]; // 예: ["Kim", "Lee"]

    if (!dailyAssignments || !Array.isArray(dailyAssignments)) {
        return false; // 해당 날짜에 배정된 근무가 없거나 형식이 잘못됨
    }

    // 3. 해당 날짜의 근무자 리스트에 요청자의 이름이 포함되어 있는지 확인합니다.
    const isScheduled = dailyAssignments.includes(requester_name);

    return isScheduled;
}


/**
 * 새 대타 요청을 substitute_requests 테이블에 저장합니다.
 * 💡 requester_uid 필드에 requester_name을 저장합니다.
 */
async function createSubstituteRequest(requestData) {
    const { data, error } = await supabase
        .from('substitute_requests')
        .insert({
            group_id: requestData.group_id,
            
            requester_name: requestData.requester_name, 
            shift_date: requestData.shift_date,
            start_time: requestData.start_time,
            end_time: requestData.end_time,
            reason: requestData.reason,
            status: 'PENDING',
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