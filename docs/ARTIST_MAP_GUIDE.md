# Hướng Dẫn Vẽ Map & Asset Photoshop cho Dom Pixel Art

Tài liệu siêu gọn để **Dom chỉ cần tập trung vẽ trong Photoshop**, thả file lên Google Drive `Dom web/02_Minigame_Seasonal/`, phần còn lại AI sẽ tự động chuyển đổi, lắp vào game và đẩy lên GitHub.

---

## 1. Cấu trúc thư mục thả file trên Google Drive (`02_Minigame_Seasonal/`)

```text
02_Minigame_Seasonal/
├── maps/
│   └── dom-house/
│       ├── ground.png         (Bắt buộc: nền bản đồ tĩnh - đất, sàn, tường, đồ tĩnh)
│       ├── foreground.png     (Tùy chọn: mái nhà, tán cây cao che lên đầu nhân vật)
│       ├── nightOverlay.png   (Tùy chọn: lớp ánh sáng ban đêm tự vẽ nếu thích)
│       ├── guide.png          (Bắt buộc khi đổi bố cục: layer 5 màu đánh dấu)
│       └── notes.txt          (Ghi chú ngắn tên các chấm tím: tranh, NPC, giường, cây...)
├── characters/
│   ├── player_idle_down.gif   (hoặc .webp)
│   ├── player_walk_right.gif  (vẽ hướng phải, game tự lật sang trái!)
│   ├── player_run_right.gif
│   ├── dom_sleep.gif
│   ├── dom_work_up.gif
│   ├── dom_gaming_up.gif
│   └── ink_cat_walk_right.gif
├── props/
│   ├── tree_sway.gif          (Cây đung đưa — vẽ 1 lần, đặt được nhiều chỗ!)
│   └── lantern_sway.gif
└── audio/
    ├── bgm/                   (vd: default_night.mp3, default_day.mp3, tet_night.mp3)
    ├── ambient/               (vd: day.ogg, night.ogg)
    └── sfx/                   (vd: meow.ogg, step_grass.ogg, step_wood.ogg)
```

---

## 2. Kích thước chuẩn & Lưu ý xuất Photoshop

- **Lưới bản đồ (Grid):** `16×16 px` mỗi ô. Ví dụ nhà 4 khu vực hiện tại là **`30×24` ô = `480×384 px`**.
- **Nhân vật:** Khung **`16×24 px`** (giữ cùng kích thước khung cho tất cả động tác của cùng 1 nhân vật, **đôi chân luôn sát mép dưới giữa** để không bị nhảy khung khi chuyển từ đứng sang chạy).
- **Cây cối / đồ vật động:** Kích thước tự do (`32×48 px`, `32×32 px`...), chỉ cần để trống vị trí gốc cây trên `ground.png`.
- **Chỉ cần vẽ 3 hướng:** `down` (nhìn xuống), `up` (nhìn lên), `right` (nhìn ngang phải) — game sẽ **tự lật gương sang `left`**.
- **Khi xuất `.gif` hoặc `.webp` (Lossless) từ Photoshop:**
  1. Giữ nguyên tỉ lệ **1× gốc** (không phóng to). Nếu có resize, chọn **Nearest Neighbor (Preserve Hard Edges)**.
  2. Tắt nền trắng/xám (nền trong suốt). Nếu xuất GIF, nhớ bật `Transparency` và đặt **`Matte: None`** để tránh viền trắng răng cưa.

---

## 3. Bảng 5 Màu trên Layer `guide.png`

Trong Photoshop, tạo 1 layer mới cùng kích thước bản đồ, dùng công cụ **Pencil (size 16px, không chống răng cưa)** tô đúng vào các ô `16×16`:

| Màu | Mã Hex | Ý nghĩa trong game |
| --- | --- | --- |
| **Đỏ** | `#FF0000` | Tường & vật cản không đi xuyên được |
| **Xanh dương** | `#0066FF` | Vùng **bên trong nhà** (giữ ấm sáng ban đêm, giảm tiếng gió ngoài sân, kích hoạt **Mèo Ink chạy ra đón**) |
| **Vàng** | `#FFFF00` | Điểm **phát sáng ban đêm** (đèn đường, cửa sổ, đèn lồng, đèn rọi tranh, đèn bàn) |
| **Xanh lá** | `#00FF00` | Vị trí **xuất phát** của khách khi mới vào game |
| **Tím** | `#FF00FF` | Vị trí đặt **khung tranh, cây đung đưa, NPC, giường ngủ Dom, bàn vẽ, góc chơi game, ổ mèo** |

Sau đó viết 1 file `notes.txt` cực ngắn mô tả các chấm tím (vd: *"4 chấm tím ngoài sân là cây đung đưa, chấm tím góc trên phải là giường Dom (ngủ 3h-9h), 2 chấm tím phòng bếp là tủ lạnh và ổ mèo Ink"*).

Khi đã thả xong file lên Drive, bạn chỉ cần nhắn AI: **`/dom-minigame-seasonal cập nhật map mới từ Drive`** — AI sẽ tự chạy `scripts/import-game-assets.py`, lắp vào game, kiểm tra đường đi A* không bị kẹt và đẩy lên GitHub!
