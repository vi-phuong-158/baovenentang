/** Controlled Showcase copy. Source: V10 sections I, VI–IX (reviewed 2026-10-04).
 * V10 is labelled DỰ THẢO; the owner's task authorizes these presentation extracts,
 * not wholesale publication of that document or automatic approval of LD records.
 */
var ZALO_MODEL_CONTENT_ = {
  version: 'SHOWCASE_V1_V10',
  name: 'TUYỆT ĐỐI TRUNG THÀNH - CHỦ ĐỘNG, SÁNG TẠO',
  slogan: 'VỮNG VÀNG BẢN LĨNH - SÂU SÁT TÌNH HÌNH - CHỦ ĐỘNG ĐỔI MỚI',
  thought: 'Trung thành là cốt lõi - Kỷ luật là nền tảng - Chủ động, sáng tạo là phương thức - Hiệu quả công tác và sự phục vụ Nhân dân là minh chứng.',
  motto: 'Phân định rõ mặt đối tác, mặt đối tượng - Hợp tác đúng nội dung, đấu tranh đúng vấn đề.',
  baNhat: 'Kỷ luật nhất - Trung thành nhất - Gần dân nhất.',
  actions: '1. Trung thành - bản lĩnh - trách nhiệm\n2. Kỷ luật - bảo mật - khách quan\n3. Chủ động, sáng tạo - sâu sát tình hình, dự báo sớm\n4. Gần dân - kiến tạo - hiệu quả.',
  weekly: 'Thư tuần “Lời Bác dạy”: tạo nền nếp học tập đều đặn hằng tuần; gửi đầu tuần tới cán bộ, chiến sĩ đăng ký; chỉ dùng nội dung tuyên truyền công khai đã duyệt, không gọi AI khi vận hành.',
  assistant: 'Trợ lý 35: hỗ trợ học tập, tra cứu, tự kiểm tra kiến thức; lưu và khai thác các kỳ Thư tuần cùng học liệu đã duyệt.',
  products: 'Thư tuần “Lời Bác dạy” và Trợ lý 35 là hai sản phẩm số hỗ trợ, do Đoàn Thanh niên chủ trì triển khai dưới hình thức công trình thanh niên. Cùng sử dụng kho nội dung đã duyệt, tách biệt dữ liệu người sử dụng; công nghệ không thay thế học tập, rèn luyện và trách nhiệm của cán bộ.'
};

function zaloBotIntroduction_() {
  var c = ZALO_MODEL_CONTENT_;
  return '🇻🇳 ' + c.name + '\n\n' +
    'Mô hình học tập, thực hiện Sáu điều Bác Hồ dạy Công an nhân dân gắn với phong trào thi đua “Ba nhất” và chức năng, nhiệm vụ của Phòng An ninh đối ngoại, Công an tỉnh Phú Thọ.\n\n' +
    '🎯 KHẨU HIỆU HÀNH ĐỘNG\n' + c.slogan + '\n\n' +
    '💡 TƯ TƯỞNG XUYÊN SUỐT\n' + c.thought + '\n\n' +
    '🔄 MÔ HÌNH ĐƯỢC THỰC HIỆN THẾ NÀO?\n' +
    'Việc học tập lời Bác được duy trì thường xuyên, gắn với công việc hằng tuần, kết quả nhiệm vụ, tự học, tự soi, phát hiện vấn đề và chủ động đổi mới cách làm.\n\n' +
    '📲 HAI SẢN PHẨM SỐ HỖ TRỢ\n' +
    '• Thư tuần “Lời Bác dạy”: đưa nội dung học tập đã duyệt đến cán bộ, chiến sĩ hằng tuần.\n' +
    '• Trợ lý 35: hỗ trợ tra cứu, học tập, tự kiểm tra kiến thức và khai thác các nội dung đã duyệt.\n\n' +
    'Hai sản phẩm liên thông về nội dung nhưng tách biệt dữ liệu người sử dụng; công nghệ chỉ là công cụ hỗ trợ, không thay thế việc học tập, rèn luyện và trách nhiệm của cán bộ.\n\n' +
    '⌨️ Gõ /loibac để xem ngay lời Bác dạy của tuần này.';
}

function zaloBotHelp_() {
  return '🤖 TRỢ LÝ 35\n\nCác lệnh chính:\n\n' +
    '/gioithieu — Giới thiệu mô hình\n/loibac — Lời Bác dạy tuần này\n' +
    '/quiz — Tự kiểm tra kiến thức\n/tracuu <từ khóa> — Tra cứu nội dung mô hình\n' +
    '/lich — Lịch học tập\n/trogiup — Hướng dẫn sử dụng\n\n' +
    'Ví dụ:\n/tracuu khẩu hiệu\n/tracuu phương châm';
}

function zaloBotNormalize_(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function zaloBotControlledLookup_(query) {
  var q = zaloBotNormalize_(query), c = ZALO_MODEL_CONTENT_;
  var groups = [
    [['ten mo hinh','mo hinh','ten'],c.name],
    [['khau hieu','khau hieu hanh dong'],c.slogan],
    [['tu tuong','tu tuong xuyen suot'],c.thought],
    [['phuong cham','phuong cham cong tac'],c.motto],
    [['ba nhat','3 nhat'],c.baNhat],
    [['bon nhom hanh dong','bon nhom','4 nhom','hanh dong'],c.actions],
    [['san pham so','hai san pham so','cong trinh thanh nien'],c.products],
    [['thu tuan','thu tuan loi bac day'],c.weekly],
    [['tro ly 35','troly35'],c.assistant]
  ];
  for (var i=0; i<groups.length; i++) if (groups[i][0].indexOf(q)>=0) return groups[i][1];
  return '';
}
