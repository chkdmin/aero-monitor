# Workflow: Aero Monitor

## Task Execution Protocol
1. Task를 시작하기 전에 요구사항을 확인한다
2. 구현을 진행한다
3. 핵심 로직에 대해 테스트를 작성한다 (test-after)
4. Task 완료 시 커밋한다

## Testing Requirements
- 접근 방식: Test-after (구현 후 테스트 작성)
- 커버리지 목표: 없음 (핵심 로직만 테스트)
- 테스트 대상: 비즈니스 로직, 가격 계산, Range 판정 등 핵심 로직
- 테스트 도구: vitest

## Commit Conventions
- 커밋 빈도: Task 단위 (각 Task 완료 시 커밋)
- 커밋 메시지 형식: Conventional Commits
  - `feat:` 새 기능
  - `fix:` 버그 수정
  - `refactor:` 리팩토링
  - `test:` 테스트 추가/수정
  - `chore:` 빌드, 설정 등
  - `docs:` 문서

## Phase Completion Checkpoints
- 각 Phase 완료 시 다음을 확인:
  - 모든 Task가 완료되었는가
  - 핵심 로직 테스트가 통과하는가
  - 코드가 정상 빌드되는가
  - 커밋이 모두 완료되었는가
