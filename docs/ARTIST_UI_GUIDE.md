# Hướng Dẫn Vẽ Hệ Thống UI/UX Pixel Art cho Dom Pixel Art

Tài liệu hướng dẫn **Dom tự vẽ thủ công toàn bộ giao diện (UI/UX)** bằng Photoshop/Aseprite rồi thả lên Google Drive `Dom web/04_UI_UX_Design/`. Sau khi thả file xong, chỉ cần nhắn **`/dom-web-designer cập nhật UI từ Drive`**, agent sẽ tự động nhập ảnh, ghép 9-slice, gắn tương tác và deploy lên web.

---

## 1. Cấu trúc thư mục thả file trên Google Drive (`Dom web/04_UI_UX_Design/`)

```text
04_UI_UX_Design/
├── mockups/                     (Bản vẽ phác thảo / ảnh ghép tổng thể để AI hiểu đúng bố cục & hành vi)
│   ├── landing_mockup.png
│   ├── gallery_minimap_desktop.png
│   ├── gallery_minimap_mobile.png
│   ├── artbook_open_desktop.png
│   ├── artbook_open_mobile.png
│   └── notes.txt                (Ghi chú tương tác: bấm vào đâu ra gì, hiệu ứng mong muốn)
├── landing/                     (Màn hình chờ Landing Page)
│   ├── bg.png (hoặc bg.gif)     (Artwork nền 16:9, vd 480×270 hoặc 640×360 px)
│   ├── logo.png                 (Tùy chọn: chữ DOM PIXEL ART vẽ tay nền trong suốt)
│   ├── btn_start_normal.png     (Tùy chọn: kèm _hover.png, _pressed.png)
│   └── btn_quick_normal.png     (Tùy chọn: kèm _hover.png, _pressed.png)
├── gallery_map/                 (Trang Dom Gallery kiểu Bản đồ Mini-Map)
│   ├── map_bg.png (hoặc .gif)   (Nền bản đồ SẠCH, KHÔNG vẽ dính huy hiệu vào nền!)
│   ├── map_guide.png            (Layer cùng kích thước map_bg, chấm 1 điểm #FF00FF vào tâm mỗi vị trí huy hiệu)
│   ├── badges/                  (Từng huy hiệu project nền trong suốt, gợi ý 32×32 hoặc 48×48 px)
│   │   ├── saigon-tales.png
│   │   ├── saigon-tales_hover.gif (Tùy chọn: trạng thái rê chuột / lấp lánh)
│   │   ├── badge_locked.png     (Huy hiệu cho các project "Sắp ra mắt")
│   │   └── ...
│   └── notes.txt                (Ghi chú chấm tím nào tương ứng với project nào)
├── artbook/                     (Giao diện Cuốn Sách lật trang khi bấm vào huy hiệu)
│   ├── book_spread.png          (Cuốn sách mở 2 trang cho Desktop, nền ngoài trong suốt, để trống vùng giấy)
│   ├── book_single_mobile.png   (Tùy chọn: 1 trang đơn cho màn hình điện thoại dọc)
│   ├── page_flip.gif            (Tùy chọn: animation lật trang 3–5 frame, nền trong suốt)
│   ├── btn_prev.png             (Nút lật trang trước)
│   ├── btn_next.png             (Nút lật trang sau)
│   ├── btn_close.png            (Nút đóng sách)
│   ├── btn_zoom.png             (Nút phóng to 1x/2x/3x)
│   └── bookmark_tab.png         (Tùy chọn: thẻ kẹp sách cho link YouTube / Postcard)
└── ui_kit/                      (Bộ khung & icon dùng chung cho HUD, DialogBox, Modal)
    ├── panel_9slice.png         (Khung vuông 24×24 hoặc 48×48 px để co giãn mọi hộp thoại không vỡ góc)
    ├── btn_9slice_normal.png    (Khung nút 9-slice, tùy chọn thêm _hover.png & _pressed.png)
    ├── hud_bar_9slice.png       (Thanh menu trên cùng)
    └── icons/                   (Icon 16×16 px nền trong suốt: game, map, merch, about, contact, sound...)
```

---

## 2. 7 Lưu Ý Quan Trọng Khi Vẽ UI/UX Pixel Art Cho Web

1. **Không gộp chữ (text) vào khung nút hoặc trang sách:**
   - Web hỗ trợ **song ngữ Việt – Anh** và tự co giãn trên nhiều màn hình. Chỉ vẽ **khung nền sạch** (chừa vùng trống cho chữ), để web render chữ sắc nét bằng font `Pixelify Sans` / `Be Vietnam Pro`.
   - Ngoại lệ duy nhất được vẽ chữ tay là **Logo `DOM PIXEL ART`** hoặc các nút **chỉ dùng icon** (mũi tên, kính lúp, nút `X`).

2. **Dùng nguyên tắc 9-Slice cho khung hộp thoại & nút co giãn:**
   - Với khung modal, khung dialog, khung nút có độ dài thay đổi theo chữ, chỉ cần vẽ **1 ô vuông nhỏ đối xứng** (ví dụ `24×24 px` hoặc `48×48 px`): 4 góc trang trí nằm gọn trong `8×8 px` mỗi góc, các cạnh giữa thẳng đều để web kéo giãn tự động bằng CSS `border-image` mà không bao giờ bị méo góc pixel.

3. **Thống nhất tỉ lệ pixel gốc (1×) trên toàn bộ UI:**
   - Vẽ đúng độ phân giải pixel gốc (không phóng to trước khi lưu):
     - Icon HUD: `16×16 px`
     - Huy hiệu bản đồ: `32×32 px` hoặc `48×48 px`
     - Nền Landing Page / Mini-map: `480×270 px` hoặc `640×360 px` (tỉ lệ `16:9`)
     - Cuốn sách mở đôi (Desktop): khoảng `480×300 px` đến `560×340 px`
   - Web sẽ tự nhân nguyên lần (`2×`, `3×`) bằng `image-rendering: pixelated` để mọi đường nét sắc cạnh đồng bộ với Minigame.

4. **Tách rời hoàn toàn các phần tử có tương tác (Layers riêng):**
   - **Mini-map:** Không vẽ dính huy hiệu vào `map_bg.png`. Xuất từng huy hiệu ra file PNG/GIF riêng và đánh dấu tọa độ bằng 1 chấm màu tím `#FF00FF` trên `map_guide.png` (y hệt cách làm `guide.png` của minigame!).
   - **Cuốn sách:** Vùng giấy đặt tranh và vùng giấy đặt chữ câu chuyện nên có màu nền đều, độ tương phản tốt với chữ (giấy tối `#1C1B19` + chữ kem `#F5EFE6`, hoặc giấy kem/parchment ấm `#F3E7CF` + chữ nâu đậm `#231C16`).

5. **Nút bấm có thể vẽ 1 hoặc 3 trạng thái:**
   - Đầy đủ nhất: `normal` (bình thường), `hover` (sáng viền/nổi lên), `pressed` (lún xuống 1–2 px).
   - Nếu muốn làm nhanh, chỉ cần vẽ `normal` — agent sẽ tự thêm hiệu ứng hover/nhấn chuẩn pixel.

6. **An toàn cho cả Desktop (ngang) & Mobile (dọc `390×844`):**
   - **Nền Landing Page:** Đặt chi tiết đắt giá nhất ở **vùng trung tâm** (safe zone) vì trên điện thoại dọc hai rìa trái/phải của ảnh `16:9` sẽ bị cắt bớt.
   - **Mini-map:** Đặt các huy hiệu cách mép ảnh ít nhất 10%. Trên điện thoại dọc, bản đồ sẽ hỗ trợ kéo/vuốt mượt (hoặc hiển thị bản đồ dọc riêng nếu Dom có vẽ `map_bg_mobile.png`).
   - **Cuốn sách:** Desktop mở **2 trang song song** (trái: tranh + zoom, phải: câu chuyện & metadata); Mobile tự chuyển sang **lật từng trang đơn** để đọc chữ dễ dàng.

7. **Chuẩn xuất file từ Photoshop / Aseprite:**
   - **Ảnh tĩnh:** PNG-24, nền trong suốt.
   - **Ảnh động (GIF / Animated WebP):** Giữ nguyên kích thước 1× (nếu scale bắt buộc dùng `Nearest Neighbor`), bật `Transparency`, đặt **`Matte: None`** để tránh viền trắng răng cưa.

---

## 3. Quy Trình Cập Nhật Siêu Nhanh

1. Dom vẽ phác thảo (`mockups/`) hoặc các asset hoàn chỉnh rồi thả vào `Dom web/04_UI_UX_Design/` trên Google Drive.
2. Nhắn AI: **`/dom-web-designer xem và cập nhật UI mới từ Drive`**.
3. Agent tự tải ảnh từ Drive, tối ưu đường dẫn vào `public/assets/ui/`, code ghép tương tác (mini-map + lật sách), chạy `npm run check`, rồi đẩy lên GitHub để web tự cập nhật!
