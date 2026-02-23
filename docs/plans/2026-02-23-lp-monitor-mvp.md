# Implementation Plan: Aero Monitor MVP

## Architecture Overview

```
src/
  index.ts              # 엔트리포인트 - 메인 폴링 루프
  config.ts             # 환경변수 로딩 및 설정
  types.ts              # 타입 정의
  contracts/
    abis.ts             # 컨트랙트 ABI 정의
    addresses.ts        # 컨트랙트 주소 상수
  services/
    position.ts         # LP 포지션 조회
    pool.ts             # 풀 상태 조회 (현재 tick)
    monitor.ts          # Range 판정 + 상태 변화 감지
    notifier.ts         # Webhook 알림 발송
```

## Key Technical Decisions

- **viem** 사용하여 Base 체인 RPC 호출
- **ERC721Enumerable** 방식으로 포지션 조회 (balanceOf → tokenOfOwnerByIndex → positions)
- 두 개의 NonfungiblePositionManager 모두 확인 (v1: `0x827922...`, gauge-caps: `0xa990C6...`)
- **slot0()** 로 현재 tick 조회
- **getPool(token0, token1, tickSpacing)** 로 풀 주소 도출
- Aerodrome은 Uniswap V3와 달리 `tickSpacing`(int24)을 사용 (fee 대신)
- slot0 반환값 6개 (Uniswap V3는 7개 - feeProtocol 없음)

## Phase 1: Project Setup

### Task 1.1: Node.js 프로젝트 초기화
- `pnpm init`
- tsconfig.json 생성 (strict, ESNext, NodeNext)
- package.json scripts 설정 (dev, build, start)

### Task 1.2: 의존성 설치
- **런타임**: viem, dotenv
- **개발**: typescript, tsx, vitest, @types/node

### Task 1.3: 기본 구조 생성
- src/ 디렉토리 구조 생성
- .env.example 생성
- .gitignore 생성

## Phase 2: Contract Integration

### Task 2.1: 컨트랙트 정의 (contracts/)
- `abis.ts`: NonfungiblePositionManager, CLPool, CLFactory ABI (필요한 view 함수만)
- `addresses.ts`: 컨트랙트 주소 상수
  - NPM v1: `0x827922686190790b37229fd06084350E74485b72`
  - NPM gauge-caps: `0xa990C6a764b73BF43cee5Bb40339c3322FB9D55F`
  - CLFactory v1: `0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A`
  - CLFactory gauge-caps: `0xaDe65c38CD4849aDBA595a4323a8C7DdfE89716a`

### Task 2.2: config.ts
- dotenv 로딩
- 환경변수 파싱 및 검증
- 설정 객체 export (walletAddress, rpcUrl, webhookUrl, pollInterval, threshold)

### Task 2.3: types.ts
- `PositionInfo`: tokenId, token0, token1, tickSpacing, tickLower, tickUpper, liquidity, poolAddress, npmAddress
- `PoolState`: currentTick, sqrtPriceX96
- `RangeStatus`: 'in_range' | 'near_boundary' | 'out_of_range'
- `PositionState`: positionInfo + rangeStatus
- `AlertPayload`: 알림 메시지 페이로드 타입

### Task 2.4: position.ts - LP 포지션 조회
- `getPositionsForWallet(walletAddress)` 함수
  - 두 NPM 컨트랙트에서 balanceOf 조회
  - tokenOfOwnerByIndex로 모든 tokenId 수집
  - positions(tokenId)로 각 포지션 상세 조회
  - liquidity > 0 인 포지션만 반환 (closed position 제외)

### Task 2.5: pool.ts - 풀 상태 조회
- `getPoolAddress(token0, token1, tickSpacing, factoryAddress)` 함수
  - CLFactory.getPool() 호출
- `getPoolState(poolAddress)` 함수
  - CLPool.slot0() 호출하여 현재 tick 반환

## Phase 3: Monitoring Logic

### Task 3.1: monitor.ts - Range 판정
- `determineRangeStatus(currentTick, tickLower, tickUpper, thresholdPercent)` 함수
  - Range 전체 폭 = tickUpper - tickLower
  - threshold tick 수 = Range 폭 * thresholdPercent / 100
  - In Range: tickLower + threshold <= currentTick < tickUpper - threshold
  - Near Boundary: tickLower <= currentTick < tickLower + threshold OR tickUpper - threshold <= currentTick < tickUpper
  - Out of Range: currentTick < tickLower OR currentTick >= tickUpper
- 핵심 로직이므로 **테스트 작성 필수**

### Task 3.2: monitor.ts - 상태 변화 감지
- `MonitorState` 클래스 (또는 Map)
  - 각 포지션(tokenId)별 이전 상태 저장
  - `checkStateChange(tokenId, newStatus)` → 변화가 있으면 이전/현재 상태 반환
  - 첫 체크 시 Out of Range / Near Boundary이면 알림 발송 (초기 상태)

## Phase 4: Notification

### Task 4.1: notifier.ts - Webhook 발송
- `sendAlert(payload: AlertPayload)` 함수
  - fetch()로 WEBHOOK_URL에 POST
  - 재시도 로직 (1회 재시도)
  - 에러 시 콘솔 로그 (서비스 중단하지 않음)

### Task 4.2: 알림 메시지 포맷
- 풀 이름 (token0/token1 심볼)
- 포지션 ID (tokenId)
- 상태 변화 (예: "In Range → Out of Range")
- 현재 tick / Range 경계 (tickLower, tickUpper)
- 토큰 심볼 조회를 위한 ERC20 name/symbol 호출

## Phase 5: Main Loop & Docker

### Task 5.1: index.ts - 메인 루프
- viem PublicClient 생성 (Base 체인)
- 설정 로딩
- pollInterval마다:
  1. 포지션 목록 조회
  2. 각 포지션의 풀 상태 조회
  3. Range 상태 판정
  4. 상태 변화 감지 및 알림 발송
  5. 콘솔에 현재 상태 로그
- graceful shutdown (SIGINT, SIGTERM)

### Task 5.2: Dockerfile & docker-compose
- Multi-stage Dockerfile (build → run)
- docker-compose.yml (.env 마운트)

### Task 5.3: .env.example 완성 및 README 작성
- 모든 환경변수 문서화

## Dependency Graph

```
Phase 1 (Setup)
  └─→ Phase 2 (Contract Integration)
        ├─→ Phase 3 (Monitoring Logic)
        │     └─→ Phase 5.1 (Main Loop)
        └─→ Phase 4 (Notification)
              └─→ Phase 5.1 (Main Loop)
                    └─→ Phase 5.2 (Docker)
                          └─→ Phase 5.3 (Docs)
```
