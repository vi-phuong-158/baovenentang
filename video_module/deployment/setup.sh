#!/usr/bin/env bash
# Cài đặt systemd timer cho video module Trợ lý 35.
# Chạy: sudo bash deployment/setup.sh
# Yêu cầu: Ubuntu/Debian, Python 3.11+, đã có .venv trong video_module/

set -euo pipefail

UNIT_DIR="/etc/systemd/system"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Cài đặt Trợ lý 35 Video Module ==="
echo "Module dir: $MODULE_DIR"

# 1. Tạo virtualenv nếu chưa có
if [ ! -f "$MODULE_DIR/.venv/bin/python" ]; then
    echo "[1/4] Tạo virtualenv..."
    python3 -m venv "$MODULE_DIR/.venv"
    "$MODULE_DIR/.venv/bin/pip" install -q -r "$MODULE_DIR/requirements.txt"
else
    echo "[1/4] Virtualenv đã có."
fi

# 2. Copy service + timer vào systemd
echo "[2/4] Cài systemd units..."
cp "$SCRIPT_DIR/troly35-video.service" "$UNIT_DIR/"
cp "$SCRIPT_DIR/troly35-video.timer"   "$UNIT_DIR/"

# Thay đường dẫn placeholder bằng đường dẫn thật
sed -i "s|/home/ubuntu/baovenentang|$MODULE_DIR/..|g" "$UNIT_DIR/troly35-video.service"

# 3. Reload và enable timer
echo "[3/4] Kích hoạt timer..."
systemctl daemon-reload
systemctl enable --now troly35-video.timer

# 4. Kiểm tra
echo "[4/4] Trạng thái:"
systemctl status troly35-video.timer --no-pager || true
systemctl list-timers troly35-video.timer --no-pager || true

echo ""
echo "✅ Hoàn tất. Timer sẽ kích hoạt lúc 7:30 sáng mỗi ngày."
echo "   Xem log: journalctl -u troly35-video -f"
echo "   Chạy thử ngay: systemctl start troly35-video"
