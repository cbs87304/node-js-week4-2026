const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./routes/auth');
const swaggerDoc = require('./fixtures/swagger.json');

const app = express();

// ───────────────────────────────────────────────────────────
// TODO 任務五：將 middleware、router、守門員依序掛上 app
// ───────────────────────────────────────────────────────────
// 1. cors()
// 2. express.json()
// 3. Swagger UI /docs（已預先提供如下，同學不需調整）
// 4. /auth router
// 5. 404 守門員（無此路由資訊）
// 6. 錯誤處理守門員（⚠️ 4 個參數、最後一個）
//    回傳 status 500，body 包含兩個欄位：
//    - err：錯誤的類別名稱（例如 'SyntaxError'）
//    - message：錯誤訊息
//
// ⚠️ **最後不需呼叫 app.listen()** — 這個部分交由 server.js 負責（分離「組裝」跟「啟動」，這樣 test.js 可以 supertest 直接戳 app、不佔 port）。

// 1. cors()：
// 這是跨網域資源共用，沒加這個的話，前端用 API 會一直被瀏覽器阻擋！
app.use(cors());

// 2. express.json()：
// 讓 Express 看得懂前端傳過來的 JSON 格式資料（這樣 req.body 才抓得到帳號密碼）
app.use(express.json());

// 3. Swagger UI /docs
// 給前端看 API 文件的介面
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// 4. 掛載 /auth 路由
// 告訴 Express，只要網址開頭是 /auth 的，全部交給 authRouter 去處理
// 例如：前端打 /auth/login，就會進到寫好的 Login API
app.use('/auth', authRouter);

// 5. 404 守門員：迷路防護網
// 請求會由上往下流，如果前面的路由（/docs 或 /auth）都沒接住這個網址
// 就會掉進這裡，統一回傳 404 跟提示訊息
app.use((req, res, next) => {
  res.status(404).json({ 
    status: "false",
    message: '無此路由資訊' 
  });
});

// 6. 錯誤處理守門員： 4 個參數
// 只要前面任何一個地方拋出 Error (例如 JSON 格式填錯導致 SyntaxError)
// 或是程式裡呼叫了 next(err)，全部都會被吸到這裡來！
app.use((err, req, res, next) => {
  // 保持伺服器不死機，回傳 500 給前端
  res.status(500).json({
    err: err.name,       // 錯誤的類別名稱（例如 'SyntaxError'）
    message: err.message // 具體的錯誤訊息
  });
});

module.exports = app;
