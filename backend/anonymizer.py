import os
import cv2
import numpy as np
import urllib.request

# paths for the face detection model weights
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)
DB_PATH = os.path.join(BASE_DIR, "swachhlens.db")
MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")


# download the yunet model if it's not already there (~300KB, pretty small)
if not os.path.exists(MODEL_PATH):
    try:
        print("Downloading YuNet Face Detector weights (~300 KB)...")
        url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
        urllib.request.urlretrieve(url, MODEL_PATH)
    except Exception as e:
        print(f"Notice: Model weight download exception: {e}")

# set up the face detector - might not work on all opencv builds
_detector = None
try:
    if hasattr(cv2, "FaceDetectorYN") and os.path.exists(MODEL_PATH):
        _detector = cv2.FaceDetectorYN.create(
            model=MODEL_PATH,
            config="",
            input_size=(320, 320),
            score_threshold=0.3,
            nms_threshold=0.3
        )
except Exception as e:
    print(f"Notice: YuNet FaceDetectorYN initialization exception: {e}")

# haar cascade for license plates - built into opencv so no download needed
_plate_cascade = None
try:
    if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
        cascade_path = cv2.data.haarcascades + "haarcascade_russian_plate_number.xml"
        _plate_cascade = cv2.CascadeClassifier(cascade_path)
except Exception as e:
    print(f"Notice: CascadeClassifier initialization exception: {e}")


def _pixelate_region(img, x, y, w, h, blocks=8, pad_percent=0.2):
    """Heavy pixelation on a region of the image. We add some padding around
    the detected area so we don't miss edges of faces/plates."""
    h_img, w_img, _ = img.shape

    # expand the box by 20% on each side to be safe
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

    # shrink way down then scale back up = pixelation effect
    pixel_w = max(1, box_w // blocks)
    pixel_h = max(1, box_h // blocks)
    small = cv2.resize(roi, (pixel_w, pixel_h), interpolation=cv2.INTER_LINEAR)
    blurred = cv2.resize(small, (box_w, box_h), interpolation=cv2.INTER_NEAREST)

    img[y1:y2, x1:x2] = blurred


def anonymize_image_bytes(image_bytes: bytes):
    """
    Takes raw image bytes, detects faces and license plates, pixelates them,
    and returns the anonymized jpeg bytes along with counts of what was blurred.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes, 0, 0

    h_img, w_img, _ = img.shape
    
    # Resize if too large to prevent OOM during model inference
    MAX_DIM = 1024
    if max(h_img, w_img) > MAX_DIM:
        scale = MAX_DIM / max(h_img, w_img)
        new_w = int(w_img * scale)
        new_h = int(h_img * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        h_img, w_img = new_h, new_w
    faces_count = 0
    plates_count = 0

    # run face detection
    if _detector is not None:
        try:
            _detector.setInputSize((w_img, h_img))
            _, faces = _detector.detect(img)
            if faces is not None:
                for face in faces:
                    x, y, w, h = map(int, face[:4])
                    _pixelate_region(img, x, y, w, h)
                    faces_count += 1
        except Exception as e:
            print(f"Notice: Face detection execution exception: {e}")

    # run plate detection
    if _plate_cascade is not None and not _plate_cascade.empty():
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)
            plates = _plate_cascade.detectMultiScale(
                gray, scaleFactor=1.03, minNeighbors=3, minSize=(30, 10)
            )
            if plates is not None:
                for (x, y, w, h) in plates:
                    _pixelate_region(img, x, y, w, h)
                    plates_count += 1
        except Exception as e:
            print(f"Notice: Plate detection execution exception: {e}")

    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    out_bytes = buf.tobytes() if ok else image_bytes
    return out_bytes, faces_count, plates_count