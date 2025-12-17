"""
Generate landmarks for an image using MediaPipe Face Mesh
"""
import cv2
import mediapipe as mp
import json
import sys
import os

def generate_landmarks(image_path, output_path):
    """Generate MediaPipe face mesh landmarks for an image"""
    
    # Initialize MediaPipe Face Mesh
    mp_face_mesh = mp.solutions.face_mesh
    
    # Read image
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Could not read image {image_path}")
        return False
    
    # Convert to RGB (MediaPipe uses RGB)
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Process with Face Mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    ) as face_mesh:
        
        results = face_mesh.process(rgb_image)
        
        if not results.multi_face_landmarks:
            print(f"Error: No face detected in {image_path}")
            return False
        
        # Get the first face's landmarks
        face_landmarks = results.multi_face_landmarks[0]
        
        # Convert to pixel coordinates
        h, w = image.shape[:2]
        landmarks = []
        
        for landmark in face_landmarks.landmark:
            x = landmark.x * w
            y = landmark.y * h
            landmarks.append([x, y])
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save as JSON
        with open(output_path, 'w') as f:
            json.dump(landmarks, f)
        
        print(f"Generated {len(landmarks)} landmarks -> {output_path}")
        return True

if __name__ == "__main__":
    # Generate landmarks for diana_new.jpg
    image_path = "assets/female/female_history/diana_new.jpg"
    output_path = "assets/landmarks/female/female_history/diana_new.json"
    
    if len(sys.argv) > 2:
        image_path = sys.argv[1]
        output_path = sys.argv[2]
    
    success = generate_landmarks(image_path, output_path)
    sys.exit(0 if success else 1)
