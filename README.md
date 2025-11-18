# ALBAMATE Backend Server

알바메이트 백엔드 서버 - Clova OCR + Gemini 2.5 Flash Lite 연동

## 📋 주요 기능

- **사용자 인증 및 관리** (Supabase Auth)
- **그룹 생성 및 관리**
- **할일 관리**
- **Clova OCR + Gemini 2.5 Flash Lite를 통한 스케줄 자동 인식**
- **일정 관리 및 저장**

## AI OCR 연동

### 환경 변수 설정
Render에 아래와 같이 설정
```bash
# Clova OCR 설정
CLOVA_URL=https://your-clova-ocr-endpoint
CLOVA_SECRET=your_clova_secret_key

# Gemini 2.5 Flash Lite 설정
GEMINI_API_KEY=your_gemini_api_key

# Supabase 설정
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### OCR API 엔드포인트

#### 1. 스케줄 이미지 업로드 (기본 - Gemini 자동 선택)
```
POST /ocr/schedule
Content-Type: multipart/form-data

파라미터:
- photo: 이미지 파일 (jpg, png)
- user_uid: 사용자 UID
- display_name: 찾을 이름 (선택사항)
- use_gemini: Gemini 사용 여부 (선택, 기본값: true)

응답:
{
  "message": "일정이 성공적으로 저장되었습니다",
  "inserted": 3,
  "schedules": [
    {
      "name": "김지성",
      "position": "포지션1",
      "date": "2025-07-15",
      "start": "09:00",
      "end": "17:00"
    }
  ],
  "analysis_method": "gemini"
}
```

#### 2. Gemini 전용 OCR 처리
```
POST /ocr/schedule/gemini
Content-Type: multipart/form-data

파라미터:
- photo: 이미지 파일
- user_uid: 사용자 UID
- display_name: 찾을 이름 (선택사항)
```

#### 3. 기존 방식 OCR 처리
```
POST /ocr/schedule/traditional
Content-Type: multipart/form-data

파라미터:
- photo: 이미지 파일
- user_uid: 사용자 UID
- display_name: 찾을 이름 (선택사항)
```

#### 4. OCR 서비스 상태 확인
```
GET /ocr/health

응답:
{
  "status": "healthy",
  "clova": "connected",
  "gemini": "configured",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

## AI 분석 방식 비교

### 🤖 Gemini 2.5 Flash Lite (권장)
- **장점**: 
  - 더 정확한 텍스트 인식
  - 복잡한 표 구조 이해
  - 다양한 날짜/시간 형식 지원
  - 컨텍스트 기반 분석
- **사용법**: `use_gemini=true` 또는 `/ocr/schedule/gemini`

### 📊 기존 방식
- **장점**: 
  - 빠른 처리 속도
  - API 키 불필요
  - 단순한 표 구조에 효과적
- **사용법**: `use_gemini=false` 또는 `/ocr/schedule/traditional`

## 배포

### Docker 배포
```bash
# 이미지 빌드
docker build -t albamate-backend .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e CLOVA_URL=your_clova_url \
  -e CLOVA_SECRET=your_clova_secret \
  -e GEMINI_API_KEY=your_gemini_key \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_supabase_key \
  albamate-backend
```

### Render 배포
1. GitHub 저장소 연결
2. 환경 변수 설정 (Gemini API 키 포함)
3. 빌드 명령어: `npm install`
4. 시작 명령어: `npm start`

## 개발

# OCR 헬스체크 테스트
curl http://localhost:3000/ocr/health

# Gemini OCR 테스트
curl -X POST http://localhost:3000/ocr/schedule/gemini \
  -F "photo=@schedule.jpg" \
  -F "user_uid=test_user" \
  -F "display_name=김지성"
```

## Substitute (대타) 기능
대타 요청(대타 알바 찾기) 관련 기능은 `substitute` 네임스페이스로 구성되어 있습니다. 인증 미들웨어는 주석 처리되어 있으며, 실제 운영에서는 `authenticate`를 활성화하여 사용자/관리자 권한을 검증하세요.

파일 위치
- 라우트: `routes/substitute.routes.js`
- 컨트롤러: `controllers/substitute.controller.js`
- 서비스: `services/substitute.service.js`
- 유효성 검사: `validators/substitute.validator.js`

주요 엔드포인트
- POST `/api/substitute/requests` : 새 대타 요청 생성
  - 요청 바디 예시 (JSON or form):
    ```json
    {
      "group_id": "group_123",
      "requester_name": "홍길동",
      "shift_date": "2025-07-15",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "reason": "개인사정으로 교대 필요"
    }
    ```
  - 서버는 먼저 `checkScheduleOverlap`로 요청자가 해당 날짜에 확정된 근무로 배정되어 있는지 확인합니다. 배정되어 있지 않으면 403을 반환합니다.

- GET `/api/substitute/requests?group_id=<GROUP_ID>` : 특정 그룹의 모든 대타 요청 조회 (상태 필터 없음)
- GET `/api/substitute/requests/:request_id` : 개별 대타 요청 상세 조회
- PUT `/api/substitute/requests/:request_id/accept` : 알바생이 대타 요청을 수락 → `substitute_name` 기록, 상태를 `IN_REVIEW`로 변경
  - 바디 예시: `{ "substitute_name": "김아르바" }`
- PUT `/api/substitute/requests/:request_id/manage` : 사장님이 최종 승인(`APPROVED`) 또는 거절(`REJECTED`) 처리
  - 바디 예시: `{ "final_status": "APPROVED" }`
  - `APPROVED`일 경우 `services/substitute.service.js`의 `updateSchedulePost`가 호출되어 `schedule_posts`의 `assignments`를 갱신합니다 (요청자 제거, 대타 추가).
- DELETE `/api/substitute/requests/:request_id` : 대타 요청 삭제

유효성 규칙 (요약, `validators/substitute.validator.js` 참조)
- `group_id`: 문자열, 필수
- `requester_name`: 문자열, 필수
- `shift_date`: ISO 날짜(예: `YYYY-MM-DD`), 필수
- `start_time`, `end_time`: `HH:MM:SS` 형식(정규식 검증), 필수
- `reason`: 문자열, 최소 5자

서비스 동작 요약
- `createSubstituteRequest`는 `substitute_requests` 테이블에 요청을 저장합니다. (DB 필드: `group_id`, `requester_name`, `shift_date`, `start_time`, `end_time`, `reason`, `status` 등)
- `checkScheduleOverlap`는 `schedule_posts` 테이블에서 해당 월의 `confirmed` 포스트를 조회해 `assignments` JSONB에서 요청자가 실제로 배정되어 있는지 확인합니다.
- `acceptSubstituteRequest`는 대타가 수락하면 요청의 `substitute_name`을 기록하고 `status`를 `IN_REVIEW`로 변경합니다.
- 사장님이 승인(`manageSubstituteRequest` → `APPROVED`)하면 `updateSchedulePost`가 호출되어 실제 `schedule_posts.assignments`를 수정(요청자 제거 → 대타 추가)합니다.

- DB 업데이트(특히 `updateSchedulePost`)는 트랜잭션 고려가 필요합니다. 동시성 이슈가 발생할 수 있으니 테스트 후 운영 적용 권장합니다.



