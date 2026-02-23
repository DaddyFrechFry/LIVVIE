from ultralytics import YOLO
import cv2

def see_and_identify():
    # Load the model only when the function is called to avoid import delays
    model = YOLO('yolov8n.pt') 
    
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    if ret:
        results = model(frame)
        # Extract the names of objects detected with > 50% confidence
        found_objects = []
        for r in results:
            for c in r.boxes.cls:
                found_objects.append(model.names[int(c)])
        
        cap.release()
        return list(set(found_objects)) # Return unique objects
    cap.release()
    return []