/**
 * Manual Landmark Editor for Animal Faces
 * Allows clicking to place 8 key landmarks that get interpolated to 478 points
 */

class LandmarkEditor {
    constructor() {
        // Key landmarks to place manually (8 points)
        this.keyLandmarks = [
            { name: 'Left Eye', color: '#3498db', index: 33 },
            { name: 'Right Eye', color: '#3498db', index: 263 },
            { name: 'Nose Tip', color: '#e74c3c', index: 1 },
            { name: 'Mouth Left', color: '#9b59b6', index: 61 },
            { name: 'Mouth Right', color: '#9b59b6', index: 291 },
            { name: 'Chin', color: '#f39c12', index: 152 },
            { name: 'Left Cheek', color: '#1abc9c', index: 234 },
            { name: 'Right Cheek', color: '#1abc9c', index: 454 }
        ];

        // Animals available for editing
        this.animals = [
            { name: 'Tiger', image: 'assets/animals/Tiger.jpeg' },
            { name: 'Dog', image: 'assets/animals/Dog_sym.png' },
            { name: 'Batrik', image: 'assets/animals/Batrik_sym.png' },
            { name: 'Chimp', image: 'assets/animals/Chimp_sym.png' },
            { name: 'Sloth', image: 'assets/animals/Sloth.png' },
            { name: 'Panda', image: 'assets/animals/Panda.png' }
        ];

        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.currentAnimal = null;
        this.currentImage = null;
        this.placedPoints = [];
        this.currentPointIndex = 0;

        this.init();
    }

    init() {
        this.renderAnimalList();
        this.renderLandmarkList();
        this.setupEventListeners();
        this.updateStatus('Select an animal to start');
    }

    renderAnimalList() {
        const list = document.getElementById('animalList');
        list.innerHTML = this.animals.map((animal, i) => `
            <button class="animal-btn" data-index="${i}">
                <img src="${animal.image}" alt="${animal.name}">
                <span>${animal.name}</span>
            </button>
        `).join('');
    }

    renderLandmarkList() {
        const list = document.getElementById('landmarkList');
        list.innerHTML = this.keyLandmarks.map((lm, i) => `
            <div class="landmark-item ${i === this.currentPointIndex ? 'active' : ''} ${this.placedPoints[i] ? 'placed' : ''}" data-index="${i}">
                <div class="landmark-dot" style="background: ${lm.color}"></div>
                <span>${i + 1}. ${lm.name}</span>
                ${this.placedPoints[i] ? '<span style="color:#2ecc71">✓</span>' : ''}
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Animal selection
        document.getElementById('animalList').addEventListener('click', (e) => {
            const btn = e.target.closest('.animal-btn');
            if (btn) {
                const index = parseInt(btn.dataset.index);
                this.loadAnimal(index);
            }
        });

        // Canvas click
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Buttons
        document.getElementById('resetBtn').addEventListener('click', () => this.resetPoints());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveLandmarks());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadJSON());
    }

    loadAnimal(index) {
        this.currentAnimal = this.animals[index];
        this.resetPoints();

        // Update active state
        document.querySelectorAll('.animal-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.currentImage = img;

            // Set canvas size
            const maxSize = 600;
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            this.canvas.width = img.width * scale;
            this.canvas.height = img.height * scale;
            this.scale = scale;
            this.originalWidth = img.width;
            this.originalHeight = img.height;

            this.drawCanvas();
            this.updateStatus(`Click to place: ${this.keyLandmarks[0].name}`);
        };
        img.src = this.currentAnimal.image;
    }

    handleCanvasClick(e) {
        if (!this.currentImage || this.currentPointIndex >= this.keyLandmarks.length) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        // Store the point in original image coordinates
        this.placedPoints[this.currentPointIndex] = { x, y };
        this.currentPointIndex++;

        this.drawCanvas();
        this.renderLandmarkList();

        if (this.currentPointIndex < this.keyLandmarks.length) {
            this.updateStatus(`Click to place: ${this.keyLandmarks[this.currentPointIndex].name}`);
        } else {
            this.updateStatus('All points placed! Click Save Landmarks');
        }
    }

    drawCanvas() {
        if (!this.currentImage) return;

        // Clear and draw image
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0, this.canvas.width, this.canvas.height);

        // Draw placed points
        this.placedPoints.forEach((point, i) => {
            if (!point) return;

            const x = point.x * this.scale;
            const y = point.y * this.scale;
            const lm = this.keyLandmarks[i];

            // Draw circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = lm.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText(i + 1, x - 4, y + 4);
        });

        // Draw next point indicator if hovering
        if (this.currentPointIndex < this.keyLandmarks.length) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`Next: ${this.keyLandmarks[this.currentPointIndex].name}`, 10, 20);
        }
    }

    resetPoints() {
        this.placedPoints = [];
        this.currentPointIndex = 0;
        this.drawCanvas();
        this.renderLandmarkList();
        if (this.currentAnimal) {
            this.updateStatus(`Click to place: ${this.keyLandmarks[0].name}`);
        }
    }

    /**
     * Interpolate 8 key points to 478 landmarks
     * This creates a full landmark set by positioning points relative to the key landmarks
     */
    interpolateLandmarks() {
        if (this.placedPoints.length < 8) {
            alert('Please place all 8 landmarks first!');
            return null;
        }

        const [leftEye, rightEye, nose, mouthL, mouthR, chin, leftCheek, rightCheek] = this.placedPoints;

        // Calculate face metrics
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };
        const eyeWidth = Math.abs(rightEye.x - leftEye.x);
        const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
        const faceHeight = Math.abs(chin.y - eyeCenter.y) * 2;

        // Generate 478 landmarks by interpolation
        const landmarks = [];

        for (let i = 0; i < 478; i++) {
            let point;

            // Map key indices to placed points
            if (i === 33 || (i >= 33 && i <= 38)) {
                // Left eye region
                point = this.interpolateRegion(leftEye, eyeWidth * 0.15, i - 33, 6);
            } else if (i === 263 || (i >= 263 && i <= 268)) {
                // Right eye region
                point = this.interpolateRegion(rightEye, eyeWidth * 0.15, i - 263, 6);
            } else if (i === 1 || (i >= 1 && i <= 5)) {
                // Nose region
                point = this.interpolateRegion(nose, faceWidth * 0.1, i - 1, 5);
            } else if (i === 61 || (i >= 61 && i <= 67)) {
                // Mouth left region
                point = this.interpolateRegion(mouthL, faceWidth * 0.05, i - 61, 7);
            } else if (i === 291 || (i >= 291 && i <= 297)) {
                // Mouth right region
                point = this.interpolateRegion(mouthR, faceWidth * 0.05, i - 291, 7);
            } else if (i === 152) {
                // Chin
                point = { ...chin };
            } else if (i === 234) {
                // Left cheek
                point = { ...leftCheek };
            } else if (i === 454) {
                // Right cheek
                point = { ...rightCheek };
            } else {
                // Interpolate other points based on face region
                point = this.generateInterpolatedPoint(i, {
                    leftEye, rightEye, nose, mouthL, mouthR, chin, leftCheek, rightCheek,
                    eyeCenter, faceWidth, faceHeight
                });
            }

            landmarks.push([Math.round(point.x), Math.round(point.y)]);
        }

        return landmarks;
    }

    interpolateRegion(center, radius, offset, count) {
        const angle = (offset / count) * Math.PI * 2;
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        };
    }

    generateInterpolatedPoint(index, metrics) {
        const { leftEye, rightEye, nose, mouthL, mouthR, chin, leftCheek, rightCheek, eyeCenter, faceWidth, faceHeight } = metrics;

        // Face outline (10-152 roughly)
        if (index >= 10 && index <= 152) {
            const t = (index - 10) / (152 - 10);
            const angle = t * Math.PI; // Half circle from left to right via chin
            return {
                x: eyeCenter.x + Math.cos(angle + Math.PI / 2) * faceWidth / 2,
                y: eyeCenter.y + Math.sin(angle + Math.PI / 2) * faceHeight / 2
            };
        }

        // Upper face (forehead area)
        if (index >= 0 && index < 10) {
            const t = index / 10;
            return {
                x: leftCheek.x + t * (rightCheek.x - leftCheek.x),
                y: eyeCenter.y - faceHeight * 0.3
            };
        }

        // Nose bridge
        if (index >= 168 && index <= 175) {
            const t = (index - 168) / 7;
            return {
                x: eyeCenter.x,
                y: eyeCenter.y + t * (nose.y - eyeCenter.y)
            };
        }

        // Mouth region (61-291)
        if (index >= 61 && index < 291) {
            const mouthCenter = {
                x: (mouthL.x + mouthR.x) / 2,
                y: (mouthL.y + mouthR.y) / 2
            };
            const mouthWidth = Math.abs(mouthR.x - mouthL.x);
            const t = (index - 61) / (291 - 61);
            return {
                x: mouthCenter.x + (t - 0.5) * mouthWidth,
                y: mouthCenter.y + Math.sin(t * Math.PI * 2) * faceHeight * 0.05
            };
        }

        // Eyes region (left: 33-133, right: 263-362)
        if (index >= 33 && index < 133) {
            const t = (index - 33) / 100;
            const eyeWidth = Math.abs(rightEye.x - leftEye.x) * 0.3;
            return {
                x: leftEye.x + (t - 0.5) * eyeWidth,
                y: leftEye.y + Math.sin(t * Math.PI * 2) * eyeWidth * 0.3
            };
        }

        if (index >= 263 && index < 362) {
            const t = (index - 263) / 100;
            const eyeWidth = Math.abs(rightEye.x - leftEye.x) * 0.3;
            return {
                x: rightEye.x + (t - 0.5) * eyeWidth,
                y: rightEye.y + Math.sin(t * Math.PI * 2) * eyeWidth * 0.3
            };
        }

        // Default: distribute across face
        const row = Math.floor(index / 20);
        const col = index % 20;
        return {
            x: leftCheek.x + (col / 20) * faceWidth,
            y: eyeCenter.y - faceHeight * 0.4 + (row / 24) * faceHeight
        };
    }

    saveLandmarks() {
        const landmarks = this.interpolateLandmarks();
        if (!landmarks) return;

        // Save to assets/landmarks/animals/
        const filename = this.currentAnimal.name + '.json';
        const jsonStr = JSON.stringify(landmarks);

        // For now, download it (in a real app, we'd POST to server)
        this.downloadFile(filename, jsonStr);
        this.updateStatus(`Saved ${filename}! Copy it to assets/landmarks/animals/`);
    }

    downloadJSON() {
        const landmarks = this.interpolateLandmarks();
        if (!landmarks) return;

        const filename = this.currentAnimal.name + '_manual.json';
        this.downloadFile(filename, JSON.stringify(landmarks, null, 2));
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    updateStatus(msg) {
        document.getElementById('status').textContent = msg;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.landmarkEditor = new LandmarkEditor();
});
