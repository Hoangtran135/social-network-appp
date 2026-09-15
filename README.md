# Social Network App

Website mạng xã hội full-stack: đăng bài, kết bạn, nhắn tin realtime, gọi video/thoại, story, nhóm, thông báo và trang quản trị.

Repo: https://github.com/Hoangtran135/social-network-appp.git

## Công nghệ sử dụng

- **Frontend:** React 19, TypeScript, React Router 7, Tailwind CSS 4, Socket.IO Client
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO
- **Xác thực & bảo mật:** JWT, bcryptjs, Zod, express-rate-limit, express-mongo-sanitize
- **Khác:** Multer (upload media), Nodemailer (email), Swagger (tài liệu API)

## Yêu cầu môi trường

- Node.js 20+
- MongoDB (local hoặc remote)

## Chạy dự án ở local

1. Clone repo:
   ```bash
   git clone https://github.com/Hoangtran135/social-network-appp.git
   cd social-network-appp
   ```

2. Cài dependencies:
   ```bash
   npm install
   ```

3. Tạo file `.env` ở thư mục gốc:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/social-network-app
   JWT_ACCESS_SECRET=doi-thanh-chuoi-ngau-nhien-cua-ban
   JWT_REFRESH_SECRET=doi-thanh-chuoi-ngau-nhien-khac
   CORS_ORIGIN=http://localhost:3000
   ```

4. Đảm bảo MongoDB đang chạy ở local (hoặc trỏ `MONGODB_URI` tới cụm MongoDB khác).

5. Chạy dev server:
   ```bash
   npm run dev
   ```
   Mặc định chạy tại `http://localhost:3000`.

## Các lệnh chính

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy server dev (Vite HMR + Express + Socket.IO) |
| `npm run build` | Build frontend (Vite) + bundle backend (esbuild) ra `dist/` |
| `npm run start` | Chạy bản production đã build (`dist/server.cjs`) |
| `npm run lint` | Kiểm tra code bằng ESLint |
| `npm run make-admin -- <email>` | Cấp quyền admin cho tài khoản theo email |

## Quản lý dữ liệu demo (thư mục `db/`)

| Script | Mô tả |
|---|---|
| `npx tsx db/seed-demo.ts` | **Xoá sạch** dữ liệu hiện có và tạo lại bộ data demo mẫu (users, bài viết, nhóm, story, tin nhắn...) |
| `npx tsx db/export-json.ts` | Export toàn bộ dữ liệu MongoDB hiện tại ra JSON (thư mục `db/export/`) |
| `npx tsx db/import-json.ts` | Import dữ liệu từ `db/export/` vào MongoDB (mặc định xoá dữ liệu cũ trước; đặt `DROP_EXISTING=false` để chỉ chèn thêm) |
| `npx tsx db/make-admin.ts <email>` | Cấp quyền admin cho user theo email |

Tài khoản demo có sẵn trong `db/export/` (mật khẩu chung: `123456`):
- Admin: `minhanh@demo.vn`
- User thường: `quocbao@demo.vn`, `camle@demo.vn`, `ducduy@demo.vn`, `thuha@demo.vn`, `anhkhoa@demo.vn`, `ngoclinh@demo.vn`, `giaphuc@demo.vn`

## Triển khai lên VPS (Ubuntu)

Dự án có sẵn script tự động hoá phần lớn quá trình triển khai:

1. SSH vào VPS và clone code:
   ```bash
   git clone https://github.com/Hoangtran135/social-network-appp.git /var/www/social-network-app
   cd /var/www/social-network-app
   ```

2. Cài môi trường hệ thống (Node.js, PM2, Nginx, firewall, SSL) — chạy 1 lần:
   ```bash
   sudo bash deploy/setup-vps.sh your-domain.com
   ```

3. Cài MongoDB trên VPS (xem hướng dẫn chính thức tại mongodb.com, hoặc dùng MongoDB Atlas thay vì tự host).

4. Tạo file `.env` production (xem mẫu ở phần "Chạy dự án ở local", đổi `NODE_ENV=production` và `CORS_ORIGIN` đúng domain thật).

5. Build & chạy bằng PM2:
   ```bash
   bash deploy/deploy.sh
   ```

6. (Tuỳ chọn) Import data demo:
   ```bash
   npx tsx db/import-json.ts
   ```

7. Bật HTTPS:
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

Các lần deploy sau chỉ cần chạy lại `bash deploy/deploy.sh` — script tự `git pull`, build lại và reload PM2 không downtime.

## Tính năng chính

- Đăng bài viết (ảnh/video), thích, bình luận, lưu bài viết
- Kết bạn, gợi ý bạn bè
- Nhắn tin realtime, gọi video/thoại (Socket.IO)
- Story 24 giờ
- Nhóm cộng đồng
- Thông báo realtime, tìm kiếm
- Báo cáo vi phạm & kiểm duyệt nội dung
- Trang quản trị (quản lý người dùng, bài viết, nhóm, báo cáo, thông báo hệ thống)
- Tài liệu API tự sinh bằng Swagger (`/api/docs` khi chạy server)
