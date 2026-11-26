# Multi-Agent Workflow — Dom Pixel Art Portfolio (7 Agents)

Hệ thống được tổ chức thành **7 Agent Skills chuyên trách** (giữ 4 vai gốc được tinh gọn ranh giới + bổ sung 3 vai chuyên sâu: `dom-level-designer`, `dom-network`, `dom-qa`) để tránh chồng chéo nhiệm vụ và đảm bảo chất lượng duyệt độc lập.

---

## 1. Google Drive Drop-Zone (`Dom web/`)
- **Root Folder**: `1ch7gOrz22MHRu0NfZ_iCdCMVbVyipX27`
- **`01_Artworks_Monthly`** (`1VkdDkusXHb-2dFsJ8J_i11tqL4Xc8mWB`): Tranh PNG/GIF mới + ghi chú câu chuyện mỗi tháng (`dom-art-curator`).
- **`02_Minigame_Seasonal`** (`1QyKd2FQsYP3FAp3owmWS21LToor8bjZG`): Asset theo mùa, bản đồ Photoshop (`ground.png`, `foreground.png`, `guide.png`), spritesheet/GIF/WebP nhân vật & props động, nhạc `.mp3`/`.ogg` theo chuẩn [ARTIST_MAP_GUIDE.md](../docs/ARTIST_MAP_GUIDE.md) (`dom-minigame-seasonal` & `dom-level-designer`).
- **`03_Merch_And_Info`** (`1q_zwwQ85gZR0nLDV2amZ-VcZB7F2B5H0`): Postcard/Merch mới, Bio, Contact, Linktree/YouTube (`dom-art-curator`).

---

## 2. Danh sách 7 Agent Roles (Custom Skills)

| Agent Skill | Trách nhiệm chính | Phạm vi file phụ trách | Ghi chú / Thứ tự ưu tiên |
| :--- | :--- | :--- | :--- |
| **`dom-director`** | Điều phối chung, phân việc không xung đột file, chốt kiến trúc & **duyệt cuối (final release)** sau khi `dom-qa` ký PASS | Điều phối toàn repo | Giữ nguyên (đã tách test chi tiết sang `dom-qa`) |
| **`dom-art-curator`** | Cập nhật tranh mới hàng tháng, dịch song ngữ VI/EN, Merch Postcard & Bio | `public/assets/artworks/*`, `src/data/artworks.json`, `src/data/merch.json`, `src/data/site.json` | Giữ nguyên |
| **`dom-level-designer`** *(Mới)* | Thiết kế **bố cục bản đồ**, luồng tham quan triển lãm, phân khu phòng, vị trí khung tranh/vật dụng/NPC waypoints & cổng mở rộng thị trấn | `src/data/maps/*.json`, `docs/ARTIST_MAP_GUIDE.md`, waypoints trong `NpcController.ts` & reachability tests | **Ưu tiên số 1** khi thiết kế/cải tiến không gian nhà & triển lãm |
| **`dom-minigame-seasonal`** | Nhập **asset theo mùa**, spritesheet/hoạt ảnh nhân vật & cây cối, hiệu ứng hạt/thời tiết, thoại NPC theo mùa & **nhạc/SFX** | `public/assets/game/*`, `public/assets/audio/*`, `scripts/import-game-assets.py`, `src/data/seasons/*`, `src/game/sprites/*`, `src/audio/SoundEngine.ts` | Thu hẹp phạm vi: bỏ phần thiết kế bố cục bản đồ |
| **`dom-web-designer`** | Tách rõ 2 mảng: **UI/UX web** (Start Screen, Quick Gallery, Flipbook Lightbox, Customizer, HUD, Modals) & **hạ tầng web** (Vite, SEO, GitHub Pages CI/CD) | `src/components/*`, `src/styles/*`, `src/App.tsx`, `index.html`, `vite.config.ts`, `.github/workflows/deploy.yml`, `docs/ARTIST_UI_GUIDE.md` | Không ôm âm thanh game hay test QA cuối |
| **`dom-network`** *(Mới)* | **Multiplayer Co-Presence**, đồng bộ ngoại hình `16×32`, pixel emote + Quick Chat song ngữ, chia phòng 15–20 người & tự dự phòng solo | `src/network/*`, `PresenceHud`, `EmoteBar`, realtime backend config (xem [ROADMAP.md](./ROADMAP.md)) | **Phase 3** |
| **`dom-qa`** *(Mới)* | **Kiểm thử độc lập**: test điện thoại & máy yếu, tốc độ tải/dung lượng bundle & ảnh, lỗi hiển thị/overflow/va chạm/runtime | Chạy `npm run check`, Playwright Desktop (`1440×900`) + Mobile (`390×844` + CPU throttle), xuất báo cáo PASS/FAIL độc lập | Tách khỏi `dom-director`; chạy tổng lực trước Go-Live Phase 4 (và khi cần) |

---

## 3. Khuyến nghị mở Conversation riêng theo từng chủ đề trong Project

Để cuộc trò chuyện gọn gàng, không bị loãng ngữ cảnh giữa các mảng việc, bạn nên mở **mỗi Conversation mới cho 1 nhóm việc lớn** và gọi đúng tên skill ở câu mở đầu:

1. **Conversation Thiết kế Map & Luồng tham quan**:
   > `Dùng dom-level-designer để thiết kế lại bố cục bản đồ, luồng tham quan và vị trí các khu trưng bày...`
2. **Conversation Update Tranh hàng tháng**:
   > `Dùng dom-art-curator cập nhật tranh mới trong Drive 01_Artworks_Monthly lên web...`
3. **Conversation Asset theo mùa / Hoạt ảnh / Nhạc**:
   > `Dùng dom-minigame-seasonal nhập sprite/nhạc mùa mới từ Drive 02_Minigame_Seasonal...`
4. **Conversation UI/UX & Hạ tầng Web**:
   > `Dùng dom-web-designer tối ưu giao diện Gallery / Flipbook / Mobile HUD...`
5. **Conversation Kiểm thử độc lập (trước khi ra mắt đợt lớn)**:
   > `Dùng dom-qa kiểm thử toàn bộ trang trên điện thoại, máy yếu, tốc độ tải và báo cáo lỗi...`
6. **Conversation Multiplayer (Phase 3)**:
   > `Dùng dom-network thiết kế và triển khai Cozy Multiplayer (Presence + Emotes + Quick Chat song ngữ) theo agents/ROADMAP.md...`
