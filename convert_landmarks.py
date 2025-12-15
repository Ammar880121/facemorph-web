"""
Convert numpy landmark files (.npy) to JSON format for web use
"""
import os
import json
import numpy as np

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANDMARKS_SRC = os.path.join(BASE_DIR, "assets", "landmarks")
LANDMARKS_DST = os.path.join(BASE_DIR, "web", "assets", "landmarks")

def convert_landmarks():
    """Convert all .npy landmark files to .json format"""
    
    if not os.path.exists(LANDMARKS_SRC):
        print(f"Source directory not found: {LANDMARKS_SRC}")
        return
    
    converted = 0
    
    for category in os.listdir(LANDMARKS_SRC):
        cat_src = os.path.join(LANDMARKS_SRC, category)
        cat_dst = os.path.join(LANDMARKS_DST, category)
        
        if not os.path.isdir(cat_src):
            continue
        
        # Create destination directory
        os.makedirs(cat_dst, exist_ok=True)
        
        for filename in os.listdir(cat_src):
            if not filename.endswith('.npy'):
                continue
            
            src_path = os.path.join(cat_src, filename)
            dst_path = os.path.join(cat_dst, filename.replace('.npy', '.json'))
            
            try:
                # Load numpy array
                landmarks = np.load(src_path)
                
                # Convert to list of [x, y] coordinates
                points = landmarks.tolist()
                
                # Save as JSON
                with open(dst_path, 'w') as f:
                    json.dump(points, f)
                
                print(f"Converted: {category}/{filename} -> {os.path.basename(dst_path)}")
                converted += 1
                
            except Exception as e:
                print(f"Error converting {src_path}: {e}")
    
    print(f"\nTotal converted: {converted} files")

if __name__ == "__main__":
    convert_landmarks()
