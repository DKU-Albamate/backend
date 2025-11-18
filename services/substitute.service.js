const { supabase } = require('../config/supabaseClient');
const { format } = require('date-fns');

/**
 * 승인 시, 스케줄 포스트(schedule_posts)를 업데이트하여 요청자를 제거하고 대타를 추가합니다.
 */
async function updateSchedulePost(requestData) {
    const { group_id, requester_name, substitute_name, shift_date } = requestData;

    const requestedDate = format(new Date(shift_date), 'yyyy-MM-dd');
    const year = new Date(requestedDate).getFullYear();
    const month = new Date(requestedDate).getMonth() + 1;

    // 1. 해당 월의 'confirmed' 상태의 schedule_posts를 조회합니다.
    const { data: schedulePost, error: fetchError } = await supabase
        .from('schedule_posts')
        .select('id, assignments')
        .eq('group_id', group_id)
        .eq('year', year)
        .eq('month', month)
        .eq('status', 'confirmed') 
        .single(); 

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('스케줄 포스트 조회 오류:', fetchError);
        throw new Error('스케줄 포스트 조회 중 데이터베이스 오류 발생');
    }

    if (!schedulePost) {
        throw new Error('대타 요청 날짜에 해당하는 확정된 스케줄 포스트를 찾을 수 없습니다.');
    }
    
    // 2. assignments JSONB 필드 복사 및 수정
    const newAssignments = { ...schedulePost.assignments };
    let assignmentsToday = newAssignments[requestedDate] || [];

    // 요청자(requester_name) 제거
    assignmentsToday = assignmentsToday.filter(name => name !== requester_name);

    // 대타 알바생(substitute_name) 추가 (중복 방지)
    if (!assignmentsToday.includes(substitute_name)) {
        assignmentsToday.push(substitute_name);
    }

    newAssignments[requestedDate] = assignmentsToday;

    // 3. schedule_posts 테이블 업데이트
    const { data: updatedPost, error: updateError } = await supabase
        .from('schedule_posts')
        .update({ assignments: newAssignments })
        .eq('id', schedulePost.id)
        .select()
        .single();

    if (updateError) {
        console.error('스케줄 포스트 업데이트 오류:', updateError);
        throw new Error('스케줄 포스트 업데이트에 실패했습니다.');
    }

    return updatedPost;
}
/**
 *  요청자가 요청한 날짜에 'confirmed' 상태의 근무가 배정되어 있는지 확인합니다.
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
 *  requester_uid 필드에 requester_name을 저장합니다.
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
/**
 *  특정 그룹의 모든 상태 대타 요청 리스트를 조회합니다.
 */
async function getSubstituteRequests(group_id) { // 💡 statusFilter 매개변수 제거
    if (!group_id) {
        throw new Error("Group ID는 필수입니다.");
    }
    
    // group_id만 필터링하여 모든 상태의 요청을 조회합니다.
    const { data: requests, error } = await supabase
        .from('substitute_requests')
        .select('*') 
        .eq('group_id', group_id)
        .order('shift_date', { ascending: true }); // 날짜 순으로 정렬

    if (error) {
        console.error('대타 요청 조회 오류:', error);
        throw new Error('대타 요청 리스트 조회에 실패했습니다.');
    }

    return requests;
}
/**
 *  대타 요청을 수락하고 상태를 'IN_REVIEW'로 업데이트합니다.
 */
async function acceptSubstituteRequest(requestId, substituteName) {
    // 1. 요청의 현재 상태를 확인합니다. (PENDING 상태가 아니면 수락 불가)
    const { data: currentRequest, error: fetchError } = await supabase
        .from('substitute_requests')
        .select('id, status, substitute_name')
        .eq('id', requestId)
        .single();

    if (fetchError || !currentRequest) {
        console.error('요청 조회 오류:', fetchError);
        // Supabase에서 데이터가 0개일 때의 오류 코드(PGRST116)를 확인하여 처리하는 것이 좋지만,
        // 현재는 일반적인 오류 메시지를 사용합니다.
        throw new Error('요청 ID를 찾을 수 없거나 데이터베이스 오류가 발생했습니다.');
    }

    // 2. 이미 처리되었거나 대타가 구해졌는지 확인합니다.
    if (currentRequest.status !== 'PENDING' || currentRequest.substitute_name !== null) {
        const statusText = currentRequest.substitute_name 
            ? `이미 ${currentRequest.substitute_name}님이 수락 대기 중`
            : `이미 ${currentRequest.status} 상태로 처리 완료됨`;
        
        throw new Error(`대타 요청이 이미 처리되었거나 수락할 수 없는 상태입니다: ${statusText}`);
    }

    // 3. 상태 업데이트 및 대타 이름 기록 (IN_REVIEW = 대타가 구해져 사장님 승인 대기 중)
    const { data: updatedData, error: updateError } = await supabase
        .from('substitute_requests')
        .update({ 
            substitute_name: substituteName, 
            status: 'IN_REVIEW',
        })
        .eq('id', requestId)
        .select()
        .single();

    if (updateError) {
        console.error('대타 요청 수락 업데이트 오류:', updateError);
        throw new Error('대타 요청 수락 업데이트에 실패했습니다.');
    }

    return updatedData;
}
/**
 * 사장님 최종 요청 관리 (승인/거절)
 */
async function manageSubstituteRequest(requestId, finalStatus) {
    // 1. 요청의 현재 상태를 조회합니다.
    const { data: request, error: fetchError } = await supabase
        .from('substitute_requests')
        .select('id, group_id, requester_name, substitute_name, shift_date, status')
        .eq('id', requestId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('요청 조회 오류:', fetchError);
        throw new Error('데이터베이스 조회 중 예상치 못한 오류가 발생했습니다.');
    }
    if (!request) {
        throw new Error(`대타 요청 ID ${requestId}를 찾을 수 없습니다.`);
    }

    // 2. 상태 및 대타 여부 검증
    if (request.status !== 'IN_REVIEW') {
        throw new Error(`요청 ID ${requestId}는 IN_REVIEW 상태가 아닙니다. 현재 상태: ${request.status}`);
    }
    if (!request.substitute_name) {
        throw new Error(`요청 ID ${requestId}는 대타가 정해지지 않아 처리할 수 없습니다.`);
    }

    // 3. 상태 업데이트 데이터 준비
    const updateData = {
        status: finalStatus,
    };
    
    if (finalStatus === 'APPROVED') {
        updateData.approved_at = new Date().toISOString(); 
    }
    
    // 4. 스케줄 업데이트 (승인 시에만)
    if (finalStatus === 'APPROVED') {
        await updateSchedulePost(request); 
    }

    // 5. substitute_requests 테이블 업데이트
    const { data: updatedRequest, error: updateError } = await supabase
        .from('substitute_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

    if (updateError) {
        console.error('대타 요청 최종 업데이트 오류:', updateError);
        throw new Error('대타 요청 최종 업데이트에 실패했습니다.');
    }

    return updatedRequest;
}
module.exports = {
    checkScheduleOverlap,
    createSubstituteRequest,
    getSubstituteRequests,
    acceptSubstituteRequest,
    manageSubstituteRequest,
};