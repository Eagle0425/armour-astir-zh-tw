# Armour Astir: Advent · 繁體中文規則庫

完整逐頁譯稿與可在手機查閱的非官方靜態規則網站。

網站網址：[玩家手冊](https://eagle0425.github.io/armour-astir-zh-tw/)／[GM 工作台](https://eagle0425.github.io/armour-astir-zh-tw/gm.html)；儲存庫：[Eagle0425/armour-astir-zh-tw](https://github.com/Eagle0425/armour-astir-zh-tw)。

## 收錄範圍

依英文插畫版 `ArmourAstir_af_illus.pdf` 的 174 個實體頁面完整翻譯，整理為 58 個主題章節，約十五萬三千字元。包括基本與特殊動作的解說和範例、八種完整扮演書、十一種戲法、十四個士兵動作、標籤與裝備、母艦與魔鎧建造、機體範例、衝突回合與六類衝突場景、導演規則、五個任務引子、四個範例世界、附錄、製作名單及版本紀錄。

扮演書的設定、裝備、起始及額外動作在同一章完整呈現。插畫頁保留來源頁碼與簡短圖說；本網站不重製全部原書插畫。中文角色卡 PDF 不在這次交付範圍；全書可由 `site/reader.html` 閱讀、列印或使用瀏覽器另存。

依使用者要求，**未讀取或採用機翻檔**。中文內容直接對照英文原書翻譯。免費版與參考表只辨認用途及重複範圍，不覆蓋插畫版正文規則。

## 玩家手冊與 GM 工作台

參考 Root 的雙入口方式，玩家手冊收錄創角、動作、扮演書、裝備、魔鎧與母艦；GM 工作台集中衝突回合、導演規則、敵人、任務、世界與主持附錄。兩區的正文資料、目錄、預設搜尋、相鄰章節與列印範圍分開。玩家章節內16組導演筆記另移至GM專屬章節；僭取者的導演專頁也移出玩家手冊，原有頁面及小節連結會轉至正確位置。共用規則在兩區皆可讀；舊版連結會帶到正確入口。收藏不會因切換區域遺失。

玩家列印 `site/player-reader.html`，GM 列印 `site/gm-reader.html`；`site/reader.html` 保留含 GM 的完整原書版本。

核心書以外五份 PDF 的盤點見[資源翻譯盤點](https://eagle0425.github.io/armour-astir-zh-tw/#resources)與 `translation/resource-inventory.json`。四份配套 PDF 尚未中文化；主要規則已有正文譯文，不能當成 PDF 表單或摘要本身已完成。角色卡的 Let Loose、Arcane Generator 以及綜合參考表的部門門檻與核心書有差異，未拿它們覆蓋核心規則。

## 閱讀功能

- 中文全文與英文名稱搜尋，支援範圍篩選及 `p83` 等來源頁碼定位。
- 八種扮演書完整動作直接閱讀。
- 章節、原書頁面及小節的永久連結。
- 本機收藏、深淺主題、手機目錄及完整靜態列印版。
- 不使用外部字體、分析追蹤或套件 CDN，發布資源採相對路徑。

## 翻譯與校訂

`content/pages/p001.md` 至 `p174.md` 是唯一中文正文來源；`glossary.json` 保存集中術語。`chapters.json` 決定導覽及頁面範圍。

174 頁已完成一次由不同翻譯工作單元進行的 AI 語義初校。覆核保留了原始問題紀錄，再另記修正；沒有把「頁數齊全」當成語義正確的證明。這是可閱讀的完整譯稿與初校版，尚未經熟悉本作的人類譯者進行出版級終校。

來源指紋、逐頁內容雜湊、獨立初校與修訂紀錄見 [translation/README.md](translation/README.md)。原書不一致另列於 `translation/source-issues.json`，例如次要部門脆弱門檻、範例機體的核心／路數、舊動作名稱、d66 重號及封底任務數量。沒有自行發明修正版規則。

參考 [game-doc-template](https://github.com/wayne930242/game-doc-template) 的集中術語、完整翻譯、分章審閱及來源追蹤方法；閱讀功能參考先前的 [Root 玩家手冊](https://github.com/Eagle0425/root-rpg-player-reference)。本專案採無外部依賴的靜態網站架構，沒有直接複製整套 Astro／Starlight 範本。

## 維護與建置

Python 3.12 以上，驗證 JavaScript 語法另需 Node.js。建置本身沒有第三方 Python 或 Node 套件依賴。

```text
python scripts/build.py
python scripts/validate.py
node --check site/app.js
node --check site/data.js
python -m http.server 8770 --directory site
```

修改正文後先重新建置，再驗證。完整英文來源抽字檔與草稿留在工作區、不上傳；全新 checkout 可依已儲存的來源指紋重建網站。若修改與既有覆核綁定的段落，必須更新 `translation/resolutions.json` 及相應覆核紀錄，不能只重算雜湊冒稱完成複核。

## GitHub Pages

`.github/workflows/pages.yml` 在推送 `main` 後，重建、驗證並發布 `site/`。第一次須在儲存庫 Pages 設定選擇 GitHub Actions 來源。所有路徑適用於 `/armour-astir-zh-tw/` 子路徑；不需要伺服器改寫規則。

## 權利

Armour Astir: Advent © Briar Sovereign，原作保留所有權利。封面原繪 Zac Morrison；其他原作美術的權利歸各創作者。製作名單完整譯於前言與致謝章。

本網站是非官方繁體中文譯稿，不代表官方授權譯本。沒有將原作文字、圖像或商標宣告為開源授權。請透過[官方頁面](https://weregazelle.itch.io/armour-astir)支持原作。
