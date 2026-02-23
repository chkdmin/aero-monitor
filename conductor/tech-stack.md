# Tech Stack: Aero Monitor

## Language
- TypeScript (Node.js)

## Framework
- Node.js runtime (LTS)
- No web framework needed initially (백그라운드 서비스 중심)

## Key Libraries
- **viem** - Base 체인 RPC 인터랙션, 컨트랙트 읽기
- **node-cron** 또는 **setInterval** - 주기적 폴링
- **axios** 또는 **fetch** - Webhook 발송 (n8n → Telegram)

## Infrastructure
- **Docker** - 컨테이너화하여 배포
- **Cloud** - AWS/GCP 등 클라우드 환경에서 운영
- **RPC Provider** - Alchemy, Infura 등 Base 체인 RPC 엔드포인트

## Dev Tools
- **pnpm** - 패키지 매니저
- **tsx** - TypeScript 실행
- **vitest** - 테스팅
- **ESLint + Prettier** - 코드 품질
- **dotenv** - 환경변수 관리 (.env)

## Alert System
- n8n Webhook URL로 HTTP POST 발송 (기존 n8n → Telegram Bot 파이프라인 활용)
- 추후 알림 채널 확장 가능한 구조
