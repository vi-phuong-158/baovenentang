import os
import re

files_to_modify = [
    r"d:\Code\baovenentang\web\troly35.html",
    r"d:\Code\baovenentang\web\src\pages\TinTuc.jsx",
    r"d:\Code\baovenentang\web\src\index.css",
    r"d:\Code\baovenentang\web\index.html",
    r"d:\Code\baovenentang\web\js\icons.js",
    r"d:\Code\baovenentang\web\js\app.js",
    r"d:\Code\baovenentang\web\banner-widget.html",
    r"d:\Code\baovenentang\web\css\styles.css",
    r"d:\Code\baovenentang\docs\DEPLOY.md",
    r"d:\Code\baovenentang\docs\MARKETING.md",
    r"d:\Code\baovenentang\frontend\prototype-admin.jsx",
    r"d:\Code\baovenentang\docs\SETUP.md",
    r"d:\Code\baovenentang\docs\REVIEW.md",
    r"d:\Code\baovenentang\frontend\index.html",
    r"d:\Code\baovenentang\docs\PLAN.md",
    r"d:\Code\baovenentang\frontend\app.jsx",
    r"d:\Code\baovenentang\docs\ke-hoach-troly35.md",
    r"d:\Code\baovenentang\frontend\prototype-screens.jsx",
    r"d:\Code\baovenentang\frontend\Prototype.html",
    r"d:\Code\baovenentang\frontend\screens-home.jsx",
    r"d:\Code\baovenentang\frontend\shared.jsx",
    r"d:\Code\baovenentang\backend\05-telegram-bot.gs",
    r"d:\Code\baovenentang\backend\06-email-brevo.gs",
    r"d:\Code\baovenentang\backend\07-main.gs",
    r"d:\Code\baovenentang\backend\01-config.gs",
    r"d:\Code\baovenentang\backend\README.md"
]

def replace_in_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace uppercase
    content = content.replace("TRẬN ĐỊA SỐ", "TRỢ LÝ 35")
    
    # Replace title case / normal case
    content = content.replace("Trận Địa Số", "Trợ lý 35")
    content = content.replace("Trận địa số", "Trợ lý 35")

    # Some fallback for url encoded or lowercase if any, but above covers most
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for fp in files_to_modify:
    replace_in_file(fp)

print("Done replacing.")
