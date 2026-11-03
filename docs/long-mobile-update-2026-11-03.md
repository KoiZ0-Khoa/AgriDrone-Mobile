# Cập nhật Mobile theo BE của Long — 03/11/2026

Đối chiếu bản BE `6f172ef`, gồm hai commit Long `173adfb` và `0f553ca`. Không sửa BE hoặc web. Không thêm System Admin trên Mobile hay các thao tác điều khiển chuyến bay/xử lý AI của Thanh và Chính.

## Các luồng đã thêm

- Đăng nhập và khôi phục phiên System Manager không có tenant. Role đọc từ `system_role` của token để chọn giao diện; BE vẫn kiểm tra quyền cho từng request. Manager dùng tab Trang chủ, Phụ trách và Công việc riêng; không gọi API danh sách tenant bằng phiên hệ thống.
- Manager xem các Farm được phân công, đọc chi tiết qua `operational-context`, sửa thông tin Farm với version hiện tại, tạo/sửa/lưu trữ Zone và lưu trữ Farm theo quyền BE.
- Manager xem danh sách đơn có phân trang và công việc được giao. Yêu cầu đổi lịch của Owner hiển thị rõ; đề xuất lại gửi đúng ID/version của lịch cũ và version đơn. Thời gian nhập theo UTC+7.
- Manager nhập bốn góc ranh giới sau khi đối chiếu ảnh trực giao, mở bản đồ nháp mới nhất theo Farm hoặc đúng đơn khảo sát, duyệt từng điểm hoặc hàng loạt, kiểm tra và phát hành. Dùng `candidates` trực tiếp thay cho danh sách theo Zone. Không cần nhập mã nháp; không có điều kiện chứng chỉ/giấy ủy quyền cũ.
- Khi bản đồ đã phát hành, Manager xác nhận số trụ và giá bằng ID phiên bản bản đồ hiện tại; BE tính số trụ và đơn giá, Mobile không gửi số tiền hoặc số trụ tự nhập.
- Owner gửi yêu cầu khảo sát cho Farm hiện có hoặc đăng ký Farm mới. Khách chưa có tài khoản gửi yêu cầu công khai; sau phê duyệt nhận lời mời Owner qua email. Bỏ đăng ký/tạo Farm trực tiếp theo luồng cũ.
- Owner xem đơn, lịch, chi phí và lịch sử thanh toán; xác nhận hoặc xin đổi lịch; tạo phiên thanh toán và mở trang thanh toán ngoài ứng dụng. Trạng thái đã trả tiền chỉ lấy từ BE, không tự xác nhận khi quay lại app. App tải lại khi được mở lại và kiểm tra các giao dịch đang chờ định kỳ.
- Owner xem danh sách/chi tiết Farm lưu trữ và khôi phục bằng version hiện hành. Zone lưu trữ không tự khôi phục cùng Farm.
- Giữ nguyên chuỗi nhập tọa độ/diện tích, hỗ trợ dấu phẩy hoặc dấu chấm; báo lỗi khi vượt phạm vi/độ chính xác, không tự làm tròn. Các thao tác xác nhận có chặn bấm liên tiếp; lỗi 409 yêu cầu đóng và tải lại.

## Những phần hiện bị BE chặn

Các route cũ về danh sách thành viên đơn vị (`/tenants/current/users`), Farm được giao của Tenant Member (`/api/users/me/farm-assignments`) và nhóm quản lý/phân công thành viên Farm không có trong API hiện tại. Các endpoint mời Tenant Admin/Member cũ cũng không còn được expose. Mobile đã bỏ các mục, nút điều hướng và màn thông báo của nhóm chức năng cũ này khỏi giao diện. Tab không áp dụng cho role hiện tại cũng được ẩn. Điều này không ảnh hưởng luồng System Manager được phân công qua khảo sát.

Các helper hợp đồng cũ vẫn được đánh dấu legacy để tránh dùng lại từ màn hình. Các kiểm thử helper cũ không phải bằng chứng BE còn hỗ trợ những API đó.

Mobile chưa có màn đối chiếu ảnh trực giao đầy đủ, xử lý ảnh AI hoặc thực hiện chuyến bay. Dùng web cho phần hình ảnh/chuyến bay; các màn duyệt điểm và xác nhận kết quả của Long đã có trên Mobile.

Đường dẫn lời mời, return URL thanh toán và IPN vẫn do cấu hình BE quyết định. Điện thoại cần truy cập được BE; SePay cần truy cập được endpoint IPN công khai. Quay lại ứng dụng và kiểm tra trạng thái nếu trang thanh toán trả về một địa chỉ local không truy cập được trên điện thoại.

## Hướng dẫn test

1. Đăng nhập tài khoản System Manager đang Active + Available. Phải vào được mà không cần chọn đơn vị. Tab Phụ trách chỉ hiện Farm được giao; tài khoản System Admin vẫn được hướng dẫn dùng web.
2. Mở Farm → chỉnh sửa tên, diện tích và tọa độ lẻ → lưu → tải lại. Kiểm tra không làm tròn dữ liệu và không sửa ranh giới qua API cập nhật thông tin Farm.
3. Owner → Công việc → mở đơn → xin đổi lịch. Manager → Công việc → đơn tương ứng phải hiện yêu cầu đổi lịch; đề xuất thời gian mới. Owner tải lại và xác nhận lịch mới.
4. Owner tạo thanh toán cọc/khoản còn lại đúng trạng thái, mở trang thanh toán. Khi quay lại app, phải còn chờ nếu BE chưa nhận IPN; chỉ hiện đã thanh toán khi lịch sử trả trạng thái Paid/Confirmed. Không tạo thêm phiên khi đã có giao dịch đang xử lý.
5. Khi BE đã tạo bản nháp, Manager → Farm/đơn → Duyệt bản đồ nền. Kiểm tra không hỏi mã nháp, duyệt một điểm, duyệt hàng loạt, kiểm tra và phát hành. Còn điểm chưa duyệt hoặc có lỗi thì nút phát hành phải bị chặn.
6. Khi đơn chờ giá, xác nhận số trụ/giá từ bản đồ hiện tại, sau đó đề xuất lịch dịch vụ. Kiểm tra luồng Owner xác nhận/thanh toán như bước 3–4.
7. Khách mới → Đăng ký khảo sát; nhập diện tích `2,5123`, kinh độ `108,123456`, vĩ độ `10,123456`. Thử lỗi và gửi lại cùng nội dung: giữ khóa chống trùng; thay nội dung: tạo khóa mới.
8. Owner → Nông trại → Xem nông trại đã lưu trữ → chi tiết → khôi phục. Mở lại danh sách đang dùng để kiểm tra kết quả.
9. Thử truy cập màn Manager bằng Owner và màn thanh toán bằng Manager; điều hướng phải chặn. Thử mất mạng/403/409, không được báo thao tác thành công.

## Kiểm tra đã thực hiện

- TypeScript và 64 kiểm thử tự động đạt.
- Đã export thành công gói Android, iOS và web. Trình biên dịch Hermes cần thư mục tạm có quyền ghi; dùng thư mục cache trong `node_modules` để xác minh.
- 7 tình huống giao diện ở chiều rộng 390 px đạt với dữ liệu giả lập: phiên hệ thống, đề xuất lại lịch, chi tiết Farm, duyệt/phát hành bản đồ, Owner xác nhận/thanh toán, chặn sai role, số lẻ và gửi lại yêu cầu công khai.
- Chưa chạy trên thiết bị Android/iOS thật hoặc với BE/SePay thật. Không gửi email, yêu cầu khảo sát hay thanh toán thật trong kiểm thử.
