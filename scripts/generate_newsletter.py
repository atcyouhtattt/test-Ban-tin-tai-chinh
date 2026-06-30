"""
generate_newsletter.py
Gọi Claude API để tổng hợp dữ liệu thô (raw_sources.txt) thành một bản tin
HTML hoàn chỉnh, theo đúng cấu trúc/văn phong của file mẫu.

Yêu cầu biến môi trường: ANTHROPIC_API_KEY

Chạy:
    python3 fetch_sources.py > raw_sources.txt
    python3 generate_newsletter.py
"""

import os
import sys
import subprocess
from datetime import datetime, timezone, timedelta

import google.generativeai as genai

# Dùng mô hình Gemini 1.5 Flash vì nó nhanh và có sẵn rộng rãi nhất
MODEL = "gemini-1.5-flash"

# Giờ Việt Nam (UTC+7) — vì GitHub Actions chạy theo giờ UTC
VN_TZ = timezone(timedelta(hours=7))


SYSTEM_PROMPT = """Bạn là một agent tổng hợp tin tức tài chính, chuyên viết "Bản tin TTCK" hằng ngày
bằng tiếng Việt, theo đúng văn phong và cấu trúc của một bản tin chuyên nghiệp dạng research note.

NHIỆM VỤ: Từ danh sách tin tức thô được cung cấp (đã gom theo nhóm chủ đề), hãy viết một bản tin
dưới định dạng JSON có cấu trúc (structured JSON), độc lập, chuyên nghiệp.

YÊU CẦU NỘI DUNG VÀ VĂN PHONG:
- Ngắn gọn, số liệu cụ thể, khách quan, đúng kiểu phân tích thị trường.
- Mỗi nhận định quan trọng nên có một dòng "→ VN: ..." hoặc "→ Tác động: ..." diễn giải ý nghĩa.
- LUÔN có disclaimer: "Đánh giá của desk cân bằng cả 2 phía, không thiên lệch, không phải khuyến nghị giao dịch."
- CHỈ dùng thông tin có trong dữ liệu được cung cấp. KHÔNG bịa số liệu.

CẤU TRÚC JSON YÊU CẦU:
Trả về DUY NHẤT một object JSON có định dạng sau, KHÔNG bọc trong markdown code block (như ```json):
{
  "title": "Tiêu đề bản tin (ngắn gọn, bắt thời sự)",
  "summary": "Tóm tắt mở đầu (3-5 câu)",
  "metrics": [
    { "label": "Chỉ số (VD: VN-Index, S&P 500, Vàng)", "value": "Giá trị/Điểm số", "trend": "up" hoặc "down" hoặc "neutral" }
  ],
  "sections": [
    {
      "id": "01",
      "title": "Qua đêm — toàn cầu",
      "content": "Nội dung chi tiết (viết bằng Markdown, có thể dùng bullet points, in đậm...)"
    },
    ... (thêm các section khác như: Vàng & Hàng hóa, Crypto, Vĩ mô, Bất động sản, Trong nước, Góc nhìn & chiến lược)
  ],
  "sources": [
    { "name": "Tên nguồn", "title": "Tiêu đề bài viết", "url": "Link bài viết" }
  ]
}

LƯU Ý: 
- Content của mỗi section dùng định dạng Markdown.
- Hãy viết SÚC TÍCH ở từng mục để đảm bảo trả về ĐẦY ĐỦ JSON hợp lệ, không bị cắt giữa chừng.
- Đảm bảo output là một valid JSON.
"""


MAX_TOKENS = 28000
MAX_CONTINUATIONS = 4  # số lần tối đa cho phép "viết tiếp" nếu bị cắt giữa chừng


def call_gemini(user_content: str, api_key: str) -> str:
    """Gọi Google Gemini API để sinh JSON sử dụng SDK chính thức"""
    genai.configure(api_key=api_key)
    
    try:
        model = genai.GenerativeModel(
            model_name=MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        response = model.generate_content(user_content)
        return response.text.strip()
    except Exception as e:
        print("Lỗi gọi Gemini API qua SDK:", str(e), file=sys.stderr)
        raise e


def clean_json(text: str) -> str:
    """Phòng trường hợp model lỡ bọc trong ```json ... ```"""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        if t.endswith("```"):
            t = t.rsplit("```", 1)[0]
    return t.strip()


import json

def update_index(output_dir: str, date_str: str, title: str):
    """Cập nhật/tạo file entries.json liệt kê tất cả bản tin theo ngày, mới nhất lên đầu."""
    import os
    index_path = os.path.join(output_dir, "entries.json")
    entries = []

    if os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                entries = json.load(f)
        except Exception:
            pass
            
    # Lọc bỏ ngày hiện tại để cập nhật mới
    entries = [e for e in entries if e.get("id") != date_str]

    entries.insert(0, {"id": date_str, "title": title})

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("LỖI: thiếu biến môi trường GEMINI_API_KEY", file=sys.stderr)
        sys.exit(1)

    raw_path = "raw_sources.txt"
    if not os.path.exists(raw_path):
        print(f"LỖI: không tìm thấy {raw_path}. Hãy chạy fetch_sources.py trước.", file=sys.stderr)
        sys.exit(1)

    with open(raw_path, "r", encoding="utf-8") as f:
        raw_data = f.read()

    now_vn = datetime.now(VN_TZ)
    date_str = now_vn.strftime("%Y-%m-%d")
    date_human = now_vn.strftime("%d.%m.%Y")

    user_content = f"""Hôm nay là {date_human} (giờ Việt Nam). Dưới đây là dữ liệu tin tức thô đã
gom theo nhóm chủ đề (chứng khoán VN, thế giới, vàng & hàng hóa, crypto, vĩ mô & thời sự,
bất động sản). Hãy viết bản tin JSON hoàn chỉnh theo đúng định dạng trong system prompt.

Tiêu đề bản tin nên là một câu ngắn bắt thời sự nhất trong ngày (giống kiểu
"Vingroup đè chỉ số, thế giới lập kỷ lục mới"), tự đặt dựa trên tin nổi bật nhất.

=== DỮ LIỆU THÔ ===
{raw_data}
"""

    print("Đang gọi Google Gemini API để tổng hợp bản tin...", flush=True)
    json_text = call_gemini(user_content, api_key)
    json_text = clean_json(json_text)

    output_dir = "webapp/public/data"
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, f"{date_str}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(json_text)
    print(f"Đã lưu bản tin: {out_path}", flush=True)

    # cố gắng lấy title để hiển thị trong index
    title = date_str
    try:
        data_obj = json.loads(json_text)
        if "title" in data_obj:
            title = data_obj["title"]
    except Exception:
        pass

    update_index(output_dir, date_str, title)
    print("Đã cập nhật entries.json", flush=True)


if __name__ == "__main__":
    main()
