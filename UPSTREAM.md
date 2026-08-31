# Upstream

이 저장소는 [marmelab/atomic-crm](https://github.com/marmelab/atomic-crm)의 **private 미러**입니다.
GitHub의 진짜 fork는 원본이 public이면 fork도 public이 되기 때문에, 전체 히스토리를 그대로 복제하는 방식으로 가져왔습니다.
따라서 GitHub UI에 `forked from` 배지는 표시되지 않습니다.

- 미러 기준 커밋: `167a4cdb` (upstream `main`, 2026-07-27)
- 가져온 것: `main` 브랜치 전체 히스토리(1,634 커밋), 태그 `v1.0.0` / `v1.5.0`
- 가져오지 않은 것: upstream의 작업용 브랜치(`feat/*`, `fix/*`, `dependabot/*` 등). 필요하면 아래 remote로 언제든 fetch 가능

## Upstream 동기화

`upstream` remote가 이미 연결되어 있습니다(푸시는 막아둠).

```bash
git fetch upstream
git log --oneline main..upstream/main   # 새로 올라온 변경 확인
git merge upstream/main                 # 또는 필요한 커밋만 cherry-pick
```

## 라이선스

원본은 MIT 라이선스입니다. `LICENSE.md`의 원저작권 표기(Marmelab)를 삭제하지 마세요.
우리 코드를 추가할 때는 기존 표기를 유지한 채로 덧붙이면 됩니다.
