# 06-ai-working-log.md - Nhật ký hoạt động của AI

Nhật ký ghi lại các thay đổi, sửa đổi mã nguồn và kiến trúc được thực hiện bởi các trợ lý AI lập trình (Claude Code, Codex, v.v.).

---

## [2026-06-12] Them Podcast am thanh cho sach Dai doan ket

### Noi dung thuc hien
- Tai file tu Google Drive cua nguoi dung (ID: `1omsBikggxFp_SaFekBNkIZlPvnRiqB2I`).
- Xac dinh file tải ve thuc chat la file am thanh `.m4a` chu khong phai anh (nguoi dung viet nham "postcard" thanh "postcard").
- Di chuyen va doi ten file thanh `podcast.m4a` va dat tai thu muc `web/public/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/podcast.m4a`.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/05. Code/baovenentang/web/src/pages/TuSach.jsx):
  - Dinh nghia map `BOOK_AUDIOS` chua thong tin file am thanh.
  - Them hàm helper `getBookAudio(book)`.
  - Tich hop the `<audio>` controls de phat file audio trong phan Podcast cua modal chi tiet sach.
- Cap nhat [web/src/css/tusach.css](file:///d:/05. Code/baovenentang/web/src/css/tusach.css):
  - Them styling cho `.tusach-audio-player` de trinh phat hien thi dep mat va phu hop giao dien.
- Chay build thu nghiem frontend de xac nhan khong loi compilation.

### Ly do
- Theo yeu cau nguoi dung muon tich hop podcast am thanh cua sach Dai doan ket vao Tu sach so (nguoi dung viet nham tu podcast thanh postcard).

### Rui ro va pham vi anh huong
- Chi anh huong den giao dien chi tiet cua Tu sach so o frontend.
- Khong lam thay doi cấu trúc database Google Sheets hay logic backend Google Apps Script.

### Kiem thu da chay
- `cd web; npm run build` -> build thanh cong khong loi.

### Cach test thu cong
1. Chay dev server frontend local (`npm run dev`).
2. Truy cap Tu sach so, click chon sach "Phat huy truyen thong dai doan ket toan dan toc...".
3. Xac nhan trong phan Podcast co xuat hien trinh phat am thanh.
4. Bấm Play de nghe thu am thanh tu file `podcast.m4a` xem co phat binh thuong hay khong.

## [2026-06-12] Lam dep UI Tu sach va doi ten muc Hoc tap

### Noi dung thuc hien
- Doc lai toan bo `docs/brain/` truoc khi sua code theo quy uoc du an.
- Dung CodeGraph phan tich luong `HocTap` -> `TuSach` -> `getBooks`/`getBookById` va impact cua `TuSach` truoc khi sua UI. Rieng lan doi text cuoi, CodeGraph MCP dang bi `Transport closed`, nen chi doi literal heading mot dong trong `HocTap.jsx`.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Them thanh thong ke tong quan Tu sach: so tai lieu, chu de, hoc lieu truc quan, NotebookLM.
  - Lam card sach giau thong tin hon: bia sach, nam, badge NotebookLM/So do/Nguon, badge so anh neu co media.
  - Lam modal chi tiet rong va ro cau truc hon: header co bia, nut NotebookLM/Nguon o dau, thong tin tong quan, thu vien lien quan, tom tat nhanh, podcast va so do tu duy dang bang truc quan.
  - Dua sach `phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc` len dau danh sach bang sort frontend `FEATURED_BOOK_ID`, khong doi du lieu Google Sheets.
- Cap nhat [web/src/css/tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css):
  - Style thanh thong ke, card sach, badge, modal chi tiet, thu vien media, lightbox va mindmap board.
  - Bo sung responsive cho mobile.
- Cap nhat [web/src/pages/HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx):
  - Doi heading `Hoc tap Nghi quyet XIV` thanh `Tai lieu hoc tap`.

### Ly do
- Theo yeu cau nguoi dung: lam dep phan Tu sach truoc khi thiet ke `TU_SACH_MEDIA`; uu tien sach Dai doan ket len dau va doi ten muc hoc tap cho dung pham vi noi dung.

### Rui ro va pham vi anh huong
- Chi anh huong frontend UI `HocTap`/`TuSach`.
- Khong doi schema `TU_SACH`, khong them `TU_SACH_MEDIA`, khong doi action API `books`/`book`, khong can deploy lai Apps Script.
- Thu tu uu tien sach dang nam o frontend; neu sau nay can van hanh qua sheet thi nen chuyen sang cot/sheet cau hinh thu tu hien thi.

### Kiem thu da chay
- `cd web; npm run build` -> pass.
- Dev server local dang chay tai `http://127.0.0.1:5173/`; HTTP `/` tra `200 OK` trong qua trinh kiem tra.

### Cach test thu cong
1. Mo `http://127.0.0.1:5173/`.
2. Vao `Hoc tap` va xac nhan tieu de da doi thanh `Tai lieu hoc tap`.
3. Chon `Tu sach`, xac nhan sach `Phat huy truyen thong dai doan ket toan dan toc...` nam dau danh sach.
4. Mo chi tiet sach, xac nhan modal co thu vien lien quan, tom tat nhanh, podcast, so do tu duy va nut NotebookLM/Nguon.

---

## [2026-06-11] Gan so do tu duy va anh minh hoa cho sach Dai doan ket

### Noi dung thuc hien
- Doc lai `docs/brain/` va dung CodeGraph xem luong `TuSach.jsx`/`HocTap.jsx` truoc khi sua.
- Kiem tra folder Drive nguoi dung cung cap: `https://drive.google.com/drive/folders/1YgY9ttTC1j4bFU1gofkq1f7aHd_0nWJk`.
- Xac dinh 3 file cua sach `phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc`:
  - `Phat huy tinh than dai doan ket toan dan toc.png` -> so do tu duy, Drive ID `1k72x3VdROr8F_6byrh_7W5dLOjqPuhdB`.
  - `Sức_mạnh_đại_đoàn_kết.png` -> anh minh hoa, Drive ID `1stAPFHJ-UTRGjKJtqXjoHYr3kZLUYVeK`.
  - `Đại_đoàn_kết_năm_2045.png` -> anh minh hoa, Drive ID `1llSXEBEFZNRWeuDg-w0KCmzbz4Rfm9RY`.
- Tao media toi uu tai `web/public/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/`:
  - File full WebP: `mind-map.webp`, `suc-manh-dai-doan-ket.webp`, `dai-doan-ket-2045.webp`.
  - Thumbnail WebP trong `thumbs/`.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Them `BOOK_MEDIA` map theo `book.id`.
  - Modal chi tiet sach hien muc `So do tu duy & anh minh hoa`.
  - Bam thumbnail mo lightbox anh lon va co link mo anh goc tren Drive.
- Cap nhat [web/src/css/tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): style media grid, lightbox anh lon, caption/link Drive.

### Ly do
- Theo yeu cau nguoi dung: truoc tien gan so do tu duy va anh minh hoa trong folder Drive vao sach `Phat huy truyen thong dai doan ket...` de nguoi dung bam xem trong chi tiet sach.

### Rui ro va pham vi anh huong
- Chi anh huong frontend `TuSach`; khong doi schema `TU_SACH`, khong doi API `books`/`book`, khong can deploy lai GAS.
- Media full la WebP toi uu, duoc tai khi nguoi dung bam xem; thumbnail nho duoc tai trong modal.
- Neu thay file Drive goc, can tao lai WebP/thumbnail hoac cap nhat `BOOK_MEDIA`.

### Kiem thu da chay
- `npm run build` trong `web` -> pass.
- Goi `http://127.0.0.1:5173/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/thumbs/mind-map.webp` -> `200 image/webp`.
- Xac nhan `web/dist/tusach-media/...` co du 3 file full va 3 thumbnail sau build.
- `node --check web/src/pages/TuSach.jsx` khong ap dung duoc vi Node bao khong nhan extension `.jsx`; Vite build da parse JSX thanh cong.

### Cach test thu cong
1. Chay `cd web && npm run dev`, mo `http://127.0.0.1:5173/`.
2. Vao `Hoc tap` -> `Tu sach`.
3. Mo sach `Phat huy truyen thong dai doan ket toan dan toc...`.
4. Xac nhan co muc `So do tu duy & anh minh hoa` voi 3 thumbnail.
5. Bam tung thumbnail, xac nhan lightbox hien anh lon va link `Mo anh goc tren Drive` mo dung file.

---

## [2026-06-11] Them bia sach va tang toc tai Tu sach

### Noi dung thuc hien
- Dung CodeGraph de xem luong `HocTap` -> `TuSach` -> `getBooks`/`getBookById` va blast radius truoc khi sua.
- Trich trang dau cua 5 PDF trong `data/` thanh anh bia JPG bang `pdftoppm`, sau do resize/nen bang Pillow.
- Them 5 anh bia static tai `web/public/tusach-covers/`, dung luong sau nen khoang 6-43KB/anh.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Map `book.id` sang anh bia static, khong doi schema sheet `TU_SACH`.
  - Hien bia tren card sach va phan dau modal chi tiet.
  - Skeleton loading co khung bia de tranh layout shift.
- Cap nhat [web/src/css/tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): style cover, detail cover, skeleton cover va gioi han clamp tom tat tren card.
- Cap nhat [web/src/cache.js](file:///d:/Code/baovenentang/web/src/cache.js):
  - Them in-flight dedupe de nhieu noi goi cung cache key khong tao request trung.
  - Cho `cached()` nhan TTL tuy bien.
- Cap nhat [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js): `getBooks()` dung TTL 60 phut vi catalog Tu sach it thay doi.
- Cap nhat [web/src/pages/HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx): prefetch `getBooks()` khi vao tab Hoc tap bang `requestIdleCallback`/`setTimeout`, de khi bam `Tu sach` du lieu thuong da nam trong cache.

### Ly do
- Theo yeu cau nguoi dung: giao dien Tu sach can sinh dong hon bang bia sach trang dau va giam cam giac load cham khi mo danh muc.

### Rui ro va pham vi anh huong
- Chi anh huong frontend Tu sach/Hoc tap va cache client.
- Khong doi Google Sheets schema, khong deploy lai Apps Script, khong doi contract API `books`/`book`.
- Neu sau nay doi ID sach hoac thay PDF, can cap nhat lai file anh trong `web/public/tusach-covers/` va map `BOOK_COVERS`.
- TTL 60 phut giup mo nhanh hon nhung co the lam thay doi catalog moi tren sheet hien cham hon tren may nguoi dung da co cache; khi can co the bump cache key `books-v3`.

### Kiem thu da chay
- `npm run build` trong `web` -> pass.
- Goi `http://127.0.0.1:5173/tusach-covers/cam-nang-phong-chong-tin-gia.jpg` -> `200 image/jpeg`.
- Xac nhan 5 anh bia sau nen co dung luong: 7.8KB, 13.5KB, 33.8KB, 6.8KB, 42.6KB.

### Cach test thu cong
1. Chay `cd web && npm run dev`, mo `http://127.0.0.1:5173/`.
2. Vao `Hoc tap`; doi 1-2 giay de prefetch Tu sach chay nen.
3. Bam `Tu sach`, xac nhan danh sach hien 5 card co bia sach.
4. Bam tung card, xac nhan modal chi tiet co bia va cac nut NotebookLM/Nguon van dung.
5. Reload lai trang va vao lai `Hoc tap` -> `Tu sach`; danh sach phai hien nhanh hon nho localStorage cache.

---

## [2026-06-11] Sua loi dev server tra JS thay vi JSON cho /api/gas

### Noi dung thuc hien
- Re-check CodeGraph cho luong `web/src/api.js` -> `getBooks()` -> `API_URL` va `web/api/gas.js` de phan tach loi dev/prod.
- Xac nhan production `https://baovenentang.vercel.app/api/gas?action=books` van tra JSON dung, nen GAS deploy khong hong.
- Xac nhan local `npm run dev` dang loi do frontend dev fallback sang `/api/gas`, nhung Vite khong co route API nen tra ve ma JS cua file `web/api/gas.js`; client co parse JSON va vo voi thong bao `Unexpected token ... is not valid JSON`.
- Cap nhat [web/vite.config.js](file:///d:/Code/baovenentang/web/vite.config.js):
  - Them `gasDevGuardPlugin`.
  - Neu thieu `VITE_GAS_URL`, request `GET/POST /api/gas` trong Vite dev se tra JSON loi ro rang thay vi source JS/HTML.
- Cap nhat [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js):
  - Them `parseApiResponse()` dung chung cho GET/POST.
  - Neu backend/proxy tra noi dung khong phai JSON, UI se bao loi ro nguyen nhan va kem snippet response mau.
- Tao [web/.env.local](file:///d:/Code/baovenentang/web/.env.local) voi `VITE_GAS_URL` tro thang toi Web App `/exec` hien tai de local `npm run dev` tai duoc du lieu that ngay.

### Ly do
- Nguoi dung mo webapp bang `npm run dev` de xem thu Tui sach, nhung dev server khong co endpoint `/api/gas`. Loi hien tai de nguoi dung hieu nham la deploy GAS hong, trong khi production proxy va GAS van hoat dong binh thuong.

### Rui ro va pham vi anh huong
- Chi anh huong frontend dev experience va thong bao loi client.
- Them mot file env local trong `web/`; URL nay khong phai secret nhung can cap nhat neu doi Web App deployment URL.
- Khong doi contract production `/api/gas`, khong doi Apps Script, khong doi schema Google Sheet.
- Local dev da co `VITE_GAS_URL` mac dinh o `web/.env.local`; neu doi deployment URL thi can sua file nay.

### Kiem thu da chay
- `npm run build` trong `web` -> pass.
- Goi `http://127.0.0.1:5173/api/gas?action=books` khi KHONG co `VITE_GAS_URL` -> tra JSON loi co chu `Thieu VITE_GAS_URL...`, khong con tra source JS.
- Tao `web/.env.local`, restart `npm run dev`, sau do local frontend se goi thang Apps Script `/exec`.
- Goi production `https://baovenentang.vercel.app/api/gas?action=books` -> van tra JSON 5 tai lieu moi.

### Cach test thu cong
1. Xoa/khong tao `web/.env.local`, chay `cd web && npm run dev`.
2. Mo `Hoc tap` -> `Tu sach`; UI phai hien loi ro `Thieu VITE_GAS_URL...` thay vi `Unexpected token`.
3. Khoi phuc `web/.env.local`, restart dev server.
4. Reload trang va kiem tra `Tu sach` tai duoc 5 tai lieu moi.

---

## [2026-06-11] Cap nhat Tu sach tu 5 PDF tren Google Drive

### Noi dung thuc hien
- Doc lai toan bo `docs/brain/` va re-check CodeGraph cho luong `TU_SACH` truoc khi sua.
- Dung MarkItDown de chuyen 5 PDF trong `data/` sang Markdown tai `data/tusach-md/`:
  - `Cam_nang_phong_chong_tin_gia.md`
  - `Bao_ve_nen_tang_tu_tuong_cua_Dang_trong_tinh_hinh_moi.md`
  - `tang_cuong_ct_XDD_cong_an.md`
  - `phat_huy_suc_manh_toàn_dan_toc.md`
  - `Sach_Phat_huy_truyen_thong_dai_doan_ket.md`
- Tao file du phong `data/tusach_import.csv` gom 5 dong theo dung schema 12 cot cua sheet `TU_SACH`.
- Cap nhat [backend/08-tusach.gs](file:///d:/Code/baovenentang/backend/08-tusach.gs):
  - Doi `TU_SACH_NOTEBOOK_URL` sang NotebookLM chung `https://notebooklm.google.com/notebook/ee1792f7-45ff-4952-9ce6-50cc1cd4ad1a`.
  - Thay 10 tai lieu mau cu bang 5 tai lieu moi tu Drive.
  - Them `TU_SACH_LEGACY_SAMPLE_IDS` va `replaceTuSachWithSampleBooks()` de tu dong thay sheet neu phat hien du lieu mau cu.
- Cap nhat [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js): doi cache key `books-v2` thanh `books-v3` de tranh hien catalog cu tu localStorage.
- Cap nhat [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): ghi nhan mo hinh mot NotebookLM chung, nguoi dung chon/tich dung nguon trong NotebookLM.
- Deploy Apps Script:
  - `npx @google/clasp push --force` -> pushed 17 files.
  - `npx @google/clasp deploy --deploymentId AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg --description "Update Tu Sach catalog from Drive PDFs"` -> deployment `@24`.
- Goi production `?action=books` sau deploy de `seedTuSach()` thay du lieu cu trong Google Sheet `TU_SACH`; ket qua tra ve 5 tai lieu moi.

### Ly do
- Theo yeu cau nguoi dung: bo toan bo du lieu Tu sach mau cu, dua cac sach/PDF moi tren Drive vao webapp, va dung mot NotebookLM chung de nguoi dung chon nguon tai lieu can hoi.

### Rui ro va pham vi anh huong
- Anh huong truc tiep den du lieu `TU_SACH`, seed backend `08-tusach.gs`, action public GET `books`/`book`, va cache danh sach sach frontend.
- Khong doi schema Google Sheets, khong doi contract response `books`/`book`, khong bat lai `ask_book`.
- `replaceTuSachWithSampleBooks()` se thay noi dung sheet neu phat hien ID mau cu; neu sheet sau nay co du lieu tuy bien can giu, khong nen dua cac legacy ID cu vao lai.
- Markdown/PDF trong `data/` la artifact ho tro doc va import, co kich thuoc lon; can quyet dinh rieng truoc khi commit.

### Kiem thu da chay
- `Get-Content -Raw -Encoding UTF8 backend\08-tusach.gs | node --check -` -> pass.
- `Get-Content -Raw -Encoding UTF8 backend\07-main.gs | node --check -` -> pass.
- `node --check web/src/api.js` -> pass.
- Production `?action=books` -> `success: true`, `count: 5`, ca 5 tai lieu deu dung NotebookLM chung.

### Cach test thu cong
1. Mo webapp -> `Hoc tap` -> `Tu sach`.
2. Xac nhan danh sach chi con 5 tai lieu moi:
   - Cam nang phong chong tin gia, tin sai su that tren khong gian mang.
   - Bao ve nen tang tu tuong cua Dang trong tinh hinh moi.
   - Tang cuong xay dung Dang trong Cong an nhan dan theo Di chuc cua Chu tich Ho Chi Minh.
   - Phat huy suc manh toan dan toc bao ve an ninh quoc gia trong tinh hinh moi.
   - Phat huy truyen thong dai doan ket toan dan toc, xay dung dat nuoc ta ngay cang giau manh, van minh, hanh phuc.
3. Mo chi tiet tung tai lieu, kiem tra nut NotebookLM deu tro toi link chung va nut nguon mo dung file Google Drive.
4. Neu trinh duyet van hien du lieu cu, reload sau it nhat 5 phut hoac xoa localStorage key `bvnt_books-v2`; frontend moi dung key `books-v3`.

---

## [2026-06-10] Sua modal chi tiet Tu sach bi tut xuong duoi viewport

### Noi dung thuc hien
- Dung CodeGraph de xac dinh luong lien quan: [HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx) render [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx) o che do embedded; modal chi tiet nam trong `detailBook`.
- Cap nhat [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx): render modal chi tiet bang `createPortal(..., document.body)` de backdrop `position: fixed` bam truc tiep viewport, khong bi ancestor cua tab anh huong.
- Cap nhat [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): can giua modal, gioi han chieu cao modal theo viewport va chan overscroll trong modal.
- Cap nhat [index.css](file:///d:/Code/baovenentang/web/src/index.css): khoa scroll body khi modal mo; bo transform/filter/will-change tren `.tab-panel.active` de tranh tao containing block cho overlay.

### Ly do
- Khi `TuSach` nam trong tab `Hoc tap`, CSS animation cua `.tab-panel` co the lam phan tu `position: fixed` bi tinh theo ancestor thay vi viewport. Vi vay modal bi hien lech xuong duoi, nguoi dung phai keo moi thay day modal.
- Portal dua modal ra `body`, la cach on dinh hon cho overlay dung chung trong cac tab/page embedded.

### Rui ro va pham vi anh huong
- Chi anh huong frontend UI cua modal chi tiet sach va active tab panel.
- Khong doi API, backend, Google Sheets schema hoac du lieu `TU_SACH`.
- Active tab khong con giu transform/filter o trang thai da hien thi; transition vao tab van con o trang thai inactive.

### Kiem thu da chay
- `cd web; npm run build` -> pass.
- `codegraph sync` -> pass.
- In-app browser tai `http://127.0.0.1:5173/`: mo `Hoc tap` -> `Tu sach` -> `Hien phap`; modal co parent `BODY`, backdrop `fixed`, viewport cao 794px, modal top 49px, bottom 668px, `fullyWithinViewport: true`.

### Cach test thu cong
1. Refresh `http://127.0.0.1:5173/`.
2. Mo `Hoc tap` -> `Tu sach`.
3. Bam sach `Hien phap nuoc CHXHCN Viet Nam nam 2013`.
4. Xac nhan modal hien ngay trong man hinh, khong can keo xuong moi thay noi dung chinh hoac nut dong.

---

## [2026-06-10] Gộp Tủ sách và Sổ tay AI vào tab Học tập

### Nội dung thực hiện
- Cập nhật [App.jsx](file:///d:/Code/baovenentang/web/src/App.jsx): gỡ route/page lazy `tu-sach` và `so-tay-ai` khỏi bottom nav, giữ 3 page chính `tin-tuc`, `troly35`, `hoc-tap`.
- Cập nhật [BottomNav.jsx](file:///d:/Code/baovenentang/web/src/components/BottomNav.jsx): bottom nav còn 3 mục `Tin tức`, `Trợ lý 35`, `Học tập`.
- Cập nhật [HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx): thêm mục con `Tủ sách` cạnh Video, Infographic và Kiểm tra; render `TuSach` ở chế độ embedded.
- Cập nhật [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx): hỗ trợ prop `embedded` để dùng lại nội dung Tủ sách trong tab Học tập mà không lặp hero trang riêng.
- Xóa [SoTayAI.jsx](file:///d:/Code/baovenentang/web/src/pages/SoTayAI.jsx) vì NotebookLM không còn là page độc lập.
- Cập nhật [index.css](file:///d:/Code/baovenentang/web/src/index.css) và [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css) cho layout 4 mục học tập và trạng thái nhúng Tủ sách.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) để ghi nhận luồng điều hướng mới.

### Lý do
- Theo yêu cầu người dùng: `Tủ sách` và `Sổ tay AI` bị trùng nội dung, nên gộp thành một mục `Tủ sách` trong `Học tập` để bottom nav cân đối hơn.
- NotebookLM vẫn được giữ theo từng tài liệu qua trường `TU_SACH.NotebookLM URL`; chỉ thay đổi điểm vào UI, không đổi contract API hoặc schema Google Sheets.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng frontend navigation và layout tab Học tập.
- Người dùng quen mở `Sổ tay AI` ở bottom nav sẽ cần vào `Học tập` -> `Tủ sách`.
- Không đổi backend, không đổi dữ liệu `TU_SACH`, không đổi action `books`/`book`/`ask_book`.

### Kiểm thử đã chạy
- `cd web; npm run build` -> pass.
- `rg` xác nhận không còn route/import/source CSS cũ `so-tay-ai`/`SoTayAI`/`.sotay-*` trong `web/src`.
- `codegraph sync` đã chạy sau thay đổi source.
- In-app browser tại `http://127.0.0.1:5173/` xác nhận bottom nav còn 3 mục; `Học tập` có 4 mục con Video, Infographic, Kiểm tra, Tủ sách; chọn `Tủ sách` render nội dung `TuSach` ở chế độ embedded.

### Cách test thủ công
1. Refresh trang local `http://127.0.0.1:5173/`.
2. Xác nhận bottom nav còn 3 mục: `Tin tức`, `Trợ lý 35`, `Học tập`.
3. Mở `Học tập`, chọn mục `Tủ sách`; danh mục tài liệu hiển thị cùng nhóm với Video, Infographic và Kiểm tra.
4. Mở chi tiết một tài liệu có `NotebookLM URL`, xác nhận vẫn có thể mở NotebookLM từ modal chi tiết.

---

## [2026-06-10] Gỡ khối "Hỏi đáp tài liệu" khỏi tab Tủ sách

### Nội dung thực hiện
- Dùng CodeGraph xác định khối UI cần gỡ nằm trong [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx) tại section `tusach-ask`.
- Xóa toàn bộ section hiển thị:
  - tiêu đề `Hỏi đáp tài liệu`
  - thông báo "Tính năng hỏi đáp AI trực tiếp đang tạm tắt..."
  - nút `Hỏi đáp qua NotebookLM`
- Giữ nguyên modal chi tiết tài liệu và link `NotebookLM` trong modal để người dùng vẫn mở notebook theo từng tài liệu.

### Lý do
- Theo yêu cầu người dùng: bỏ hoàn toàn khối trung gian trên trang `Tủ sách`, tránh lặp nội dung với modal chi tiết và làm giao diện gọn hơn.

### Rủi ro và phạm vi ảnh hưởng
- Chỉ ảnh hưởng UI frontend của tab `Tủ sách`.
- Không đổi API, không đổi dữ liệu `TU_SACH`, không đổi hành vi modal chi tiết.
- Link `NotebookLM` vẫn còn trong modal chi tiết; người dùng cần mở chi tiết tài liệu để truy cập.

### Kiểm thử đã chạy
- `cd web; npm run build` → pass.
- `rg` trong `web/src/pages/TuSach.jsx` xác nhận không còn chuỗi `Hỏi đáp tài liệu`, `Hỏi đáp qua NotebookLM`, `Tính năng hỏi đáp AI trực tiếp đang tạm tắt`.
- Đã thử xác minh tự động bằng browser automation nhưng môi trường REPL hiện thiếu `playwright-core`, nên không chụp được ảnh xác minh runtime.

### Cách test thủ công
1. Refresh trang local `http://127.0.0.1:5173/`.
2. Mở tab `Tủ sách`.
3. Xác nhận khối `Hỏi đáp tài liệu` không còn xuất hiện giữa danh mục và modal chi tiết.

---

## [2026-06-10] Hoàn thành SEC-3 - Làm rõ rate-limit proxy serverless

### Nội dung thực hiện
- Chọn phương án B trong backlog: giữ `Map` in-memory ở [web/api/gas.js](file:///d:/Code/baovenentang/web/api/gas.js) làm rate-limit best-effort, không thêm Redis/KV/dependency mới.
- Thêm ghi chú trực tiếp trong code proxy: rate-limit này chỉ best-effort trên serverless, chặn chi phí thật phải nằm ở GAS quota.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md), [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md).

### Lý do
- Vercel serverless có thể tạo nhiều instance; `Map` memory không phải rate-limit cứng. Ghi rõ giới hạn này giúp không nhầm proxy là hàng rào chống lạm dụng chi phí.

### Rủi ro và phạm vi ảnh hưởng
- Không đổi hành vi runtime, chỉ thêm comment/tài liệu.
- Endpoint tốn chi phí vẫn phải dùng guard backend: `troly35_run` hiện có quota; `ask_book` vẫn tạm tắt cho tới khi bổ sung quota riêng nếu muốn bật lại.

### Kiểm thử
- Kiểm tra cú pháp proxy trong đợt test tổng hợp: `node --check web/api/gas.js`.

---

## [2026-06-10] Hoàn thành REF-1 - Tách cache frontend khỏi `api.js`

### Nội dung thực hiện
- Dùng CodeGraph trước khi sửa:
  - `cached` có 3 caller: `getArticles`, `getStats`, `getBooks` trong `web/src/api.js`.
  - `invalidateCache` hiện không có caller nhưng là export public từ `api.js`, cần giữ contract.
  - Impact của `cached` chỉ nằm trong `web/src/api.js`.
- Thêm [web/src/cache.js](file:///d:/Code/baovenentang/web/src/cache.js):
  - Chuyển nguyên logic localStorage cache/SWR (`cacheGet`, `cacheSet`, `cacheTrim`, `cached`, `invalidateCache`) ra module riêng.
- Cập nhật [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js):
  - Import `cached` từ `cache.js`.
  - Re-export `invalidateCache` để giữ nguyên API module hiện có.
  - Giữ nguyên cache key và chữ ký `cached(key, fetcher)`.
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) và [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md).

### Lý do
- Giảm trách nhiệm của `web/src/api.js`: file này chỉ còn cấu hình URL và wrappers API, còn cache nằm ở module chuyên trách.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp tới các GET có cache: `getArticles`, `getStats`, `getBooks`.
- Không đổi API endpoint, payload, response hoặc cache key.
- `invalidateCache` vẫn export qua `api.js`, nên caller hiện tại/tương lai không cần đổi import.

### Kiểm thử đã chạy
- `node --check web/src/cache.js; node --check web/src/api.js` → pass.
- `cd web; npm run build` → pass (`vite build`, 1605 modules transformed).
- `rg` xác nhận cache internals chỉ còn ở `web/src/cache.js`, không còn trong `web/src/api.js`.

### Cách test thủ công
1. `cd web; npm run dev`.
2. Mở các tab dùng cache: `Tin tức`, `Tủ sách`, `Sổ tay AI`.
3. Reload trang và xác nhận dữ liệu đã tải không lỗi; nếu cần clear cache thì gọi `invalidateCache()` từ module `api.js` như trước.

---

## [2026-06-10] Hoàn thành SEC-1/SEC-4/SEC-5 - Hardening proxy/client API

### Nội dung thực hiện
- Dùng CodeGraph phân tích impact trước khi sửa:
  - `postApi` ảnh hưởng 8 wrapper frontend (`subscribe`, `submitQuiz`, `runTroLy35`, `rateTroLy35`, `getTroLy35History`, `getTrends`, `sendFeedback`, `askBookAI`) và các page gọi wrapper.
  - `authorizeAction` chỉ ảnh hưởng `handler` trong `web/api/gas.js`.
  - `doGet`/`doPost` trong `backend/07-main.gs` được dùng để đóng băng contract action hiện tại.
- Cập nhật [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js):
  - Bỏ URL Apps Script `/exec` hardcode khỏi client.
  - Production dùng `/api/gas`; dev dùng `VITE_GAS_URL` nếu cần, fallback an toàn là `/api/gas`.
  - Gỡ `API_TOKEN`/`VITE_API_TOKEN`; client không còn tự gửi `api_token` hoặc header `X-Api-Token`.
- Cập nhật [web/api/gas.js](file:///d:/Code/baovenentang/web/api/gas.js):
  - Thêm `IP_HASH_SALT` bắt buộc; thiếu salt thì proxy trả lỗi cấu hình, không fallback sang token hoặc chuỗi mặc định.
  - Đưa `video_export` vào nhóm `ADMIN_ACTIONS` để khớp backend `doGet` đang yêu cầu `validateApiToken_`.
- Cập nhật tài liệu:
  - [README.md](file:///d:/Code/baovenentang/README.md) và [backend/README.md](file:///d:/Code/baovenentang/backend/README.md): env bắt buộc, cấm `VITE_API_TOKEN`, ghi `VITE_GAS_URL` chỉ là URL dev.
  - [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md): thêm bảng policy endpoint public/token/admin/tạm tắt.
  - [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md): ghi quyết định cập nhật proxy ngày 2026-06-10.
  - [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) và [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md): đánh dấu SEC-1/SEC-4/SEC-5 hoàn thành.

### Lý do
- Giảm rủi ro lộ Apps Script deployment URL trong frontend bundle.
- Loại bỏ hiểu nhầm rằng `VITE_API_TOKEN` có thể dùng làm secret.
- Bắt buộc salt ổn định/khó đoán cho hash IP trước khi gửi sang Apps Script.
- Đồng bộ policy admin giữa proxy và backend cho `video_export`.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp tới mọi request frontend qua `API_URL` và mọi request proxy cần `clientIpHash`.
- Khi chạy `npm run dev` thuần Vite mà không có `VITE_GAS_URL` hoặc một proxy local cho `/api/gas`, request API sẽ không tới Apps Script như trước. Cách chạy dev gọi Apps Script trực tiếp là đặt `VITE_GAS_URL=<Apps Script /exec URL>`.
- Vercel production bắt buộc có `IP_HASH_SALT`; nếu thiếu sẽ fail-fast 500 thay vì âm thầm dùng fallback yếu.
- Không đổi tên action, payload hoặc response backend.

### Kiểm thử đã chạy
- `node --check web/api/gas.js` → pass.
- Mock handler proxy với `GAS_DEPLOYMENT_URL` có giá trị và thiếu `IP_HASH_SALT` → trả `500 {"success":false,"error":"IP hash salt not configured"}`.
- `cd web; npm run build` → pass (`vite build`, 1604 modules transformed).
- `rg` trong `web/src` và `web/api` → không còn `VITE_API_TOKEN`, URL Apps Script hardcode, fallback `'bvnt'` hoặc fallback salt qua `process.env.IP_HASH_SALT ||`.
- `rg` trong `web/dist` → không tìm thấy `VITE_API_TOKEN`, URL Apps Script hardcode, `api_token` hoặc `X-Api-Token`.

### Cách test thủ công
1. Trên Vercel, cấu hình `GAS_DEPLOYMENT_URL`, `GAS_API_TOKEN`/`API_ACCESS_TOKEN`, `ADMIN_API_TOKEN` nếu tách riêng và `IP_HASH_SALT`; redeploy.
2. Gọi GET public qua `/api/gas?action=today` xác nhận vẫn trả dữ liệu.
3. Gọi admin action như `/api/gas?action=feedback_stats` không có admin token phải trả 401; có `X-Api-Token: <ADMIN_API_TOKEN>` phải được proxy inject token GAS.
4. Local dev nếu cần gọi Apps Script trực tiếp: đặt `VITE_GAS_URL` rồi chạy `cd web; npm run dev`.

---

## [2026-06-10] Hoàn thành TOOL-1 - CodeGraph index file `.gs`

### Nội dung thực hiện
- Dùng CodeGraph xác nhận trạng thái trước thay đổi: chỉ index 45 file với language `javascript/jsx/python`, chưa có `backend/*.gs`; `codegraph_search handleTroLy35Run` không trả kết quả backend.
- Kiểm tra CodeGraph CLI/package local và xác định điểm chọn source file nằm ở `EXTENSION_MAP` trong bundle CodeGraph global local.
- Thêm mapping `.gs` → `javascript` trong bundle CodeGraph global local:
  - `C:/Users/admin/AppData/Roaming/npm/node_modules/@colbymchenry/codegraph/node_modules/@colbymchenry/codegraph-win32-x64/lib/dist/extraction/grammars.js`
- Chạy `codegraph index --force`; CodeGraph hiện index 61 file, 1.210 nodes, 2.664 edges, trong đó `backend/` có 16 file `.gs` được nhận là `javascript`.
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) và [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md) để đánh dấu TOOL-1 hoàn thành.

### Lý do
- Gỡ điểm mù backend trước khi thực hiện các task SEC/REF. Từ nay có thể dùng `codegraph_search`, `codegraph_callers`, `codegraph_callees` và `codegraph_impact` cho các symbol Google Apps Script như `doPost`, `handleTroLy35Run`, `validateApiToken_`.

### Rủi ro và phạm vi ảnh hưởng
- Không thay đổi mã runtime của frontend/backend/video.
- Có thay đổi tooling ngoài repo trong gói CodeGraph cài global trên máy local. Nếu nâng cấp/cài lại CodeGraph, mapping `.gs` có thể mất và cần áp lại rồi chạy `codegraph index --force`.
- Working tree trước khi làm đã có nhiều thay đổi/untracked file; chỉ cập nhật tài liệu brain trong repo ở bước này.

### Kiểm thử đã chạy
- `codegraph index --force` → pass, index 61 files.
- `codegraph_status` → languages gồm `javascript: 19`, `jsx: 12`, `python: 30`.
- `codegraph_files path=backend` → thấy 16 file `.gs` trong `backend/`.
- `codegraph_search doPost` → trả `backend/07-main.gs:268`.
- `codegraph_search handleTroLy35Run` → trả `backend/08-troly35.gs:189`.
- `codegraph_search askBookAI` → trả cả `web/src/api.js:136` và `backend/08-tusach.gs:168`.
- `codegraph_callers handleTroLy35Run` → caller `doPost`.
- `codegraph_impact validateApiToken_` → impact `validateApiToken_`, `doGet`, `doPost`, `backend/07-main.gs`.

### Cách kiểm tra lại
```powershell
codegraph status
codegraph files --filter backend
codegraph query doPost
codegraph callers handleTroLy35Run
codegraph impact validateApiToken_
```

---

## [2026-06-09] Tạo backlog refactor & hardening chi tiết từ review kiến trúc

### Nội dung thực hiện
- Tạo [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md): 14 task card (TOOL-1, SEC-1..6, REF-1..7) cho các đề xuất còn lại của review 2026-06-09. Mỗi card có: ưu tiên, phụ thuộc, file/symbol liên quan, checklist **"trước khi code"** (phân tích tác động CodeGraph, đóng băng contract, rollback), các bước, kiểm thử và tiêu chí hoàn thành. Kèm template chung "trước khi code" và bảng tổng hợp ưu tiên.
- Đăng ký 14 task tương ứng vào task list của phiên làm việc (TaskCreate #1–#14).
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): trỏ tới backlog chi tiết và đánh dấu việc tạm tắt Tủ sách AI đã xong.

### Lý do
- Theo yêu cầu người dùng: từ bản review, lập task + hướng dẫn chi tiết cần làm **trước khi code**, đúng quy trình bắt buộc trong `CLAUDE.md`.

### Rủi ro và phạm vi ảnh hưởng
- Chỉ thêm tài liệu brain + task tracking; **không** thay đổi mã nguồn runtime.
- Lưu ý điểm mù: CodeGraph chưa index `.gs` (task TOOL-1) nên impact analysis backend hiện phải dùng Grep cho tới khi TOOL-1 xong.

### Cách kiểm tra
- Đọc `docs/brain/07-refactor-backlog.md` xác nhận đủ 14 task card + bảng ưu tiên.
- `TaskList` hiển thị 14 task TOOL-1/SEC/REF.

---

## [2026-06-09] Tạm tắt hỏi đáp AI trực tiếp trong Tủ sách

### Nội dung thực hiện
- Dùng CodeGraph xác định `askBookAI` chỉ được dùng trong `web/src/pages/TuSach.jsx`; backend `.gs` không nằm trong index nên đọc trực tiếp `07-main.gs`, `08-tusach.gs`.
- Frontend [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Gỡ import `askBookAI` và các icon chỉ dùng cho form hỏi đáp (`RefreshCw`, `Send`, `Sparkles`).
  - Gỡ state `question/answer/askLoading/askError`, hàm `handleAsk` và helper `getPostData`.
  - Thay section "Hỏi đáp AI" bằng ghi chú + nút mở NotebookLM theo cuốn đang chọn.
- Backend [07-main.gs](file:///d:/Code/baovenentang/backend/07-main.gs): `case 'ask_book'` trả `{ success: false, error: '... đang tạm tắt ...' }`, không còn gọi `askBookAI`.
- Giữ nguyên hàm `askBookAI`, schema và sheet `TU_SACH` trong [08-tusach.gs](file:///d:/Code/baovenentang/backend/08-tusach.gs) để bật lại nhanh.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md).

### Lý do sửa
- Theo yêu cầu người dùng: tạm tắt chat AI RAG trực tiếp của Tủ sách, chỉ cho dùng qua link NotebookLM.
- Đồng thời giảm rủi ro endpoint `ask_book` public chưa có quota (phát hiện trong review kiến trúc 2026-06-09).

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng: UI tab `Tủ sách` và action POST `ask_book`. Không đổi schema sheet, không đổi action `books`/`book`.
- `ask_book` vẫn là action hợp lệ nhưng nay luôn trả lỗi "tạm tắt"; client cũ gọi action này sẽ nhận thông báo thay vì câu trả lời.
- `askBookAI` trong `api.js` còn export nhưng không còn caller (giữ lại để re-enable).
- Cần `clasp push` lại backend thì thay đổi `ask_book` mới có hiệu lực trên production.

### Kiểm thử đã chạy
- Build frontend: `cd web; npm run build` → pass (`✓ built`), chunk `TuSach` build bình thường.
- Kiểm tra không còn tham chiếu mồ côi trong `TuSach.jsx` (grep `askBookAI/getPostData/handleAsk/Sparkles/...` → no matches).
- Kiểm tra cú pháp GAS (copy `.gs` sang `.js` rồi `node --check`): `07-main.gs OK`, `08-tusach.gs OK`.

### Cách test thủ công
1. `cd web; npm run dev`, mở tab `Tủ sách`: không còn ô nhập "Hỏi AI"; có nút "Hỏi đáp qua NotebookLM" khi chọn cuốn có `notebookUrl`.
2. Mở chi tiết một cuốn, bấm link NotebookLM/nguồn vẫn hoạt động.
3. (Sau khi `clasp push`) POST `ask_book` trả `success=false` với thông báo tạm tắt.

---

## [2026-06-08] Tách Sổ tay AI thành tính năng NotebookLM riêng

### Nội dung thực hiện
- Dùng CodeGraph để xác định phạm vi ảnh hưởng của `BottomNav`, `HocTap`, `TuSach`, `NotebookPanel` và `PAGES`.
- Cập nhật frontend:
  - [App.jsx](file:///d:/Code/baovenentang/web/src/App.jsx): thêm page lazy `SoTayAI` và route tab `so-tay-ai`.
  - [BottomNav.jsx](file:///d:/Code/baovenentang/web/src/components/BottomNav.jsx): thêm tab `Sổ tay AI`, sắp xếp bottom nav thành 5 mục để `Trợ lý 35` nằm giữa.
  - [HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx): bỏ tab con `Sổ tay AI`, giữ `Học tập` cho video, infographic và kiểm tra.
  - [SoTayAI.jsx](file:///d:/Code/baovenentang/web/src/pages/SoTayAI.jsx): thêm màn hình riêng hiển thị các tài liệu có `notebookUrl` và mở NotebookLM theo từng cuốn.
  - [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css) và [index.css](file:///d:/Code/baovenentang/web/src/index.css): bổ sung style trang `Sổ tay AI` và chỉnh tabs học tập còn 3 mục.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md).
- Bổ sung validate response trong [api.js](file:///d:/Code/baovenentang/web/src/api.js) cho `getBooks`: nếu Apps Script chưa deploy action `books` và trả payload endpoint chung, UI sẽ báo lỗi backend chưa sẵn sàng thay vì hiển thị nhầm `Không có tài liệu phù hợp`.
- Đổi cache key sách từ `books-v1` sang `books-v2` để bỏ qua cache localStorage chứa payload sai cũ.

### Lý do sửa
- Tách rõ `Tủ sách` là catalog/hỏi đáp AI theo tóm tắt, còn `Sổ tay AI` là điểm vào NotebookLM chuyên sâu.
- Chọn mô hình mỗi cuốn/tài liệu có `NotebookLM URL` riêng để giảm nhiễu ngữ cảnh, dễ chia sẻ/phân quyền và dễ cập nhật từng nguồn.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp tới điều hướng frontend và UI `Học tập`; không thay đổi backend, API contract hoặc cấu trúc sheet.
- Dữ liệu seed hiện có thể vẫn dùng chung một URL NotebookLM mẫu. Khi vận hành thật cần cập nhật từng dòng `TU_SACH.NotebookLM URL` sang link riêng của tài liệu đó.
- Nếu có tài liệu nhạy cảm, cần kiểm tra quyền chia sẻ NotebookLM trước khi đưa link vào sheet.
- Khi frontend local vẫn trỏ tới Apps Script cũ chưa có `books`/`book`/`ask_book`, Tủ sách sẽ báo cần deploy backend mới và chạy `setupSystem()`.

### Kiểm thử đã chạy
- Build frontend:
  ```powershell
  cd web
  npm run build
  ```
- Khởi động dev server local và xác nhận HTTP 200 tại `http://127.0.0.1:5173/`.
- Kiểm tra trực tiếp endpoint dev `?action=books`: Apps Script hiện tại chưa liệt kê action `books`, xác nhận nguyên nhân dữ liệu rỗng là backend cloud chưa được deploy/cập nhật.
- Đã thử kiểm tra bằng Browser plugin nhưng webview attach bị timeout do lỗi runtime/plugin; không có tín hiệu lỗi từ build hoặc dev server.
- Deploy backend Apps Script:
  ```powershell
  cd backend
  npx @google/clasp push --force
  npx @google/clasp deploy --deploymentId AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg --description "Deploy Tu Sach and So Tay AI support"
  ```
- Deployment đang dùng bởi frontend đã lên version `@23`. Kiểm tra `?action=books` trả `success=True`, `count=10`.
- `clasp run setupSystem` không chạy được vì Apps Script project chưa deploy dưới dạng API executable. Riêng `TU_SACH` đã được tạo/seed qua `seedTuSach()` khi gọi action `books`; nếu cần tạo lại toàn bộ trigger hệ thống thì chạy `setupSystem()` trong Apps Script Editor.

### Cách test thủ công
1. Mở frontend local:
   ```powershell
   cd web
   npm run dev
   ```
2. Kiểm tra bottom nav có 5 mục: `Tin tức`, `Học tập`, `Trợ lý 35`, `Tủ sách`, `Sổ tay AI`.
3. Vào `Học tập`, xác nhận chỉ còn `Video`, `Infographic`, `Kiểm tra`.
4. Vào `Sổ tay AI`, xác nhận danh sách NotebookLM lấy từ `TU_SACH.NotebookLM URL`; bấm `Mở NotebookLM` mở đúng link của tài liệu.

---

## [2026-06-08] Triển khai MVP Tủ sách số AI

### Nội dung thực hiện
- Dùng CodeGraph để xác định entry point liên quan: `web/src/App.jsx`, `web/src/components/BottomNav.jsx`, `web/src/api.js`, `backend/07-main.gs`, `backend/04-sheets-db.gs` và helper Gemini `callGeminiAPI`.
- Thêm module backend [08-tusach.gs](file:///d:/Code/baovenentang/backend/08-tusach.gs) với `getBooks`, `getBookById`, `askBookAI`, `seedTuSach` và 10 tài liệu/văn bản mẫu hợp pháp.
- Cập nhật [04-sheets-db.gs](file:///d:/Code/baovenentang/backend/04-sheets-db.gs) để tạo sheet `TU_SACH`.
- Cập nhật [07-main.gs](file:///d:/Code/baovenentang/backend/07-main.gs) để thêm GET action `books`, `book`, POST action `ask_book` và gọi `seedTuSach()` trong `setupSystem()`.
- Cập nhật frontend React:
  - [api.js](file:///d:/Code/baovenentang/web/src/api.js): thêm helper `getBooks`, `getBookById`, `askBookAI`.
  - [App.jsx](file:///d:/Code/baovenentang/web/src/App.jsx): thêm page lazy `TuSach`.
  - [BottomNav.jsx](file:///d:/Code/baovenentang/web/src/components/BottomNav.jsx): thêm tab `Tủ sách`.
  - [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx): thêm lưới sách, hỏi đáp AI và modal chi tiết.
  - [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): style riêng dùng biến màu hiện có.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md) và [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) vì có thay đổi API/sheet/luồng xử lý.

### Lý do sửa
- Xây dựng bản MVP Tủ sách số theo yêu cầu: có catalog sách, chi tiết từng cuốn, nguồn/NotebookLM và hỏi đáp AI nhẹ bằng tóm tắt thay vì thêm vector DB mới.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp đến route API Apps Script `books`, `book`, `ask_book`, sheet `TU_SACH`, frontend tab `Tủ sách`.
- `ask_book` là endpoint public như `troly35_run`; có validate độ dài input nhưng chưa có phân quyền theo vai trò. Không đưa tài liệu nội bộ nhạy cảm vào `TU_SACH` khi chưa bổ sung auth/policy.
- Hỏi đáp AI chỉ dựa trên tóm tắt và metadata, không thay thế việc tra cứu toàn văn tại nguồn chính thức.

### Kiểm thử đã chạy
- Kiểm tra cú pháp GAS qua stdin vì Node 24 không nhận extension `.gs`:
  ```powershell
  Get-Content -Raw -Encoding UTF8 backend\04-sheets-db.gs | node --check -
  Get-Content -Raw -Encoding UTF8 backend\07-main.gs | node --check -
  Get-Content -Raw -Encoding UTF8 backend\08-tusach.gs | node --check -
  ```
- Build frontend:
  ```powershell
  cd web
  npm run build
  ```

### Cách test thủ công
1. Deploy Apps Script:
   ```powershell
   cd backend
   npx @google/clasp push --force
   ```
2. Trong Apps Script Editor chạy `setupSystem()` để tạo `TU_SACH` và seed 10 tài liệu mẫu.
3. Mở frontend local:
   ```powershell
   cd web
   npm run dev
   ```
4. Vào tab `Tủ sách`, kiểm tra danh sách sách, tìm kiếm, mở chi tiết từng cuốn, bấm link NotebookLM/nguồn.
5. Đặt câu hỏi trong ô AI với một cuốn đang chọn và xác minh response từ `ask_book`.

---

## [2026-06-08] Cài đặt và cấu hình CodeGraph

### Nội dung thực hiện
- Cài đặt công cụ CodeGraph (`@colbymchenry/codegraph`) toàn cục (globally) qua npm.
- Chạy `codegraph install --yes` để cấu hình MCP server cho toàn bộ các tác nhân AI (Claude Code, Cursor, Codex, Gemini, Antigravity).
- Khởi tạo và lập chỉ mục codebase trong dự án bằng lệnh `codegraph init -i`, tạo thành công cơ sở dữ liệu đồ thị codebase với 724 node và 1,072 edge lưu tại thư mục `.codegraph/`.
- Cấu hình tệp tin `.codegraph/.gitignore` để tự động loại bỏ các tệp tin cơ sở dữ liệu đồ thị `.db` khỏi git.
- Cập nhật [AGENTS.md](file:///d:/Code/baovenentang/AGENTS.md) và [CLAUDE.md](file:///d:/Code/baovenentang/CLAUDE.md) quy định bắt buộc sử dụng CodeGraph để phân tích tác động và cấu trúc dự án trước khi sửa code.

### Trạng thái
- **Hoàn thành**: Đã tích hợp và kiểm thử chỉ mục hoạt động bình thường. Đã commit thay đổi với thông điệp: `"chore: integrate CodeGraph tool and guidelines into agents docs"`.

---

## [2026-06-08] Khởi tạo Bộ nhớ Dự án Dùng chung (Shared AI Project Brain)

### Nội dung thực hiện
- Thiết lập hệ thống tài liệu hướng dẫn và lưu trữ ngữ cảnh hoạt động của dự án nhằm đồng bộ thông tin giữa Claude Code và Codex.
- Tạo các file chỉ dẫn ở thư mục gốc:
  - [AGENTS.md](file:///d:/Code/baovenentang/AGENTS.md): Bản hướng dẫn dành cho Codex.
  - [CLAUDE.md](file:///d:/Code/baovenentang/CLAUDE.md): Bản hướng dẫn dành cho Claude Code.
- Khởi tạo thư mục bộ nhớ [docs/brain/](file:///d:/Code/baovenentang/docs/brain) chứa các file tài liệu ngữ cảnh chuyên biệt:
  - [00-project-overview.md](file:///d:/Code/baovenentang/docs/brain/00-project-overview.md): Mục tiêu dự án, đối tượng người dùng chính và phạm vi hoạt động.
  - [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md): Stack công nghệ, sơ đồ luồng dữ liệu và vai trò các thành phần (React frontend, GAS backend, Google Sheets, Gemini AI, Pinecone RAG, Python video module).
  - [02-coding-rules.md](file:///d:/Code/baovenentang/docs/brain/02-coding-rules.md): Quy chuẩn viết code, quy tắc đặt tên hàm/biến (các hàm nội bộ của GAS kết thúc bằng `_`), cách xử lý ký tự kết thúc dòng (CRLF/LF) và bảo mật thông tin (không commit token/key).
  - [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md): Các quyết định kỹ thuật cốt lõi (sử dụng Google Sheets làm CSDL, thiết lập proxy serverless trên Vercel, thuật toán neo câu gốc khi chat đa lượt, giới hạn phong cách phản bác trong mode `rebuttal`).
  - [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): Bản đồ theo dõi tiến độ (liệt kê các tính năng đã hoàn thành, đang triển khai và backlog chờ xử lý).
  - [05-testing-and-deploy.md](file:///d:/Code/baovenentang/docs/brain/05-testing-and-deploy.md): Danh sách lệnh phát triển local, build dự án, deploy bằng clasp và chạy các test suite trên môi trường cloud.

### Trạng thái
- **Hoàn thành**: Đã tạo đầy đủ cấu trúc 9 file theo yêu cầu nghiệp vụ.
- **Tiếp theo**: Đề xuất commit thay đổi này với thông điệp: `"chore: initialize shared AI project brain"`.

---

## [2026-06-08] Cập nhật backlog refactor sau review kiến trúc CodeGraph

### Nội dung thực hiện
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) với checklist bắt buộc trước khi thực hiện các thay đổi code tiếp theo.
- Checklist ghi lại các điểm cần phân tích trước khi sửa: contract API `doGet`/`doPost`, entry point có blast radius lớn, caller/callee, luồng UI/API/database bị ảnh hưởng và cách rollback.
- Bổ sung thứ tự refactor an toàn: frontend API/cache, logic `TroLy35.jsx`, router/auth `07-main.gs`, tách `08-troly35.gs`, tách `11-bantin35.gs`, sau cùng mới xử lý repository Google Sheets/TCCS.
- Bổ sung các việc hardening bảo mật cần làm song song: quản lý endpoint/token/env, `IP_HASH_SALT`, `ADMIN_API_TOKEN`, validate quiz payload, policy public/private endpoint, giới hạn tải ảnh trong video module và kiểm soát SSL verification của `edge-tts`.

### Trạng thái
- **Hoàn thành**: Chỉ cập nhật tài liệu brain, chưa sửa code nguồn.
- **Rủi ro**: Không có thay đổi runtime. Cần lưu ý đây là backlog định hướng, trước khi làm từng task vẫn phải chạy lại CodeGraph và impact analysis theo phạm vi thực tế.
- **Cách kiểm tra**: Đọc lại `docs/brain/04-current-tasks.md` để xác nhận checklist xuất hiện dưới mục backlog.

---

## [2026-06-08] Bổ sung backlog tính năng Tủ sách AI/Sổ tay AI

### Nội dung thực hiện
- Dùng CodeGraph kiểm tra hiện trạng tính năng liên quan đến Tủ sách AI/Sổ tay AI.
- Xác định hiện tại frontend chỉ có `NotebookPanel` trong `web/src/pages/HocTap.jsx`, mở link NotebookLM cố định qua `NOTEBOOK_URL`; chưa có backend/API/sheet/quản trị tài liệu riêng.
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) để bổ sung nhóm task làm rõ phạm vi và thiết kế trước khi code sâu tính năng Tủ sách AI/Sổ tay AI.

### Trạng thái
- **Hoàn thành**: Chỉ cập nhật tài liệu brain, chưa sửa code nguồn.
- **Rủi ro**: Không có thay đổi runtime. Khi triển khai thật cần quyết định rõ giữ liên kết ngoài NotebookLM hay xây dựng tủ sách nội bộ có dữ liệu, API, phân quyền và đồng bộ RAG.
- **Cách kiểm tra**: Đọc lại mục backlog trong `docs/brain/04-current-tasks.md`, xác nhận có nhóm task Tủ sách AI/Sổ tay AI.

---

## [2026-06-11] Commit và gộp tính năng Tủ sách số vào main

### Nội dung thực hiện
- Review toàn bộ working tree (29 file sửa + ~20 untracked) so với main — phát hiện nhánh `codex/tool-codegraph-gs-index` trỏ cùng commit với `main`, tất cả công việc đang ở working tree chưa commit.
- Phân tích code trước khi commit:
  - Xác nhận mọi helper GAS dùng trong `08-tusach.gs` đều có trong `backend/00-utils.gs`, `01-config.gs`, `03-gemini-ai.gs`, `04-sheets-db.gs`.
  - Chạy `npm run build` → pass (19.59s, 0 lỗi/cảnh báo).
  - Kiểm tra `web/api/gas.js`: `IP_HASH_SALT` giờ bắt buộc; `video_export` đã được thêm vào `ADMIN_ACTIONS`.
- Stage có chọn lọc 11 file thuộc tính năng Tủ sách, loại trừ file rác (`vite-dev.log`, `.codegraph/daemon.pid`, `báo cáo.md`) và file chưa quyết định (`BottomNav.jsx`, `video_module/*`).
- Tạo commit `a4e0540` trên nhánh `codex/tool-codegraph-gs-index`.
- Fast-forward `main` → `a4e0540` (không tạo merge commit).
- Push `origin/main` → `a4e0540` (ahead 3 commits, bao gồm 2 commit CodeGraph trước đó).

### File đã thay đổi trong commit a4e0540
- `backend/08-tusach.gs` (tạo mới): module Tủ sách số — `getBooks`, `getBookById`, `askBookAI`, `seedTuSach`, mapping row/object, 10 tài liệu mẫu.
- `backend/04-sheets-db.gs`: thêm header `TU_SACH` (12 cột).
- `backend/07-main.gs`: thêm action GET `books`/`book` + POST `ask_book` (tạm tắt), `seedTuSach()` trong `setupSystem`, cập nhật danh sách endpoint trong response `/`.
- `web/src/pages/TuSach.jsx` (tạo mới): lưới sách + modal chi tiết qua `createPortal`, hỗ trợ prop `embedded`.
- `web/src/cache.js` (tạo mới): tách logic localStorage SWR cache ra module riêng.
- `web/src/css/tusach.css` (tạo mới): style cho Tủ sách.
- `web/src/api.js`: import `cached`/`invalidateCache` từ `cache.js`; thêm `getBooks`, `getBookById`, `askBookAI`; bỏ URL GAS hardcode và `VITE_API_TOKEN`; dev dùng `VITE_GAS_URL`.
- `web/src/App.jsx`: điều chỉnh thứ tự tab (giữ 3 page chính).
- `web/src/main.jsx`: import `css/tusach.css` global.
- `web/src/pages/HocTap.jsx`: thay panel "Sổ tay AI" bằng section Tủ sách (`TuSach embedded`).
- `web/src/index.css`: thêm `body.modal-open { overflow: hidden }`, bỏ `transform`/`filter`/`will-change` trên `.tab-panel.active`.

### Lý do
- Hoàn thành tính năng Tủ sách số: danh mục 10 tài liệu nền tảng, tìm kiếm client-side, modal chi tiết có podcast/sơ đồ tư duy/link NotebookLM.
- Tính năng hỏi đáp AI (`ask_book`) giữ trong backend nhưng tạm tắt ở proxy, chờ quyết định quota riêng.

### Rủi ro và điều kiện vận hành
- **IP_HASH_SALT bắt buộc trên Vercel**: `web/api/gas.js` trả 500 nếu thiếu env này. Phải set trước khi deploy production.
- **Backend chưa deploy**: phải `clasp push` + cập nhật deployment Apps Script + chạy `setupSystem()`/`seedTuSach()` để tạo sheet `TU_SACH` và seed dữ liệu mẫu. Trước khi deploy, `action=books` sẽ báo lỗi "Tủ sách số chưa sẵn sàng trên Apps Script".
- **Dev local**: đặt `VITE_GAS_URL=<Apps Script /exec URL>` trong `.env.local` nếu muốn gọi trực tiếp Apps Script khi dev.

### Kiểm thử đã chạy
- `cd web; npm run build` → pass, 0 lỗi.
- Tất cả helper GAS được xác nhận tồn tại bằng `grep` trước khi commit.
- `git push origin main` → thành công, `4893351..a4e0540`.

### Cách test thủ công
1. Deploy backend GAS mới, chạy `setupSystem()` trong Apps Script UI.
2. Trên Vercel set `IP_HASH_SALT` và redeploy frontend.
3. Mở app → tab `Học tập` → section `Tủ sách`.
4. Xác nhận danh mục 10 tài liệu hiện ra; bấm vào một tài liệu, modal chi tiết bật lên và nằm trong viewport.
5. Thử tìm kiếm theo tên/chủ đề/tác giả.
