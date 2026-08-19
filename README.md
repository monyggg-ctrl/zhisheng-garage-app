# 致盛汽車保修管理系統

這是 2026-08-19 驗收基準版的 GitHub/Vercel 部署專案。

## 已驗收功能
- Supabase 登入與雙手機同步
- 客戶 / 多車輛 / 歷史維修與報價
- 維修多筆項目、單價、工資、零件成本、工資成本
- 報價轉維修單
- 材料／進貨：供應商、類型、日期、單位、編輯、刪除、篩選
- 每區搜尋
- 日／月／年營運報表：營收、成本、毛利、毛利率
- 維修工單 PDF 下載，檔名「維修工單+單號.pdf」
- iPhone 分享／列印
- 首頁期間篩選：當日（預設）、指定日期、當週、當月、當年
- 底部功能名稱「材料」

## 目前部署方式
為了保留已實機驗收過的功能，本版鎖定引用下列已驗收 Vercel JS 資產，再由 `final-home.js` 加入最後定版功能。
後續 GitHub 連接恢復後，可再把這些資產搬入同一 repository，功能不需要重寫。

## 部署到 Vercel
1. 將本資料夾內容上傳到 GitHub repository 根目錄。
2. 在 Vercel 選 `Add New Project` / `Import Git Repository`。
3. 選擇此 repository。
4. Framework Preset 選 `Other`。
5. 不需要 Build Command。
6. Output Directory 留白。
7. Deploy。

資料庫使用既有 Supabase 專案，不會因部署新前端而清空資料。
