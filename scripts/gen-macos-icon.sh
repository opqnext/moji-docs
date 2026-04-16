#!/bin/bash
#
# macOS 应用图标生成工具
#
# 输入：1024x1024 像素的直角方图 PNG（无圆角、无透明边距）
# 输出：符合 Apple Human Interface Guidelines 的 icon.png + icon.icns
#
# 用法：./scripts/gen-macos-icon.sh <输入图片.png> [输出目录]
# 示例：./scripts/gen-macos-icon.sh raw-icon.png assets/
#
# 自动处理：
#   1. 缩放到 824x824（macOS 图标内容区域尺寸）
#   2. 应用 macOS 风格圆角（radius ≈ 22.5%）
#   3. 居中放置到 1024x1024 画布（四周 100px 透明 padding）
#   4. 生成包含 16~1024 全部 10 种尺寸的 .icns 文件
#
# 依赖：python3、sips、iconutil（macOS 自带）

set -euo pipefail

INPUT="${1:-}"
OUTPUT_DIR="${2:-.}"

if [ -z "$INPUT" ] || [ ! -f "$INPUT" ]; then
  echo "用法: $0 <1024x1024-方图.png> [输出目录]"
  echo ""
  echo "示例: $0 raw-icon.png assets/"
  echo ""
  echo "输入要求: 1024x1024 像素的正方形 PNG，不需要圆角，不需要 padding"
  exit 1
fi

WIDTH=$(sips -g pixelWidth "$INPUT" 2>/dev/null | tail -1 | awk '{print $2}')
HEIGHT=$(sips -g pixelHeight "$INPUT" 2>/dev/null | tail -1 | awk '{print $2}')

if [ "$WIDTH" != "1024" ] || [ "$HEIGHT" != "1024" ]; then
  echo "错误: 输入图片必须是 1024x1024 像素，当前为 ${WIDTH}x${HEIGHT}"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo ">>> 创建 Python 虚拟环境并安装 Pillow..."
python3 -m venv "$TMPDIR/venv" 2>/dev/null
source "$TMPDIR/venv/bin/activate"
pip install Pillow -q 2>/dev/null

echo ">>> 生成带圆角 + padding 的 icon.png..."

python3 - "$INPUT" "$OUTPUT_DIR" << 'PYEOF'
import sys, os, math
from PIL import Image, ImageDraw

input_path = sys.argv[1]
output_dir = sys.argv[2]

CONTENT_SIZE = 824
CANVAS_SIZE = 1024
PADDING = (CANVAS_SIZE - CONTENT_SIZE) // 2
CORNER_RADIUS = 185

img = Image.open(input_path).convert('RGBA')
img = img.resize((CONTENT_SIZE, CONTENT_SIZE), Image.LANCZOS)

mask = Image.new('L', (CONTENT_SIZE, CONTENT_SIZE), 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle(
    [(0, 0), (CONTENT_SIZE - 1, CONTENT_SIZE - 1)],
    radius=CORNER_RADIUS,
    fill=255
)

masked = Image.new('RGBA', (CONTENT_SIZE, CONTENT_SIZE), (0, 0, 0, 0))
masked.paste(img, (0, 0), mask)

canvas = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
canvas.paste(masked, (PADDING, PADDING), masked)

out_path = os.path.join(output_dir, 'icon.png')
canvas.save(out_path)
print(f"    icon.png -> {out_path} ({CANVAS_SIZE}x{CANVAS_SIZE})")
PYEOF

deactivate

echo ">>> 生成 iconset（10 种尺寸）..."

ICONSET="$TMPDIR/icon.iconset"
mkdir -p "$ICONSET"

ICON_PNG="$OUTPUT_DIR/icon.png"

sips -z 16   16   "$ICON_PNG" --out "$ICONSET/icon_16x16.png"      >/dev/null 2>&1
sips -z 32   32   "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png"   >/dev/null 2>&1
sips -z 32   32   "$ICON_PNG" --out "$ICONSET/icon_32x32.png"      >/dev/null 2>&1
sips -z 64   64   "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png"   >/dev/null 2>&1
sips -z 128  128  "$ICON_PNG" --out "$ICONSET/icon_128x128.png"    >/dev/null 2>&1
sips -z 256  256  "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null 2>&1
sips -z 256  256  "$ICON_PNG" --out "$ICONSET/icon_256x256.png"    >/dev/null 2>&1
sips -z 512  512  "$ICON_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null 2>&1
sips -z 512  512  "$ICON_PNG" --out "$ICONSET/icon_512x512.png"    >/dev/null 2>&1
cp "$ICON_PNG" "$ICONSET/icon_512x512@2x.png"

for f in "$ICONSET"/*@2x.png; do
  sips -s dpiWidth 144 -s dpiHeight 144 "$f" >/dev/null 2>&1
done

echo ">>> 生成 icon.icns..."
iconutil -c icns "$ICONSET" -o "$OUTPUT_DIR/icon.icns"

echo ""
echo "=== 完成 ==="
echo "  icon.png  : $OUTPUT_DIR/icon.png  (1024x1024, 带圆角+padding)"
echo "  icon.icns : $OUTPUT_DIR/icon.icns (含 16~1024 全部尺寸)"
echo ""
echo "macOS 图标规范:"
echo "  画布: 1024x1024 | 内容区: 824x824 | 边距: 100px | 圆角: 185px"
