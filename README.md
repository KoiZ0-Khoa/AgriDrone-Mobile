# AgriDrone Mobile

Ứng dụng React Native + Expo cho AgriDrone, dùng chung ASP.NET Core API với web. Giao diện tiếng Việt, font Inter, chữ xanh đậm `#073642`, điểm nhấn xanh lá `#388329` và nền trắng/kem. Bố cục tham khảo bốn màn hình Jobber do người dùng cung cấp; giữ logo AgriDrone.

## Chạy trên điện thoại

Yêu cầu Node.js 22.13 trở lên, npm và Expo Go tương thích SDK 57 hoặc development build.

```powershell
npm install
Copy-Item .env.example .env
npm start -- --go
```

Sửa `EXPO_PUBLIC_API_URL` trong `.env` trước khi chạy:

| Thiết bị | API URL local |
| --- | --- |
| Android Emulator | `http://10.0.2.2:5080` |
| Điện thoại thật cùng Wi-Fi | `http://<IP-LAN-máy-chạy-BE>:5080` |
| iOS Simulator / web trên máy chạy BE | `http://localhost:5080` |

Với điện thoại thật, dừng BE đang chạy rồi dùng `dotnet run --project backend/src/AgriDrone.Api --launch-profile AgriDrone.Mobile` từ repo BE. Profile này lắng nghe HTTP tại `0.0.0.0:5080` để điện thoại cùng mạng truy cập được. Profile web mặc định chỉ chạy localhost và có chuyển hướng HTTPS nên không dùng để test điện thoại. Mở `http://<IP-LAN-máy-chạy-BE>:5080/health/live` trên điện thoại để kiểm tra. `localhost` trên điện thoại là chính điện thoại. Khi đổi Wi-Fi, kiểm tra lại IP bằng `ipconfig`, sửa `.env` và khởi động lại Metro bằng `npm.cmd start -- --go --clear`.

`npm run web` mở bản xem thử tại cổng 5173, khớp CORS hiện có của BE. Dừng FE web trước khi dùng cùng cổng. Bản web dùng sessionStorage; Android/iOS dùng SecureStore. Không đặt mật khẩu, API secret hoặc thông tin database vào biến `EXPO_PUBLIC_*`.

## Phạm vi đã tích hợp

- Đăng nhập; chọn Tenant khi có nhiều đơn vị; đăng ký Owner; quên/đặt lại mật khẩu.
- Lưu và khôi phục phiên; đăng xuất, hết hạn và HTTP 401 xóa phiên/cache theo Tenant.
- Trang chủ: ngày và lời chào, bản đồ vị trí nông trại, số Farm từ API và lối vào công việc.
- Owner/Tenant Admin: xem Farm có phân trang/kéo tải lại, tạo Farm, xem chi tiết Farm và danh sách/chi tiết Zone, tạo Zone.
- Nông trại: chuyển Danh sách/Bản đồ, tìm tên/mã/địa chỉ và lọc trạng thái trong các trang đã tải. Nút tải thêm vẫn xuất hiện ở cả hai chế độ.
- Bản đồ native: điểm đánh dấu từ `centerPoint` GeoJSON hợp lệ, chọn điểm hoặc dùng nút trước/sau để xem nông trại và mở chi tiết. Thiếu tọa độ được thông báo; không tự tạo vị trí.
- Phân công Tenant Admin đang hoạt động làm `MANAGER / ALL_ZONES`: tìm theo tên/email, đọc assignment, tạo/cập nhật với `ExpectedVersion`, xử lý xung đột.
- Native stack và native bottom tabs; bàn phím, safe area, trạng thái tải/lỗi/trống và danh sách dùng FlashList.

GET `/api/farms` hiện chỉ cho Owner/Tenant Admin. Mobile không suy diễn role `MEMBER` thành Manager hoặc Worker; BE quyết định quyền truy cập Farm/Zone. Danh sách Farm theo assignment cho Member chưa có API; thành viên vẫn đăng nhập được nhưng màn hình danh sách giải thích giới hạn này. Tài khoản System Admin sử dụng web.

### Cập nhật và lưu trữ Farm/Zone

- Chi tiết khu vực → Chỉnh sửa: cập nhật tên và diện tích, hỗ trợ số thập phân dùng dấu phẩy. Mã và polygon hiện có được giữ nguyên; chưa có trình chỉnh sửa ranh giới.
- Chi tiết Farm/Zone → Lưu trữ: chỉ Owner thấy nút, nhập lý do 1–500 ký tự rồi xác nhận. Lịch sử được giữ lại. Thành công quay về danh sách Farm hoặc chi tiết Farm chứa Zone.
- Dùng PUT `/api/farms/{farmId}/zones/{zoneId}`, PUT `/api/farms/{farmId}/zones/{zoneId}/archive`, PUT `/api/farms/{farmId}/archive` với `expectedVersion` đã xem.
- Xung đột phiên bản yêu cầu tải bản mới và kiểm tra trước khi gửi lại; không tự thử lại thao tác ghi. Thông báo riêng khi còn nhiệm vụ bay, công việc hoặc khu vực phụ thuộc.
- API chi tiết chưa trả quyền hiệu lực để ẩn nút sửa theo assignment. BE xác thực Owner/Manager đúng khu vực; app hiển thị lỗi 403 và chặn gửi lại trong form khi không có quyền.

Các phần chưa triển khai: danh sách/điều hành Mission trên mobile, Plant Profile, AI review, lịch/nhiệm vụ thực địa, chụp ảnh, thu hoạch, push notification và đồng bộ offline. Màn hình Công việc giới thiệu trạng thái chưa khả dụng, không tạo dữ liệu giả hoặc giả lập đồng bộ. Phiên bản này cần mạng để đọc/ghi nghiệp vụ.

## Giao diện và luồng thao tác

Luồng chính: **Trang chủ → Xem bản đồ → chọn nông trại → Xem chi tiết → khu vực/phân công**. Tab Nông trại giữ tìm kiếm và bộ lọc khi chuyển Danh sách/Bản đồ. Nút + mở form tạo nông trại cho Owner/Tenant Admin.

Thay đổi theo mẫu Jobber: tiêu đề lớn, bản đồ chiếm phần chính ở trang chủ, bộ chuyển chế độ nền kem, danh sách dùng đường phân cách, thanh màu biểu thị trạng thái, bộ lọc mở từ dưới và nút + nổi. Native bottom tabs được giữ để phù hợp iOS/Android. Không đưa lịch Day/List/Map, timesheet hay chuông thông báo vào khi chưa có nghiệp vụ tương ứng.

Bản đồ dùng `react-native-maps`: Expo Go không cần API key riêng; iOS mặc định dùng Apple Maps. Bản Android cài riêng cần `GOOGLE_MAPS_ANDROID_API_KEY` khi build, giới hạn key theo package `com.agridrone.mobile` và chứng chỉ ký. Nếu chưa cấu hình key, bản cài Android hiển thị trạng thái chưa hỗ trợ bản đồ và vẫn dùng danh sách được. Xem [hướng dẫn Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/).

Web preview của repo mobile hiển thị thông báo thay thế bản đồ native; không tải tile hoặc tọa độ giả. AgriDrone-FE không bị thay đổi bởi đợt thiết kế mobile này.

## API

| Luồng | Endpoint |
| --- | --- |
| Xác thực | `/api/auth/login`, `/api/auth/select-tenant`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Farm | `/api/farms`, `/api/farms/{farmId}` |
| Zone | `/api/farms/{farmId}/zones`, `/api/farms/{farmId}/zones/{zoneId}` |
| Danh sách thành viên Tenant | `/tenants/current/users` (không có prefix `/api`) |
| Phân công | `/api/farms/{farmId}/members/{userId}/assignment` |
| Kiểm tra kết nối | `/health/live` |

Mã reset có thể được nhận qua `agridrone://reset-password?token=...` trong bản build native hoặc nhập trên màn hình. Liên kết email BE hiện vẫn theo cấu hình web của BE; repo này không thay đổi cấu hình gửi email.

## Kiểm tra và đóng gói

```powershell
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npm run export
```

Tests chạy các module TypeScript thật với transport giả lập để kiểm tra tenant role, phiên hết hạn, phân quyền, phân trang, contract GeoJSON, assignment/concurrency và lỗi API. Đây không phải kiểm thử end-to-end với BE thật.

`npm run export` tạo JavaScript bundle/assets cho Android, iOS và web trong `dist`; không tạo APK/IPA.

Để build Android trên máy có Android SDK/JDK phù hợp:

```powershell
npm run android:build
```

Hoặc dùng tài khoản Expo của nhóm và EAS:

```powershell
npx eas-cli build --platform android --profile development
npx eas-cli build --platform android --profile preview
```

Profile `preview` tạo APK nội bộ. Thiết lập API URL có thể truy cập từ thiết bị trong môi trường EAS. Profile `production` yêu cầu `EXPO_PUBLIC_API_URL` là HTTPS. HTTP chỉ được bật cho bản phát triển/preview để kết nối BE local. Chưa cấu hình EAS project ID, signing hoặc xuất bản cửa hàng.

## Cấu trúc

```text
app/          Routes và màn hình Expo Router
src/api/      HTTP client và contracts BE
src/auth/     Phiên đăng nhập và SecureStore
src/farms/    Form Farm/Zone và validation
src/ui/       Design tokens, component dùng chung
tests/        Kiểm tra contract và logic
scripts/      Xuất các kích thước logo và icon ứng dụng
```

Fonts được đóng gói bằng expo-font config plugin; loader bundled hỗ trợ Expo Go/web. Tham khảo [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) khi nâng cấp dependencies.

## Logo

Logo hiện tại dùng mẫu drone nối liền hai chiếc lá do người dùng cung cấp, với cánh được thu gọn để hiển thị trên mobile. Phần biểu tượng được chuẩn bị bằng công cụ imagegen tích hợp, lưu ở `assets/brand/emblem-source.png`. Bản PNG có nền trắng; FE dùng cùng biểu tượng với chế độ hòa trộn multiply trên nền sáng. Chữ AgriDrone được hiển thị riêng bằng font Inter, phần Agri xanh đậm `#104f39` và Drone xanh lá `#5c9e26`.

`assets/brand/emblem.png` dùng trong giao diện và splash; `assets/brand/favicon.png` dùng cho web. `assets/agridrone-icon.png` và `assets/agridrone-foreground.png` là icon 1024 × 1024, với phần đệm riêng cho Android adaptive icon.

Xuất lại các kích thước từ ảnh nguồn trên Windows:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
```

FE lưu bản sao của `emblem.png` và `favicon.png` tại `public/brand/`; cập nhật hai file này khi đổi ảnh nguồn. Reload Expo Go để xem logo trong app. Icon cài đặt và splash cần build lại ứng dụng; Expo Go không phản ánh đầy đủ splash của bản native.

Script xuất ảnh lấy vùng biểu tượng `(260, 170, 1020, 680)` trong ảnh nguồn 1536 × 1024; khi thay ảnh nguồn cần cập nhật vùng này theo bố cục mới. Icon Android có khoảng đệm lớn hơn icon iOS để bảo vệ hai cánh khi hệ thống áp dụng khung tròn.

Prompt ảnh nguồn (imagegen tích hợp): “Preserve the supplied dark-green drone seamlessly joined to two leaves, dark-green left leaf and lime-green right leaf with a curved stem. Keep the central white slot and leaf veins; shorten outer propeller span about 10% for mobile. Remove wordmark and outer whitespace. Use dark green #104f39 and leaf green #5c9e26 with restrained gradients. Crisp 3:2 emblem on uniform white; no field stripes, hexagon, map pin, third leaf, sun or text.”
