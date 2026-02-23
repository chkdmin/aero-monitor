# Product Definition: Aero Monitor

## Vision
Aerodrome Finance의 집중 유동성(Concentrated Liquidity) LP 포지션을 실시간으로 감시하여,
설정된 가격 Range 이탈 또는 이탈 근접 시 즉시 알림을 보내는 모니터링 서비스.
장기적으로는 자동 Rebalance 기능까지 확장한다.

## Target Users
- 1차: Aerodrome LP를 운용하는 개인 사용자 (본인 사용)
- 2차: 다수 사용자가 이용할 수 있는 SaaS 형태로 확장 고려

## Goals
- Aerodrome LP 포지션의 Range 이탈을 실시간으로 감지
- 이탈 근접(threshold) 시 사전 경고 알림 발송
- 이탈 발생 시 즉시 알림 발송으로 빠른 대응 가능
- (향후) 자동 Rebalance 기능 구현

## Guidelines
- 개인 사용 우선, 이후 서비스화를 고려한 구조로 설계
- Base 체인의 Aerodrome DEX 집중 유동성 풀 대상
- 알림 채널은 확장 가능하게 설계 (Telegram, Discord, etc.)
