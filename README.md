# toss‑trades‑to‑ai

> **토스증권** 거래내역서를 AI 모델에게 전달해 패턴·리스크·개선안을 분석하는 **CLI 툴체인**

---

## 📦 설치

```bash
# ① 저장소 클론
git clone https://github.com/…/toss-trades-to-ai.git
cd toss-trades-to-ai

# ② 의존성 설치
npm i

# ③ (선택) 전역 링크 – 어디서든 CLI 사용
npm link   # 이후 toss‑trades 명령을 전역에서 실행
```

> **Node ≥ 14** & `"type":"module"` 설정 (이미 `package.json` 에 포함)

---

## 🚀 30초 체험

```bash
# 1. 토스증권 거래내역서(웹) 전체 복사
# 2. 다음 경로에 붙여넣기
code data/raws/2024-2025.md   # 저장

# 3. 통합 파이프라인 실행 – 인터랙티브
npx toss-trades ctl-run
#   • 대상 파일 선택(또는 <모두>)
#   • 집계 기준(date|symbol) / 주기(day|month) 선택

# 4. 결과 확인
cat output/2024-2025.summary.json

# 5. AI 프롬프트 작성
code prompt/guide.md         # 템플릿 참고
#   output/...summary.json 을 AI에게 붙여넣고, guide.md 내용 추가

# 6. AI 답변을 즐긴다 😎
```

---

## 워크플로 개요

| 단계       | 작업                                       | CLI 명령                                                                 | 결과 파일                        |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------- |
| ① Raw 수집 | 거래내역 복사→`data/raws/` `.md/.txt` 저장 | –                                                                        | `data/raws/2024-2025.md`         |
| ② Flatten  | 멀티라인 Raw → **줄‑병합 row JSON**        | `toss-trades flatten <raw> -o <rows.json>`                               | `data/input/2024-2025.rows.json` |
| ③ Parse    | row JSON → 거래 객체 배열                  | `toss-trades parse <rows.json> -o <parsed.json>`                         | `data/input/2024-2025.json`      |
| ④ Compact  | 객체 배열 → 집계(JSON)                     | `toss-trades compact <parsed.json> -o <summary.json> -t symbol -p month` | `output/2024-2025.summary.json`  |
| _한 번에_  | **ctl‑run** = ②+③+④ 일괄처리               | `toss-trades ctl-run`                                                    | 동일                             |

---

## CLI 레퍼런스

```text
toss-trades <command> [options]

Commands:
  flatten <raw.md>           Raw 텍스트 → row JSON
  parse   <rows.json|raw>    row JSON → object JSON (또는 Raw 직접)
  compact <json|raw>         객체 JSON → Compact JSON
  ctl-run                    raws/ 스캔 → flatten+parse+compact(대화식)

Options (공통):
  -o, --out <file>           출력 파일 경로 (기본값 명령별로 다름)

compact 전용:
  -t, --target <t>           집계 기준     date | symbol   (기본 symbol)
  -p, --period <u>           집계 주기     day  | month    (기본 month)
```

예시:

```bash
# 1) Raw → rows
npx toss-trades flatten data/raws/2024-05.md -o 2024-05.rows.json

# 2) rows → objects
npx toss-trades parse 2024-05.rows.json -o 2024-05.json

# 3) objects → 월·심볼 요약
npx toss-trades compact 2024-05.json -o 2024-05.summary.json -t symbol -p month
```

---

## 디렉터리 구조

```
├─ data/
│  ├─ raws/           # 복사·붙여넣기한 원본 텍스트
│  └─ input/          # ① rows.json ② parsed.json 결과
├─ output/            # compact summary 결과
├─ prompt/            # guide.md (AI 프롬프트 예시)
├─ bin/               # CLI 실행 파일
└─ lib/               # 파서 & 집계 라이브러리
```

---

## FAQ

**Q. `MODULE_TYPELESS_PACKAGE_JSON` 경고가 뜹니다.**
A. 이미 ESM 설정이 되어 있습니다. 캐시 문제일 수 있으니 `node --trace-warnings` 로 확인 후 다시 실행하세요.

**Q. `unknown command` 오류?**
A. `toss-trades` 가 최상위 명령입니다. 전역 설치(`npm link`) 후에는 `toss-trades …` 혹은 하위 스크립트를 그대로 호출하세요.

---

## License

[MIT](LICENSE)
