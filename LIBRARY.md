# 收藏專區規格

收藏專區（網站的「收藏」頁）的資料都在 `_data/library.yml`。每一筆是一份值得留存的文件，新的加在最上面。

## 欄位

| 欄位 | 必填 | 說明 |
|---|---|---|
| `title` | 是 | 文件原文標題，用英文雙引號包起來 |
| `title_zh` | 否 | 中文譯名；原文是中文就省略 |
| `type` | 是 | 從這些類型擇一：指引、決議、報告、一般性意見、判決、法規、政策文件、文章、書籍、資料庫、其他 |
| `issuer` | 是 | 發布機關、法院或作者 |
| `date` | 否 | 文件發布日期，格式 YYYY-MM-DD；不確定就省略 |
| `sections` | 是 | 主題分類，可多選：`human-rights`（人權）、`gender`（性別）、`labour`（勞動）、`digital`（數位） |
| `tags` | 否 | 議題標籤，沿用 PUBLISHING.md 第 5 節的寫法 |
| `url` | 是 | 原始文件連結，優先用官方頁面 |
| `note` | 否 | 為什麼值得收藏、可以怎麼用，一兩句話，用英文雙引號包起來 |
| `added` | 是 | 加入收藏的日期 |

## 範例

```yaml
- title: "General recommendation No. 35 on gender-based violence against women"
  title_zh: "第 35 號一般性建議：基於性別的暴力侵害婦女行為"
  type: 一般性意見
  issuer: "CEDAW Committee"
  date: 2017-07-26
  sections: [gender, human-rights]
  tags: [CEDAW, 性暴力, 家庭暴力]
  url: https://www.ohchr.org/
  note: "國家盡職義務的核心依據，討論公私領域暴力時必引。"
  added: 2026-10-21
```

注意：文字欄位內不要再出現英文雙引號（需要時用「」）。檔案裡第一筆資料加入時，要把最後一行的 `[]` 刪掉。
