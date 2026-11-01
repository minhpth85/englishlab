# Mẫu bài học (template)

File `lesson-template.html` là khung chuẩn của mọi bài học. Khi có bài mới:

1. Sao chép `lesson-template.html` ra thư mục gốc, đặt tên theo tên bài, ví dụ `Tên-bài.html`.
2. Chỉ sửa khối `const LESSON = {...}` ở đầu script. Phần logic bên dưới giữ nguyên.
3. Trong `transcript`, đánh dấu cụm bằng `[[id|chữ]]` và cấu trúc câu bằng `{{n|chữ}}` (n = 1, 2, 3).
4. Mỗi chunk trong `chunks` có id trùng với id trong `[[...]]`. Ví dụ: `[[life-saving|life-saving]]` cần có `"life-saving": {...}` trong `chunks`.
5. `targets` là các cụm dùng cho phần Phòng thu, lấy từ phrase của các chunk.
6. Bài cần có `chunk-list.js` ở thư mục gốc để nút "Lưu để ôn" và trang Chunks hoạt động.

Trang bài học dùng Herbloom, không phụ thuộc Tailwind, nên xem được ngay khi mở file.
