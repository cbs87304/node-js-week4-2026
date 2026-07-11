const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/verifyToken');
const initialUsers = require('../fixtures/users.json');

// ⚠️ 寫作業前先 `npm start` 打開 http://localhost:3000/docs 看 Swagger UI 的完整規格。
// 💡 /* 作答區 ... */ 是答題提示區，取消註解後填入你的程式碼。

// ───────────────────────────────────────────────────────────
// state（module 層級、這個 router 獨用）
// ───────────────────────────────────────────────────────────
// 複製 initialUsers，不改外部陣列。
// 預填管理員：{ id: 1, email: 'leo@gym.com', password: <bcrypt hash of '1q2w3e4r'> }
const users = [...initialUsers];
let nextId = initialUsers.length + 1;

const router = express.Router();

// ───────────────────────────────────────────────────────────
// TODO 任務二：POST /register
// ───────────────────────────────────────────────────────────

// POST /register
// - 輸入：body = { email, password }
// - 輸出：201 + { status: 'success', message: '註冊成功' }，或 400 + { status: 'false', message: '...' }
// - 提示：
//   1. email、password 缺少任何一個欄位，或 email 已存在（使用陣列方法檢查）→ return 400 跟對應輸出訊息
//   2. 密碼加密可使用 bcrypt 的 genSalt 與 hash 
//   3. 加密完成後，將新使用者（包含 id、email、加密後 password）存進 users，並 return 201 跟對應輸出訊息
// - 注意：handler 是 async function


    async function hashPassword(password) {
  // cost factor 設為 10，平衡了加密安全性與伺服器效能
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// ───────────────────────────────────────────────────────────
// 註冊 API (POST /register)
// ───────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 驗證必填欄位 (防呆機制)
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'false', 
        message: '缺少 email 或 password' 
      });
    }

    // 2. 驗證信箱唯一性 (避免重複註冊)
    const emailExists = users.some(user => user.email === email);
    if (emailExists) {
      return res.status(400).json({ 
        status: 'false', 
        message: '此 email 已被註冊' 
      });
    }

    // 3. 密碼加密：呼叫剛剛抽出來的自訂函式
    // (這讓主要流程變得很乾淨，不會被底層的 salt/hash 細節干擾)
    const hashedPassword = await hashPassword(password);

    // 4. 建立使用者資料並存入
    const newUser = {
      id: nextId, // 賦予當前的 ID
      email: email,
      password: hashedPassword,
    };
    
    users.push(newUser);
    nextId++; // 存入後 ID 遞增，準備給下一個人用

    // 5. 成功回覆
    return res.status(201).json({ 
      status: 'success', 
      message: '註冊成功' 
    });

  } catch (error) {
    
    // 如果 hashPassword 出錯，或記憶體不足等未預期狀況
    // 程式會直接跳來這，不會讓整台伺服器死機
    
    // 實務上這裡通常會把 error 記錄到 Log 系統裡，方便後續除錯
    // console.error('[Register Error]', error);

    return res.status(500).json({ 
      status: 'false', 
      message: '伺服器發生異常，請稍後再試' 
    });
  }
});



// ───────────────────────────────────────────────────────────
// TODO 任務三：POST /login
// ───────────────────────────────────────────────────────────

// POST /login
// - 輸入：body = { email, password }
// - 輸出：200 + { status: 'success', token }，或 401 + { status: 'false', message: '帳號或密碼錯誤' }
// - 提示：
//   1. 從 users 找出 email 符合的使用者，如果找不到 → return 401 跟對應輸出訊息
//   2. 用 bcrypt.compare 比對密碼，如果不符合 → return 401 跟對應輸出訊息（兩種失敗回覆同樣訊息，避免帳號探測）
//   3. 用 jwt.sign 簽出 token，payload 帶入使用者的 id 和 email，secret 使用 process.env.JWT_SECRET，有效期設為 30 天
//   4. token 簽出後，回應 200 跟對應輸出訊息
// - 注意：handler 是 async function

router.post("/login", async (req, res) => {
  // 加上 try/catch ，確保任何底層套件出錯都不會讓伺服器死機
  try {
    const { email, password } = req.body;

    // 【提早防呆 (Fail-Fast)】
    // 永遠不要相信前端傳來的資料！少一個欄位就直接退件，保護後面的程式不報錯
    if (!email || !password) {
      return res.status(400).json({ 
        status: "false", 
        message: "請提供 email 與 password" 
      });
    }

    // 【改用 find 提升可讀性 (Clean Code)】
    // 直接把「使用者物件」抓出來，不用再一直寫 users[index]
    const user = users.find((item) => item.email === email);

    // 防範帳號探測：找不到使用者統一回傳 401
    if (!user) {
      return res.status(401).json({ 
        status: "false", 
        message: "帳號或密碼錯誤" 
      });
    }

    // 驗證密碼：直接用 user.password，語意清晰
    const isValidPassword = await bcrypt.compare(password, user.password);

    // 防範帳號探測：密碼錯誤一樣回傳 401
    if (!isValidPassword) {
      return res.status(401).json({ 
        status: "false", 
        message: "帳號或密碼錯誤" 
      });
    }

    // 簽發 Token：payload 塞入不敏感的 id 與 email
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // 登入成功，核發 Token！
    return res.status(200).json({ 
      status: "success", 
      token 
    });

  } catch (error) {
    // 捕捉非預期錯誤 (例如 JWT_SECRET 沒設定好，或是 bcrypt 運算異常)
    // console.error('[Login Error]', error);
    
    return res.status(500).json({ 
      status: "false", 
      message: "伺服器發生異常，請稍後再試" 
    });
  }
});

// ───────────────────────────────────────────────────────────
// TODO 任務四：GET /me（受保護）
// ───────────────────────────────────────────────────────────

// GET /me
// - 保護：路由第二個參數掛上 verifyToken 守門員（驗過後會將使用者資料掛到 req.user）
// - 輸出：200 + { status: 'success', user: ... }

// 在路徑跟 handler 中間，插入 verifyToken 當作中介軟體 (Middleware)
router.get('/me', verifyToken, (req, res) => {
  // 能成功走到這一步，代表 verifyToken 已經驗證 Token 有效
  // 並且把 jwt 裡面的 payload (也就是 { id, email }) 掛載到 req.user 了
  
  return res.status(200).json({
    status: 'success',
    user: req.user
  });
});

module.exports = router;
