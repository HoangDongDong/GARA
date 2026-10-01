"""
Download YOLOv8 model for Vietnamese license plate detection
Source: https://github.com/trungdinh22/License-Plate-Recognition
"""
import os, urllib.request
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Model YOLOv8 detect bien so Viet Nam (pretrained weights)
# Alternative: dung yolov8n.pt general + fine-tune
MODEL_URL = "https://github.com/ultralytics/assets/releases/download/v8.1.0/yolov8n.pt"
MODEL_DEST = MODELS_DIR / "yolov8_plate.pt"

if MODEL_DEST.exists():
    print(f"Model already exists: {MODEL_DEST}")
else:
    print(f"Downloading YOLOv8n from: {MODEL_URL}")
    print("Note: For best Vietnam plate accuracy, replace with fine-tuned model")
    urllib.request.urlretrieve(MODEL_URL, MODEL_DEST,
        reporthook=lambda b,bs,t: print(f"\r  {min(b*bs,t)//1024}KB / {t//1024}KB", end="", flush=True))
    print(f"\nSaved to: {MODEL_DEST}")

print("\nModel ready. Fine-tune tips:")
print("  1. Download: https://github.com/trungdinh22/License-Plate-Recognition")
print("  2. Use provided yolov8 weights in models/ directory")
print("  3. Replace yolov8_plate.pt with the Vietnam-specific model")
