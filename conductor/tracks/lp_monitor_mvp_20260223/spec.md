# Track Spec: Aero Monitor MVP

## Overview
Aerodrome CL(Concentrated Liquidity) LP 포지션을 주기적으로 폴링하여
Range 이탈 및 이탈 근접을 감지하고, n8n Webhook을 통해 Telegram 알림을 발송하는 MVP 서비스.

## Type
feature

## Requirements

### 1. 프로젝트 초기화
- TypeScript + Node.js 프로젝트 셋업 (pnpm, tsconfig, etc.)
- Docker 지원 (Dockerfile, docker-compose)
- 환경변수 기반 설정 (.env)

### 2. LP 포지션 조회
- 지갑 주소를 입력받아 해당 지갑이 보유한 Aerodrome CL LP NFT 목록을 조회
- 각 포지션의 tickLower, tickUpper (Range 경계) 정보 읽기
- 현재 풀의 tick (현재 가격) 조회

### 3. Range 판정 로직
- **In Range**: 현재 tick이 tickLower ~ tickUpper 사이
- **Near Boundary (경고)**: 현재 tick이 Range 경계에서 N% 이내 접근
  - threshold는 .env에서 설정 가능 (기본값: 5%)
- **Out of Range (이탈)**: 현재 tick이 Range 밖

### 4. 모니터링 루프
- 1분 주기로 폴링 (설정 가능)
- 상태 변화 시에만 알림 발송 (중복 알림 방지)
  - In Range → Near Boundary: 경고 알림
  - In Range/Near Boundary → Out of Range: 이탈 알림
  - Out of Range → In Range: 복귀 알림

### 5. 알림 발송
- n8n Webhook URL로 HTTP POST
- 알림 내용: 풀 이름(토큰 페어), 포지션 ID, 현재 상태, 현재 가격, Range 경계

### 6. 설정
- .env 기반 설정:
  - `WALLET_ADDRESS`: 감시할 지갑 주소
  - `RPC_URL`: Base 체인 RPC 엔드포인트
  - `WEBHOOK_URL`: n8n Webhook URL
  - `POLL_INTERVAL_MS`: 폴링 주기 (기본 60000)
  - `THRESHOLD_PERCENT`: 이탈 근접 경고 비율 (기본 5)

## Acceptance Criteria
- [ ] 지갑 주소로 Aerodrome CL LP 포지션 목록을 조회할 수 있다
- [ ] 각 포지션의 Range 상태(In/Near/Out)를 정확히 판정한다
- [ ] 1분 주기로 자동 폴링한다
- [ ] 상태 변화 시 Webhook으로 알림을 발송한다
- [ ] 중복 알림 없이 상태 변화만 알린다
- [ ] Docker로 빌드 및 실행 가능하다

## Out of Scope
- 자동 Rebalance (향후 트랙)
- Web UI / Dashboard
- 다중 사용자 관리 (SaaS)
- Aerodrome 외 다른 DEX 지원
- 히스토리 저장 / DB 연동
