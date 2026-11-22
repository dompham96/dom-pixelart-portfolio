# Multi-Agent Workflow — Dom Pixel Art Portfolio

Hệ thống được chia thành **4 Agent Skills chuyên trách** để Dom bảo trì trang web bền vững hàng tháng và theo mùa:

## 1. Google Drive Drop-Zone (`Dom web/`)
- **Root Folder**: `1ch7gOrz22MHRu0NfZ_iCdCMVbVyipX27`
- **`01_Artworks_Monthly`** (`1VkdDkusXHb-2dFsJ8J_i11tqL4Xc8mWB`): Thả tranh PNG/GIF mới + file ghi chú mỗi tháng.
- **`02_Minigame_Seasonal`** (`1QyKd2FQsYP3FAp3owmWS21LToor8bjZG`): Thả bản đồ Photoshop (`ground.png`, `foreground.png`, `guide.png`, `notes.txt`), hoạt ảnh `.gif`/`.webp` (`16×24` nhân vật, props động) và nhạc `.mp3`/`.ogg` theo chuẩn [ARTIST_MAP_GUIDE.md](../docs/ARTIST_MAP_GUIDE.md).
- **`03_Merch_And_Info`** (`1q_zwwQ85gZR0nLDV2amZ-VcZB7F2B5H0`): Thả ảnh mẫu Postcard, cập nhật Bio/Contact/YouTube.

## 2. 4 Agent Roles (Custom Skills)
1. **`dom-director`** *(Điều phối & QA)*: Kiểm tra Drive + Repo, chia việc cho 3 agent bên dưới, chạy `npm run check`, kiểm tra Desktop/Mobile và xác nhận push deploy.
2. **`dom-art-curator`** *(Update tranh hàng tháng)*: Tải tranh từ `01_Artworks_Monthly`, lưu vào `public/assets/artworks/<slug>/`, cập nhật `src/data/artworks.json` (VI + EN), `src/data/merch.json`, và gắn khung tranh mới vào `src/data/maps/dom-house.json`.
3. **`dom-minigame-seasonal`** *(Update minigame & map theo mùa)*: Tải map PNG / `guide.png` / `.gif` / `.webp` / audio từ `02_Minigame_Seasonal`, chạy `python3 scripts/import-game-assets.py` chuyển thành PNG Sprite Sheet & tọa độ map, cập nhật `src/data/maps/*.json` & `src/data/seasons/*.json`, AI lịch trình NPC (Dom & Mèo Ink), rồi chạy `npm run check`.
4. **`dom-web-designer`** *(Quản trị & Design web)*: Nâng cấp UI/UX (`src/components/*`, `src/styles/*`), âm thanh (`src/audio/*`), SEO, responsive mobile và CI/CD (`.github/workflows/deploy.yml`).
