# Apple Pay 域名验证

Apple Pay 需要验证你的域名所有权。请按以下步骤操作：

1. 登录 PayPal Developer Dashboard: https://developer.paypal.com/
2. 进入 Apps & Credentials → 选择你的 App
3. 在 Features 部分找到 Apple Pay，点击 Manage
4. 点击 Add Domain，输入你的域名（如 tu-dominio.com）
5. 点击 Download 下载域名验证文件
6. 将下载的文件重命名为 `apple-developer-merchantid-domain-association`（去掉扩展名）
7. 将文件放到此目录（public/.well-known/）
8. 回到 PayPal 点击 Register Domain

验证文件必须通过以下 URL 可访问：
`https://你的域名/.well-known/apple-developer-merchantid-domain-association`

注意：
- 文件不能有重定向（3XX 状态码）
- 必须通过 HTTPS 访问
- Content-Type 应为 application/octet-stream
