# toss‑trades‑to‑ai

> **토스증권**의 거래내역서를 AI 모델에게 제공하고, 거래 패턴, 리스크, 개선안 등의 피드백을 받을 수 있는 CLI 툴체인

---

## 📦 설치

```bash
# ① 깃 저장소 클론
git clone https://github.com/…/toss-trades-to-ai.git
cd toss-trades-to-ai

# ② 의존성 설치
npm i

# ③ (선택) 전역 링크 – CLI 전역 사용이 편리
npm link   # 이후 parse‑trades, compact‑trades, toss‑trades 명령 사용 가능
```

> **Node ≥ 14** & `package.json` → `"type":"module"` (이미 설정됨)

---

## 🚀 퀵스타트 – 30초 체험

```bash
# 1. 브라우저에서 토스증권 거래내역서를 Ctrl +A / Ctrl +C 복사
# 2. 새 파일에 붙여넣기                                   ↓ ↓ ↓
code data/raws/2024-2025.md
#    (저장)

# 3. 통합 파이프라인 실행 – 인터랙티브
npx toss-trades ctl-run
#    • 파일 하나 또는 "<모두>"
#    • 집계 기준(date|symbol) / 주기(day|month) 선택

# 4. 결과 확인
cat output/2024-2025.json

# 5. AI 프롬프트 작성
code prompt/guide.md     # 템플릿 참고 후 ↓
#    output/…json 을 AI 대화창에 붙여넣고, guide.md 프롬프트 추가

# 6. AI 답변을 즐긴다 😎
```

---

## 워크플로 상세

| 단계       | 작업                                       | CLI 명령                                                                                         | 생성 파일                   |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------- |
| ① Raw 수집 | 거래내역 복사→`data/raws/` `.md/.txt` 저장 | –                                                                                                | `data/raws/2024-2025.md`    |
| ② 파싱     | Raw → 행별 JSON                            | `parse-trades <raw> -o <json>` <br>또는<br>`toss-trades parse …`                                 | `data/input/2024-2025.json` |
| ③ 집계     | JSON → Compact JSON                        | `compact-trades <in> -o <out> --target symbol --period month`<br>또는<br>`toss-trades compact …` | `output/2024-2025.json`     |
| ④ AI 전송  | Compact JSON + 프롬프트                    | –                                                                                                | –                           |

**한 번에** : `toss-trades ctl-run` 은 ②+③ 번을 일괄 처리합니다.

---

## CLI 레퍼런스

```
toss-trades <command> [options]

Commands:
  parse <raw.md>             Raw 텍스트 → JSON
  compact <in.(json|md)>    JSON or Raw → Compact JSON
  ctl-run                   raws/ 스캔 → parse+compact 파이프라인(대화식)

Global Options (compact):
  -o, --out <file>    출력 파일 경로 (기본값 compact.json)
  -t, --target <t>    집계 기준 date|symbol  (기본 symbol)
  -p, --period <u>    집계 주기 day|month   (기본 month)
```

샘플:

```bash
# symbol·month 집계 JSON 생성
npx toss-trades compact data/input/2023-2024.json -o output/23-24.json -t symbol -p month
```

---

## 디렉터리 구조

```
├─ data/
│  ├─ raws/      # 복사‑붙여넣기한 원본 텍스트
│  └─ input/     # parse‑trades 결과(JSON rows)
├─ output/       # compact‑trades 결과
├─ prompt/       # guide.md (AI 프롬프트 예시)
├─ bin/          # CLI 실행 파일 (ESM)
└─ lib/          # 파서 & 집계 공용 라이브러리
```

---

## FAQ

**Q. `MODULE_TYPELESS_PACKAGE_JSON` 경고가 나와요.**  
A. 이미 `package.json` 에 `"type":"module"` 를 넣어 해결했습니다. 오래된 캐시면 `node --trace-warnings` 로 확인 후 다시 실행하세요.

**Q. `unknown command ...` 오류?**  
A. `parse-trades` 와 `compact-trades` 는 서브커맨드가 아닌 _래퍼_ 입니다. 설치 후에는 `toss-trades parse …`, `toss-trades compact …` 로 호출하거나, `npm link`로 전역 설치하면 `parse-trades` 만으로도 동작합니다.

---

## 라이선스

[MIT](LICENSE)
