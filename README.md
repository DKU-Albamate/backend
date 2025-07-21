# ALBAMATE Backend

알바메이트 백엔드 서버 - Clova OCR + Gemini 2.0 Flash 연동

## 주요 기능

- 사용자 인증 (Firebase Auth)
- 일정 관리 (Supabase)
- 그룹 관리
- 게시물 관리
- 할 일 관리
- **Clova OCR + Gemini 2.0 Flash를 통한 스케줄 자동 인식**

## AI OCR 연동

### 환경 변수 설정

```bash
# Clova OCR 설정
CLOVA_URL=https://your-clova-ocr-endpoint
CLOVA_SECRET=your_clova_secret_key

# Gemini 2.0 Flash 설정
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

### 🤖 Gemini 2.0 Flash (권장)
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

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start

# OCR 헬스체크 테스트
curl http://localhost:3000/ocr/health

# Gemini OCR 테스트
curl -X POST http://localhost:3000/ocr/schedule/gemini \
  -F "photo=@schedule.jpg" \
  -F "user_uid=test_user" \
  -F "display_name=김지성"
```

## API 키 발급 방법

### Clova OCR
1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 가입
2. CLOVA OCR 서비스 활성화
3. API URL과 Secret 키 발급

### Gemini 2.0 Flash
1. [Google AI Studio](https://aistudio.google.com/) 접속
2. API 키 생성
3. Gemini 2.0 Flash 모델 선택
