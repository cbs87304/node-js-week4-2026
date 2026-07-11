const jwt = require('jsonwebtoken');

// ⚠️ 寫作業前先 `npm start` 打開 http://localhost:3000/docs 看 Swagger UI 的完整規格。
// 💡 /* 作答區 ... */ 是答題提示區，取消註解後填入你的程式碼。

// ───────────────────────────────────────────────────────────
// TODO 任務一：JWT 守門員（verifyToken）
// ───────────────────────────────────────────────────────────

// - 輸入：req.headers.authorization（格式：'Bearer <token>'）
// - Authorization 格式驗證：沒帶或不符合 'Bearer <token>' 格式 → return 401 + { status: 'false', message: '請先登入' }
// - Token 驗證：取出 authorization 中 Bearer 後的 token，在 try/catch 中以 jwt.verify 驗證（secret 用 process.env.JWT_SECRET）；
//   驗證成功則將 decoded 掛到 req.user 並呼叫 next()；
//   驗證失敗（拋出例外）→ catch 中 return 401 + { status: 'false', message: 'Token 無效或已過期' }

/**
 * JWT 守門員：驗 Authorization header 的 Bearer token
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyToken = function (req, res, next) {
  // 1. 從請求的 headers 裡面抓出 authorization 欄位
  const authHeader = req.headers.authorization;

  // 2. 檢查是否有這個 header？以及格式是不是以 'Bearer ' 開頭？
  // 如果沒有帶，或是格式不對，就擋下來回傳 401 
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'false', 
      message: '請先登入' 
    });
  }

  // 3. 把 'Bearer ' 切掉，只留下真正的 token 字串
  // 這裡用 split 把字串用空格切開，拿陣列的第 1 項 (也就是 token 本體)
  const token = authHeader.split(' ')[1]; 

  // 4. 開始驗證 Token 的真偽！
  try {
    // 使用 jsonwebtoken 套件跟環境變數裡的 JWT_SECRET 來解密
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 驗證成功！把解密後的資料 (包含 user id 等) 掛載到 req 上
    // 這樣後續的 Controller 就可以透過 req.user 知道現在是誰在操作
    req.user = decoded;

    // 呼叫 next()，放行！前往下一個 middleware 或是最終的 controller
    next();
  } catch (error) {
    // 只要 token 過期，或是簽名不對被竄改過，jwt.verify 就會報錯並跑到 catch 這裡
    return res.status(401).json({ 
      status: 'false', 
      message: 'Token 無效或已過期' 
    });
  }
};

module.exports = verifyToken;
