# Master Roadmap — Dom Pixel Art Portfolio

> **Nguyên tắc vận hành (Flexible Execution):** Các hạng mục không xung đột file giữa các Phase có thể triển khai **song song linh hoạt** (ví dụ: `dom-art-curator` có thể tải trước tranh gốc của Phase 4 trong lúc Phase 2/3 đang chạy). Mọi commit vẫn phải vượt qua `npm run check`, và **`dom-qa` chạy đợt kiểm thử tổng lực độc lập (mobile + máy yếu + tốc độ tải)** trước khi Go-Live cuối Phase 4.

---

## Phase 1 — Nền tảng MVP & Hạ tầng *(Hoàn thành ✅)*
- [x] Khởi tạo repo `dompham96/dom-pixelart-portfolio` + GitHub Pages CI/CD tự động.
- [x] Di chuyển toàn bộ nội dung chữ, 8 bộ sưu tập, 3 tập YouTube *Sai Gon Tales*, 5 mẫu Postcard A5, Bio & Linktree.
- [x] Thiết lập Google Drive drop-zone (`01_Artworks_Monthly`, `02_Minigame_Seasonal`, `03_Merch_And_Info`) & hệ thống **7 Agent Skills** ([`agents/WORKFLOW.md`](./WORKFLOW.md)).

---

## Phase 2 — Cơ Chế Cốt Lõi & Trải Nghiệm Đơn *(Đang triển khai 🚧)*

Mục tiêu: Hoàn thiện toàn bộ cơ chế chơi, bố cục không gian, luồng UX-UI (bằng code/pixel CSS) và chiều sâu tương tác đơn người trước khi nối mạng Multiplayer.

### 2.1. Di chuyển & Custom Nhân Vật `16×32` *(Hoàn thành ✅)*
- **Agent phụ trách:** `dom-minigame-seasonal` + `dom-web-designer`
- [x] Tích hợp đủ 5 spritesheet `16×32` (`Idle`, `Walk`, `Run`, `Interact`, `Jump`) với 8 hướng trên nền sàn `16×16` px cho người chơi & toàn bộ NPC người.
- [x] Tạo ngoại hình ngẫu nhiên khi khách ghé thăm + modal tùy chỉnh Tóc / Trang phục / Phụ kiện / Tông da (lưu `localStorage`).

### 2.2. Bản Đồ & Luồng Tham Quan *(Đang thực hiện 🔄)*
- **Agent phụ trách:** `dom-level-designer` (phối hợp `dom-minigame-seasonal` về sprite cây/cảnh)
- [ ] Chốt bố cục tổng thể nhà + sân vườn, kích thước hành lang, tầm nhìn (sightlines) và nhịp đi dạo của khách thăm quan trên lưới `16×16`.
- [ ] Chốt vị trí khu trưng bày 8+ bộ tranh, quầy Merch, góc Studio, khu vực sinh hoạt và cổng mở rộng tương lai (`town_gate`).
- [ ] Đảm bảo mọi vật thể tương tác & NPC đều tới được mượt mà bằng cả bàn phím lẫn Tap-to-walk trên mobile (`Pathfinder` tests xanh).

### 2.3. Chốt UX–UI (Code / Wireframe Pixel Chuẩn) *(Kế tiếp 📋)*
- **Agent phụ trách:** `dom-web-designer`
- [ ] Chốt toàn bộ luồng trải nghiệm & bố cục Desktop + Mobile (`390×844`) bằng giao diện pixel-CSS/code hiện tại:
  - Màn hình chờ tối giản (`TitleScreen`) + lối tắt đổi trang phục.
  - Thanh HUD gọn 1 dòng trên mobile, chuyển mượt giữa Minigame / Quick Gallery / Merch / About / Contact / Âm thanh / Ngày-Đêm.
  - Chế độ **Quick Gallery kiểu Mini-Map** + **Flipbook Artbook lật trang** (2 trang trên Desktop, 1 trang đơn trên Mobile, zoom `1x/2x/3x` sắc nét).
  - Hộp thoại RPG (`DialogBox`) & Virtual D-Pad tùy chọn không che tầm nhìn.
- *Lưu ý:* Phần thay hình vẽ tay (khung 9-slice, nền sách, huy hiệu vẽ tay từ `04_UI_UX_Design`) sẽ gom sang **Phase 4 (Final Look)** để tránh phải vẽ lại khi UX còn tinh chỉnh.

### 2.4. NPC & Hệ Thống Tương Tác Sống Động *(Kế tiếp 📋)*
- **Agent phụ trách:** `dom-minigame-seasonal` + `dom-level-designer`
- [ ] Tinh chỉnh lịch trình & hội thoại tự nhiên theo giờ/mùa cho **Dom** và **Rắn Ăn Tásk**.
- [ ] Nâng cấp tương tác với **Mèo Ink**: đi dạo, chào ngắn, cho khách **vuốt ve / chơi cùng hiện tim ❤️**.
- [ ] Mở rộng tương tác kể chuyện với đồ vật cá nhân trong nhà (bảng Hậu trường, kệ sở thích, góc chơi game, máy phát nhạc đổi bài nền).
- [ ] Thêm **Mini-hoạt động "Tìm các chấm nhỏ (Tiny Dots)"** giấu quanh nhà (lưu cục bộ `localStorage`, không cần server) — tìm đủ sẽ mở khóa **1 phụ kiện nhân vật đặc biệt hoặc góc bí mật** đúng tinh thần *"Tiny dot... touch the story"*.

---

## Phase 3 — Nhiều Người Chơi (Cozy Multiplayer) & Hạ Tầng Kỹ Thuật *(Kế hoạch 📋)*

- **Agent phụ trách:** `dom-network` (hỗ trợ UI bởi `dom-web-designer`)
- **Mục tiêu:** Biến căn nhà thành phòng triển lãm có hơi thở cộng đồng nhưng vẫn văn minh, an toàn tuyệt đối cho portfolio cá nhân.

### 3.1. Cozy Presence & Đồng Bộ Ngoại Hình
- [ ] Đồng bộ thời gian thực vị trí `(x, y)`, hướng `Facing8`, trạng thái hoạt ảnh (`idle | walk | run | interact | jump`) và JSON `CharacterAppearance` của từng khách qua WebSocket (**Supabase Realtime** hoặc **PartyKit / Cloudflare Durable Objects** gói miễn phí 0đ).
- [ ] Nội suy chuyển động mượt (interpolation với tick gửi ~100ms) để giữ 60fps ổn định cả trên điện thoại.
- [ ] Hiển thị trạng thái nhỏ khi người khác đang đứng xem một khung tranh.

### 3.2. Tương Tác Giữa Khách (An Toàn 100% — Không Lo Spam)
- [ ] **Pixel Emotes** nổi trên đầu nhân vật: 👋 Vẫy tay, ❤️ Thả tim, ✨ Lấp lánh, ☕ Cà phê.
- [ ] **Quick Chat câu có sẵn (Preset Phrases)** tự động dịch song ngữ VI ↔ EN theo ngôn ngữ người đọc (ví dụ: *"Chào bạn!"* ↔ *"Hi there!"*, *"Tranh này đẹp quá!"* ↔ *"Love this piece!"*, *"Mèo Ink cưng quá!"* ↔ *"Ink is so cute!"*).
- [ ] Không mở chat tự do (tránh rủi ro nội dung xấu/spam trên portfolio gửi khách hàng & nhà tuyển dụng).

### 3.3. Chia Phòng, Giới Hạn Khách & Dự Phòng Quá Tải
- [ ] **Auto-Room Sharding**: Giới hạn **15–20 khách / phòng** để không che khuất tranh; khách vượt ngưỡng tự động sang Phòng #2, #3... kèm nút **copy link mời bạn bè vào chung phòng**.
- [ ] **Mức chịu tải mục tiêu**: ~100–200 khách online cùng lúc ở gói miễn phí 0đ (dễ nâng gói \$5–\$25/tháng lên 500–2.000+ khách khi có đợt viral).
- [ ] **Graceful Fallback (Bắt buộc)**: Khi mất kết nối hoặc chạm trần gói miễn phí, tự động ẩn lớp multiplayer và chạy mượt ở chế độ tham quan một mình — trang web không bao giờ sập hay báo lỗi.

---

## Phase 4 — Upload Tranh, Final Look & Đóng Gói Vận Hành *(Trước khi Go-Live 🚀)*

- **Agent phụ trách:** `dom-art-curator` + `dom-web-designer` + `dom-minigame-seasonal` + `dom-qa` + `dom-director`

### 4.1. Upload Tranh Gốc & Merch Thật (`dom-art-curator`)
- [ ] Tải toàn bộ tranh gốc `.png` / `.gif` sắc nét từ Drive `01_Artworks_Monthly` thay thế các khung mẫu MVP (giữ nguyên độ sắc nét pixel, không nén mờ JPEG).
- [ ] Cập nhật ảnh thật & thông tin đặt mua cho 5+ mẫu Postcard A5 từ `03_Merch_And_Info`.
- [ ] Cập nhật trạng thái *Astrovert*, *Ink the Game* (hoặc các bộ mới) khi có tranh.

### 4.2. Final Look — Áo Đồ Họa Vẽ Tay (`dom-web-designer` + `dom-minigame-seasonal`)
- [ ] Thay toàn bộ giao diện UI/UX vẽ tay của Dom (khung 9-slice, nút bấm, huy hiệu Mini-Map, cuốn sách Flipbook, nền Landing) theo chuẩn [`docs/ARTIST_UI_GUIDE.md`](../docs/ARTIST_UI_GUIDE.md).
- [ ] Hoàn thiện đồ họa bản đồ cuối cùng (Ngày / Hoàng hôn / Đêm), ánh sáng đèn, sprite nhân vật/props & nhạc nền/SFX thật.

### 4.3. Đóng Gói Ra Mắt, Kiểm Thử Tổng Lực & Vận Hành (`dom-web-designer` + `dom-qa` + `dom-director`)
- [ ] **SEO & Social Share**: Tạo Favicon pixel art + ảnh bìa **Open Graph (`og:image`)** đẹp để khi dán link lên Facebook / Instagram / Threads / Linktree hiển thị chuyên nghiệp.
- [ ] **Analytics ẩn nhẹ**: Gắn bộ đếm lượt thăm miễn phí, không cookie banner (như Cloudflare Web Analytics hoặc GoatCounter) để theo dõi lượng khách & bộ tranh được yêu thích nhất.
- [ ] **Kiểm thử tổng lực độc lập (`dom-qa` — Mandatory Go-Live Gate)**:
  - Test trên điện thoại dọc (`390×844`) & thiết bị/CPU yếu (giới hạn FPS, dung lượng bundle & tổng nặng ảnh/nhạc).
  - Xác nhận 0 console error, 0 broken asset, 0 overflow, tương tác & multiplayer fallback hoạt động trơn tru.
- [ ] **Xuất bản & Vận hành**: Duyệt phát hành qua `dom-director`, thay link lên Linktree/MXH (chạy trên GitHub Pages miễn phí, sẵn sàng gắn tên miền riêng bất kỳ lúc nào), và chuyển sang nhịp bảo trì định kỳ hàng tháng (`dom-art-curator`) + theo mùa (`dom-minigame-seasonal`).

---

## Sau Phase 4 — Ý Tưởng Mở Rộng (Backlog)
- Mở khóa cổng **`portal-town`** sang Khu Phố Sài Gòn (bản đồ thị trấn nhiều màn chơi).
- Sự kiện theo mùa đặc biệt (Đường hoa Tết, Phố lồng đèn Trung Thu, Giáng Sinh).
- Sổ lưu bút công khai (Guestbook có kiểm duyệt) nếu cần thêm kênh lưu kỷ niệm của khách.
