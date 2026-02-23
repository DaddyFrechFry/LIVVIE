import os
from pathlib import Path

import cv2
import mediapipe as mp


_FACE_BACKEND = None
_FACE_MESH = None
_FACE_LANDMARKER = None
_SETUP_ERROR = None
_WARNED_ONCE = False


def _select_model_path():
    env_model = os.getenv("FACE_LANDMARKER_MODEL_PATH", "").strip()
    candidates = [
        env_model,
        "face_landmarker.task",
        "face_landmarker_v2_with_blendshapes.task",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    return None


def _setup_backend():
    global _FACE_BACKEND, _FACE_MESH, _FACE_LANDMARKER, _SETUP_ERROR
    if _FACE_BACKEND is not None or _SETUP_ERROR is not None:
        return

    try:
        if hasattr(mp, "solutions"):
            mp_face_mesh = mp.solutions.face_mesh
            _FACE_MESH = mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                min_detection_confidence=0.5,
            )
            _FACE_BACKEND = "solutions"
            return

        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision as mp_vision

        model_path = _select_model_path()
        if not model_path:
            _SETUP_ERROR = (
                "No face landmarker model found. Add face_landmarker.task in the project "
                "folder or set FACE_LANDMARKER_MODEL_PATH."
            )
            return

        options = mp_vision.FaceLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=model_path),
            running_mode=mp_vision.RunningMode.IMAGE,
            num_faces=1,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        _FACE_LANDMARKER = mp_vision.FaceLandmarker.create_from_options(options)
        _FACE_BACKEND = "tasks"
    except Exception as e:
        _SETUP_ERROR = str(e)


def _is_smiling(landmarks):
    mouth_bottom = landmarks[14].y
    mouth_left = landmarks[61].y
    mouth_right = landmarks[291].y
    return mouth_left < mouth_bottom - 0.01 and mouth_right < mouth_bottom - 0.01


def check_emotion():
    global _WARNED_ONCE
    _setup_backend()

    if _FACE_BACKEND is None:
        if not _WARNED_ONCE and _SETUP_ERROR:
            print(f"face_logic disabled: {_SETUP_ERROR}")
            _WARNED_ONCE = True
        return "neutral"

    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return "neutral"

    try:
        if _FACE_BACKEND == "solutions":
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = _FACE_MESH.process(rgb_frame)
            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                if _is_smiling(landmarks):
                    return "smiling"
            return "neutral"

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = _FACE_LANDMARKER.detect(mp_image)
        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            if _is_smiling(landmarks):
                return "smiling"
        return "neutral"
    except Exception:
        return "neutral"
