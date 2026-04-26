# oshi-cal-proxy

CORS proxy Worker，只放行 Eventernote 網域。

## 部署

```bash
npm install -g wrangler
wrangler login              # 瀏覽器登入 Cloudflare
cd worker
wrangler deploy
```

部署完成後會印出 `https://oshi-cal-proxy.<account>.workers.dev`。把這個 URL 交給前端設定。

## 用法

```
GET https://oshi-cal-proxy.<account>.workers.dev/?url=https://www.eventernote.com/events/12345
```

回傳目標頁的 HTML，並附上 `Access-Control-Allow-Origin: *`。

## 限制

- 只接受 GET（與 OPTIONS preflight）
- target URL 必須是 `https://` 且 host 屬於 `www.eventernote.com` / `eventernote.com`
- Cloudflare 邊緣快取 5 分鐘（重複貼同一 URL 不會重抓）
- Worker 不儲存任何使用者資料
