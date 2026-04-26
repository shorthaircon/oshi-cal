# oshi-cal

給小圈子用的日本偶像行程日曆，貼 [Eventernote](https://www.eventernote.com/) URL 自動建立活動，純前端、無帳號、資料存於瀏覽器 localStorage。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173/oshi-cal/
npm run build
npm run preview
```

## 技術棧

Vue 3 + Vite + Pinia + Vue Router + date-fns + ics

## 部署

push 到 `main` 後自動 build 並部署到 GitHub Pages：<https://shorthaircon.github.io/oshi-cal/>

CORS proxy 由 Cloudflare Worker 提供（見 `worker/`，待建置）。

