# TODO

피킹 시스템 다음 작업 목록입니다.

## 1. 우체국정보 보강 기능

우체국 양식 CSV를 실제로 사용하기 위해 필요한 수취인 정보를 셀피아에서 추가 수집해야 합니다.

### 목표

- 셀피아 주문조회/주문원본/송장출력 관련 화면에서 수취인 정보 수집
- Supabase `orders` 테이블 업데이트
- 우체국 양식 CSV의 빈 컬럼 채우기

### 추가 수집 필요 필드

- `receiver_tel` / 수취인연락처
- `receiver_mobile` / 수취인핸드폰
- `zipcode` / 우편번호
- `receiver_address` / 주소
- `order_memo` / 주문메모
- `order_date` / 주문일자
- `order_item_no` / 주문품목No

### 추천 버튼명

- `우체국정보 보강`
- 또는 `주문정보 보강`

### 추천 흐름

1. 재고매칭 데이터 수집
2. 작업순서 정렬
3. 우체국정보 보강 실행
4. Supabase 업데이트
5. 우체국 양식 CSV 내보내기

### SQL 제안

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_tel text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_mobile text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zipcode text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_memo text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_item_no text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
```

## 2. 출력순번 갱신 기능

테스트 결과 셀피아 송장 순서번호는 운송장 출력순서대로 바뀌는 것으로 확인되었습니다.

### 목표

- 재고매칭탭 원본 순번과 출력 후 순번을 분리
- 출력 후 셀피아 순서번호를 다시 가져와 시스템에 저장
- 피킹/검품 기준을 출력순번으로 통일

### 추천 컬럼

```text
original_seq_no
planned_print_seq_no
print_seq_no
seq_updated_at
```

### 처리 방식

1. 재고매칭탭에서 최초 수집한 순번은 `original_seq_no`
2. 시스템에서 작업순서로 만든 예정 순번은 `planned_print_seq_no`
3. 송장 출력 후 다시 가져온 실제 순번은 `print_seq_no`
4. 피킹/검품 화면은 `print_seq_no` 우선 사용
5. 없으면 `planned_print_seq_no`, 그다음 `original_seq_no` 사용

## 3. 라벨 CSV 형식 통일

라벨 CSV는 “라벨 한 장 = CSV 한 줄” 기준으로 통일합니다.

### 현재 결정된 방향

- 자사코드 `[GP...]`만 포함
- `[CA...]` 제외
- 자사코드 빈값 제외
- 자사코드는 `]`까지만 남김
- 옵션명은 마지막 `:` 뒤, `[` 앞 기준으로 정리
- 상품코드 `6778` 시작 시 상품명 통일
- 수량만큼 행 복사
- 복사된 각 행 수량은 1

### 추천 CSV 헤더

```csv
라벨번호,상품코드,자사코드,판매처상품명,판매처옵션명,수량,접수일자,수취인
```

## 4. 라벨번호 / 검품탭 연동

대표님 의견 기준으로 라벨은 중복 출력 방지와 검품 매칭에 활용되어야 합니다.

### 방향

- 라벨번호는 접수요일 + 번호 형식
- 예: `월1`, `월2`, `화1`, `수3`
- `당1` 같은 당일 표기는 사용하지 않음
- CSV에서는 수량만큼 행 분리
- 검품탭에서는 상품 행을 쪼개지 않고 한 행에 라벨번호를 모아서 표시

### 예시

라벨 CSV:

```text
월1 / 상품A / 수량 1
월2 / 상품A / 수량 1
월3 / 상품A / 수량 1
```

검품탭:

```text
상품A / 총수량 3 / 라벨번호 월1, 월2, 월3
```

## 5. 라벨 중복 출력 방지

이미 출력한 라벨이 다음날 다시 중복 출력되지 않도록 이력 관리가 필요합니다.

### 필요 구조

```text
label_print_history
- id
- label_key
- label_no
- inv_no
- ord_no
- product_code
- private_code
- option_name
- order_date
- unit_index
- printed_at
- print_batch_id
- is_reprint
- created_at
```

### label_key 추천 구성

```text
inv_no 또는 ord_no
product_code
private_code
option_name
order_date
unit_index
```

### 처리 방식

1. 라벨 CSV 생성 전 기존 출력 이력 확인
2. 이미 출력된 `label_key`는 기본 제외
3. 재출력 옵션 선택 시에만 포함
4. 라벨번호는 사람이 보는 값
5. 실제 중복 판단은 `label_key` 기준

## 6. soft delete 전환

현재 일부 주문 정리 로직은 실제 DELETE 방식입니다.

### 문제

- 셀피아 수집 실패
- 일부 페이지만 수집
- 날짜 선택 오류

이런 상황에서 실제 필요한 데이터가 삭제될 수 있습니다.

### 권장 방향

```text
DELETE
-> is_active = false
-> missing_from_latest_sync = true
-> last_seen_at 갱신
```

### 필요 작업

- DELETE 위치 확인
- soft delete 컬럼 추가 SQL 제안
- 기존 화면에서는 active 주문만 표시
- 복구 가능성 확보

## 7. DB key / 보안 구조 개선

현재 브라우저에서 Supabase에 직접 접근하는 구조가 남아 있습니다.

### 단기

- service_role key 절대 사용 금지
- anon/publishable key만 사용
- Supabase RLS 확인
- 대표님 확인용 링크 공유 후 repo private 전환 검토

### 장기

```text
브라우저
-> 내부 API / NAS API
-> PostgreSQL 또는 Supabase
```

### 필요 작업

- `APP_CONFIG.dbMode = 'api'` 구조 준비
- `apiBaseUrl` 기준 DB 요청 전환
- NAS PostgreSQL 이전 대비
- Supabase key를 브라우저 코드에서 제거

## 8. NAS PostgreSQL 이전 준비

현재는 Supabase를 사용 중이나, 추후 회사 Synology NAS의 PostgreSQL로 이전 예정입니다.

### 준비할 것

- 테이블 스키마 정리
- Supabase 전용 REST 호출 최소화
- DB helper 함수 유지
- `dbMode: 'supabase' | 'api' | 'nas-api'` 구조 유지
- API 계층 설계

### 필요한 API 후보

```text
GET /orders
GET /order-items
PATCH /orders/:id
PATCH /order-items/:id
POST /sync-log
POST /memo-update-log
```

## 9. 셀피아 메모 업데이터 안정화

### 현재 상태

- 관리메모/관리메모2/배송보류 반영 구조 있음
- 반영 전 미리보기 구조 있음

### 다음 개선

- 반영 대상 수 표시 강화
- 성공/실패 로그 강화
- 실패 송장번호 표시
- 재시도 기능
- `memo_update_log` 실제 저장

### 로그 필드 후보

```text
target_date
inv_no
ord_no
memo_value
memo2_value
hold_status
status
error_message
started_at
finished_at
```

## 10. 작업순서 CSV / 우체국 CSV 테스트

### 테스트해야 할 것

- 작업순서 화면 순서와 CSV 순서 일치
- 1종 주문이 먼저 나오는지
- 골드 포함 주문이 뒤로 빠지는지
- 같은 주문의 상품이 붙어서 나오는지
- 우체국 양식 헤더가 정확한지
- 주소/연락처 누락 경고 표시
- 엑셀에서 한글 깨짐 없음

## 11. GitHub Pages 배포 주의

현재 GitHub Pages로 테스트 링크 공유 가능.

### 주의

- Public repo면 코드가 공개됨
- Supabase key가 보일 수 있음
- 대표님 확인용 임시 공유 후 private 전환 검토
- 운영용이면 API 구조로 전환 필요

## 12. AI 작업 기본 지시문

Claude/Codex/ChatGPT에게 작업 요청 시 공통으로 붙일 내용:

```text
이 repo는 회사 내부 피킹 시스템입니다.

주의:
- style.css는 수정하지 마세요.
- 실제 Supabase DB에 직접 접속하거나 데이터를 수정하지 마세요.
- DB 변경이 필요하면 SQL 제안만 작성해주세요.
- 기존 피킹/검품/골드상품/부족수량/보류/CS 기능은 깨지지 않게 유지해주세요.
- 수정 전에는 수정 대상 파일과 계획을 먼저 알려주세요.
- 수정 후에는 수정한 파일, 변경한 함수, 테스트 방법을 요약해주세요.
```

## 13. 우선순위

1. 우체국정보 보강 기능
2. 출력순번 갱신 기능
3. 라벨 CSV 형식 통일
4. 라벨번호 검품탭 연동
5. 라벨 중복 출력 방지
6. soft delete 전환
7. DB key 제거/API 구조 전환
8. NAS PostgreSQL 이전 준비

---

## 14. 미송피킹 → 검품 → CS 연동 확장

현재는 피킹 중심으로 기능이 정리되어 있으므로, 이후에는 미송피킹/검품/CS를 하나의 흐름으로 연결해야 합니다.

### 목표

```text
일반 피킹
-> 미송피킹
-> 검품
-> CS
-> 셀피아 메모/배송보류 반영
```

피킹 단계에서 발생한 부족/미송/보류 정보가 다음 단계로 자동 전달되도록 하는 것이 목표입니다.

---

### 14-1. 미송피킹 연동

#### 해야 할 일

- 일반 피킹에서 부족수량 입력 시 미송피킹 목록에 자동 반영
- 미송피킹 탭에서 부족 상품만 모아보기
- 미송피킹에서 확보/미확보 상태 변경
- 확보 시 부족수량 조정 또는 해제
- 미확보 시 검품/CS 단계로 상태 전달

#### 필요 필드 후보

```text
shortage_qty
misong_status
misong_checked_at
misong_checked_by
misong_memo
```

#### 상태 후보

```text
미송대상
확보완료
미확보
CS필요
```

#### 테스트

- 부족수량 입력 시 미송피킹에 나타나는지
- 부족수량 해제 시 미송피킹에서 사라지는지
- 미확보 처리 시 CS 대상으로 넘어가는지
- 골드상품/일반상품 구분이 유지되는지

---

### 14-2. 검품탭 연동

#### 해야 할 일

- 피킹완료 주문을 검품탭에서 확인
- 미송/부족/보류 주문은 검품탭에서 강조 표시
- 라벨번호가 있는 상품은 검품탭에도 표시
- 수량 여러 개인 상품은 검품탭에서 무조건 행을 쪼개지 않고 한 행에 라벨번호를 묶어서 표시

#### 예시

```text
상품A / 총수량 3 / 라벨번호 월1, 월2, 월3
```

#### 필요 필드 후보

```text
inspection_status
inspection_checked_at
inspection_checked_by
inspection_memo
label_no_list
```

#### 상태 후보

```text
검품대기
검품완료
검품보류
CS필요
```

#### 테스트

- 피킹완료 주문이 검품탭에 정상 표시되는지
- 미송/부족 주문이 검품탭에서 구분되는지
- 라벨번호가 검품탭에 그대로 표시되는지
- 검품완료 처리 후 상태가 유지되는지

---

### 14-3. CS탭 연동

#### CS로 넘어가는 조건

- 미송 확정
- 부족수량 미해결
- 배송보류 필요
- 고객 안내 필요
- 주문메모 확인 필요
- 주소/연락처 문제
- 상품/옵션 불일치
- 기타 작업자 확인 필요

#### 해야 할 일

- CS 대상 주문 자동 수집
- CS 사유 표시
- 관리메모/관리메모2에 반영할 내용 확인
- 배송보류 설정 여부 확인
- CS 처리완료/보류중 상태 관리
- 셀피아 메모 업데이터와 연결

#### 필요 필드 후보

```text
cs_status
cs_reason
cs_memo
cs_checked_at
cs_checked_by
memo_update_status
hold_status
```

#### 상태 후보

```text
CS필요
CS처리중
CS완료
셀피아반영대기
셀피아반영완료
```

#### 테스트

- 미송확정 주문이 CS탭에 뜨는지
- 배송보류 필요 주문이 CS탭에 뜨는지
- CS 처리 후 셀피아 반영 대상으로 넘어가는지
- 반영 완료 후 상태가 업데이트되는지

---

### 14-4. 단계별 공통 상태 관리

#### 추천 공통 상태값

```text
picked
shortage_qty
misong_status
inspection_status
cs_status
hold_status
memo_update_status
```

#### 전체 상태 흐름 예시

```text
피킹완료
-> 미송대상
-> 미송확정
-> 검품대기
-> CS필요
-> CS처리중
-> 셀피아반영대기
-> 셀피아반영완료
```

또는 정상 주문:

```text
피킹완료
-> 검품대기
-> 검품완료
```

---

### 14-5. 셀피아 반영 연동

#### 목표

CS 또는 검품에서 확정된 내용을 셀피아 메모 업데이터로 넘깁니다.

#### 반영 대상

- 관리메모
- 관리메모2
- 배송보류 설정/해제
- 부족수량 관련 메모
- 서랍번호
- 미송 처리 내용

#### 필요 작업

- CS 완료 건을 `셀피아반영대기`로 표시
- 메모 업데이터에서 반영 대상 자동 조회
- 반영 전 미리보기
- 반영 성공/실패 로그 저장

---

### 14-6. 우선순위

1. 부족수량 → 미송피킹 자동 연동
2. 미송확정 → CS 대상 자동 생성
3. 피킹완료 → 검품탭 상태 연동
4. 검품탭 라벨번호 표시
5. CS 처리상태 관리
6. CS/검품 결과 → 셀피아 메모 업데이터 반영
7. 전체 상태 로그 저장
