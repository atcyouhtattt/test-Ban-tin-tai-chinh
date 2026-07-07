# ⟡ Hieuinvest Research

Hệ thống phân tích cổ phiếu Việt Nam tự động — nhập mã, ra báo cáo.

**100% miễn phí** — Gemini AI (free tier) + Google Search + GitHub Pages/Vercel.

![preview](https://img.shields.io/badge/status-live-brightgreen) ![cost](https://img.shields.io/badge/cost-$0-gold)

---

## Cách dùng

1. Mở web → nhập mã cổ phiếu (VCB, KDH, FPT...)
2. Hệ thống tự động tìm kiếm dữ liệu qua Google Search
3. AI phân tích và tạo báo cáo 8 phần
4. Tải PDF hoặc in trực tiếp

## Tính năng

- 🔍 **Tự động 100%** — chỉ cần nhập mã, không cần làm gì thêm
- 📊 **Biểu đồ tương tác** — Chart.js (doanh thu, lợi nhuận, biên LN)
- 📄 **Xuất PDF** — tải file PDF hoặc in
- 🎨 **Thiết kế luxury** — Obsidian & Gold theme
- 💰 **Miễn phí** — Gemini free tier, hosting miễn phí

## Cài đặt (3 phút)

### Bước 1: Lấy Gemini API Key (miễn phí)

1. Vào [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Đăng nhập Google → tạo API key
3. Copy key (bắt đầu bằng `AIza...`)

> Không cần thẻ tín dụng. Free tier: 15 request/phút, 1500 request/ngày.

### Bước 2: Deploy

#### Cách A — Vercel (khuyên dùng)

1. Fork repo này
2. Vào [vercel.com](https://vercel.com) → Import Git Repository
3. Chọn repo → Deploy
4. Xong! Truy cập URL Vercel cung cấp

#### Cách B — GitHub Pages

1. Fork repo này
2. Settings → Pages → Source: `main` branch → `/ (root)`
3. Save → đợi 1-2 phút
4. Truy cập `https://<username>.github.io/hieuinvest`

#### Cách C — Cloudflare Pages

1. Fork repo này
2. Vào [pages.cloudflare.com](https://pages.cloudflare.com) → Create project
3. Connect GitHub → chọn repo → Deploy
4. Xong!

### Bước 3: Sử dụng

1. Mở web đã deploy
2. Nhập mã cổ phiếu → Phân tích

## Cấu trúc báo cáo

| # | Phần | Nội dung |
|---|------|----------|
| I | Tổng quan | KPI, giá, vốn hóa, P/E, P/B, ROE |
| II | Hồ sơ DN | Mô tả, mô hình KD, cổ đông |
| III | KQKD | Bảng tài chính, biểu đồ doanh thu & LN |
| IV | Biên LN | Biểu đồ biên gộp & biên ròng |
| V | Ngành | Bối cảnh ngành & vị thế cạnh tranh |
| VI | Triển vọng | Dự phóng, biểu đồ forecast |
| VII | Định giá | Phương pháp, giá mục tiêu |
| VIII | Rủi ro | Rủi ro & xúc tác tăng giá |

## Tech stack

- **AI:** Google Gemini 2.0 Flash (free tier)
- **Search:** Google Search Grounding (tích hợp trong Gemini)
- **Charts:** Chart.js 4.4
- **PDF:** html2pdf.js
- **Fonts:** Playfair Display + Inter + JetBrains Mono
- **Hosting:** Static HTML — deploy bất kỳ đâu

## Giấy phép

MIT — tự do sử dụng, chỉnh sửa, phân phối.

---

**⟡ Hieuinvest Research** — *Phân tích cho giới tinh hoa*
