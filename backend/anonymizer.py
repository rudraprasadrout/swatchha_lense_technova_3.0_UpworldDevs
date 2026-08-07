import os
import cv2
import numpy as np
import urllib.request

# Path for the model file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)
DB_PATH = os.path.join(BASE_DIR, "swachhlens.db")
MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")


# Auto-download model weights if not present in the current directory
if not os.path.exists(MODEL_PATH):
    print("Downloading YuNet Face Detector weights (~300 KB)...")
    url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    urllib.request.urlretrieve(url, MODEL_PATH)

# Initialize YuNet Face Detector
_detector = cv2.FaceDetectorYN.create(
    model=MODEL_PATH,
    config="",
    input_size=(320, 320),
    score_threshold=0.3,  # Lowered from 0.6 to capture lower contrast / partial faces
    nms_threshold=0.3
)

# License Plate Haar Cascade
_plate_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_russian_plate_number.xml")


def _pixelate_region(img, x, y, w, h, blocks=8, pad_percent=0.2):
    """Obscures the region using heavy pixelation with padding."""
    h_img, w_img, _ = img.shape

    # Expand box by 20% padding to guarantee full coverage
    pad_w = int(w * pad_percent)
    pad_h = int(h * pad_percent)

    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(w_img, x + w + pad_w)
    y2 = min(h_img, y + h + pad_h)

    box_w = x2 - x1
    box_h = y2 - y1

    roi = img[y1:y2, x1:x2]
    if roi.size == 0:
        return

    # Shrink down region and scale back up
    pixel_w = max(1, box_w // blocks)
    pixel_h = max(1, box_h // blocks)
    small = cv2.resize(roi, (pixel_w, pixel_h), interpolation=cv2.INTER_LINEAR)
    blurred = cv2.resize(small, (box_w, box_h), interpolation=cv2.INTER_NEAREST)

    img[y1:y2, x1:x2] = blurred


def anonymize_image_bytes(image_bytes: bytes):
    """
    Returns (jpeg_bytes, faces_blurred_count, plates_blurred_count)
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes, 0, 0

    h_img, w_img, _ = img.shape
    faces_count = 0
    plates_count = 0

    # 1. Face Detection with YuNet
    _detector.setInputSize((w_img, h_img))
    _, faces = _detector.detect(img)

    if faces is not None:
        for face in faces:
            x, y, w, h = map(int, face[:4])
            _pixelate_region(img, x, y, w, h)
            faces_count += 1

    # 2. License Plate Detection
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    plates = _plate_cascade.detectMultiScale(
        gray, scaleFactor=1.03, minNeighbors=3, minSize=(30, 10)
    )

    for (x, y, w, h) in plates:
        _pixelate_region(img, x, y, w, h)
        plates_count += 1

    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    out_bytes = buf.tobytes() if ok else image_bytes
    return out_bytes, faces_count, plates_count