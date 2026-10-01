"""
Garage License Plate Recognition Service
Based on trungdinh22/License-Plate-Recognition
Models:
  - LP_detector_nano_61.pt (detect vi tri bien so)
  - LP_ocr_nano_62.pt      (nhan dien ky tu tung so/chu tren bien)
Endpoints:
  GET  /
  GET  /api/ocr/health
  POST /api/ocr/plate
  POST /api/ocr/plate-base64
Port: 5050
"""
import os, sys, re, io, time, base64, logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import cv2
import torch

BASE_DIR = Path(__file__).parent.resolve()
sys.path.append(str(BASE_DIR))

import function.helper as helper
import function.utils_rotate as utils_rotate

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])

LOCAL_YOLOV5 = BASE_DIR / "yolov5"
YOLOV5_DIR = str(LOCAL_YOLOV5) if LOCAL_YOLOV5.exists() else r"C:\Users\acer\.cache\torch\hub\ultralytics_yolov5_master"
DET_MODEL = BASE_DIR / "models" / "LP_detector_nano_61.pt"
OCR_MODEL = BASE_DIR / "models" / "LP_ocr_nano_62.pt"

_det_model = None
_ocr_model = None

def get_models():
    global _det_model, _ocr_model
    if _det_model is None or _ocr_model is None:
        log.info("Loading YOLO models from %s...", YOLOV5_DIR)
        _det_model = torch.hub.load(YOLOV5_DIR, 'custom', path=str(DET_MODEL), source='local')
        _ocr_model = torch.hub.load(YOLOV5_DIR, 'custom', path=str(OCR_MODEL), source='local')
        _ocr_model.conf = 0.50
        log.info("YOLO models loaded successfully.")
    return _det_model, _ocr_model

def normalize_plate(raw):
    if not raw or raw == "unknown":
        return None
    s = re.sub(r'[^A-Z0-9]', '', raw.upper())
    # Format: 60A99999 -> 60A-999.99 hoac 51F12345 -> 51F-123.45
    m = re.match(r'^([0-9]{2})([A-Z]{1,2})([0-9]{4,5})$', s)
    if m:
        prefix, letters, digits = m.groups()
        if len(digits) == 5:
            return f"{prefix}{letters}-{digits[:3]}.{digits[3:]}"
        else:
            return f"{prefix}{letters}-{digits}"
    return s

def process_cv2_image(img_bgr):
    t0 = time.time()
    det_model, ocr_model = get_models()

    plates = det_model(img_bgr, size=640)
    list_plates = plates.pandas().xyxy[0].values.tolist()
    log.info("Detected %d candidate plates", len(list_plates))

    best_plate = None
    raw_plates = []

    if len(list_plates) == 0:
        # Neu YOLO khong crop duoc box rieng, thu doc truc tiep tren toan anh
        lp = helper.read_plate(ocr_model, img_bgr)
        if lp and lp != "unknown":
            raw_plates.append(lp)
            best_plate = lp
    else:
        for p in list_plates:
            x = max(0, int(p[0]))
            y = max(0, int(p[1]))
            w = max(1, int(p[2] - p[0]))
            h = max(1, int(p[3] - p[1]))
            crop = img_bgr[y:y+h, x:x+w]

            # 1. Thu doc anh goc crop
            lp = helper.read_plate(ocr_model, crop)
            if lp and lp != "unknown":
                raw_plates.append(lp)
                best_plate = lp
                break

            # 2. Thu deskew xoay goc neu doc truc tiep chua ra
            found = False
            for cc in range(0, 2):
                for ct in range(0, 2):
                    try:
                        deskewed = utils_rotate.deskew(crop, cc, ct)
                        lp = helper.read_plate(ocr_model, deskewed)
                        if lp and lp != "unknown":
                            raw_plates.append(lp)
                            best_plate = lp
                            found = True
                            break
                    except Exception as e:
                        pass
                if found:
                    break

    norm = normalize_plate(best_plate)
    elapsed = round(time.time() - t0, 3)
    log.info("OCR Result: %r -> %r in %.3fs", best_plate, norm, elapsed)

    return {
        "plate": norm or best_plate,
        "raw_plate": best_plate,
        "candidates": raw_plates,
        "plates_detected": len(list_plates),
        "elapsed_s": elapsed
    }

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "service": "Garage License Plate Recognition Service",
        "engine": "YOLOv5 Vietnam Plate Detection + Character Recognition (trungdinh22)",
        "version": "3.0",
        "endpoints": {
            "health": "GET /api/ocr/health",
            "ocr_file": "POST /api/ocr/plate",
            "ocr_base64": "POST /api/ocr/plate-base64"
        }
    })

@app.route("/api/ocr/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "service": "garage-plate-ocr",
        "engine": "trungdinh22-yolo",
        "models": {
            "detector": DET_MODEL.name,
            "ocr": OCR_MODEL.name
        }
    })

@app.route("/api/ocr/plate", methods=["POST"])
def ocr_file():
    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400
    try:
        file_bytes = np.frombuffer(request.files["file"].read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Invalid image format"}), 400
        return jsonify(process_cv2_image(img))
    except Exception as e:
        log.exception("ocr_file error")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ocr/plate-base64", methods=["POST"])
def ocr_b64():
    body = request.get_json(force=True) or {}
    b64 = body.get("image", "")
    if not b64:
        return jsonify({"error": "Missing image"}), 400
    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        raw_data = base64.b64decode(b64)
        file_bytes = np.frombuffer(raw_data, np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Invalid image data"}), 400
        return jsonify(process_cv2_image(img))
    except Exception as e:
        log.exception("ocr_b64 error")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    log.info("Pre-loading models...")
    get_models()
    log.info("Starting Garage Plate OCR on port %d...", port)
    app.run(host="0.0.0.0", port=port, debug=False)
