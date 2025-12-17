/**
 * Face Morph Pro - Web Application
 * Real-time face morphing using MediaPipe and Canvas
 */

class FaceMorphApp {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('video');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.processingCanvas = document.getElementById('processingCanvas');
        this.thumbnailGrid = document.getElementById('thumbnailGrid');
        this.mobileThumbnailStrip = document.getElementById('mobileThumbnailStrip');
        this.morphSlider = document.getElementById('morphSlider');
        this.morphValue = document.getElementById('morphValue');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.noFaceWarning = document.getElementById('noFaceWarning');
        this.statusOverlay = document.getElementById('statusOverlay');
        this.statusText = document.getElementById('statusText');
        this.scanResult = document.getElementById('scanResult');
        this.sidebar = document.getElementById('sidebar');

        // Canvas contexts
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.processingCtx = this.processingCanvas.getContext('2d');

        // State
        this.state = {
            currentCategory: 'celebs',
            selectedImageIndex: 0,
            morphAmount: 0,
            isRecording: false,
            faceDetected: false,
            sidebarOpen: false,
            selectedAddon: null
        };

        // Categories and assets
        this.categories = ['animals', 'celebs', 'history', 'races', 'addons'];
        this.assets = {};
        this.currentAssets = [];

        // Target face data
        this.targetImage = null;
        this.targetLandmarks = null;
        this.triangles = [];

        // Camera landmarks
        this.cameraLandmarks = null;

        // Morph engine
        this.morphEngine = new MorphEngine();

        // MediaPipe Face Mesh
        this.faceMesh = null;

        // Face-API.js models loaded flag
        this.faceApiLoaded = false;

        // Recording
        this.mediaRecorder = null;
        this.recordedChunks = [];

        // Target canvas for storing loaded target image
        this.targetCanvas = document.createElement('canvas');
        this.targetCtx = this.targetCanvas.getContext('2d');

        // Initialize
        this.init();
    }

    async init() {
        try {
            // Load asset manifest
            await this.loadAssets();

            // Initialize MediaPipe Face Mesh
            await this.initFaceMesh();

            // Initialize Face-API.js for gender detection
            await this.initFaceApi();

            // Initialize camera
            await this.initCamera();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial category
            this.loadCategory(this.state.currentCategory);

            console.log('[FaceMorphApp] Initialized successfully');
        } catch (error) {
            console.error('[FaceMorphApp] Initialization error:', error);
            this.showStatus('Failed to initialize: ' + error.message, true);
        }
    }

    async initFaceApi() {
        try {
            // Wait for face-api.js to be available
            if (typeof faceapi === 'undefined') {
                console.log('[FaceAPI] Waiting for face-api.js to load...');
                await new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (typeof faceapi !== 'undefined') {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                });
            }

            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

            console.log('[FaceAPI] Loading models...');

            // Load required models for gender detection
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
            ]);

            this.faceApiLoaded = true;
            console.log('[FaceAPI] Models loaded successfully');
        } catch (error) {
            console.error('[FaceAPI] Failed to load models:', error);
            this.faceApiLoaded = false;
        }
    }

    async loadAssets() {
        // Define available assets for each category with gender-based organization
        this.assets = {
            // Animals - symmetrical versions for better morphing
            animals: [
                { name: 'Batrik', image: 'assets/animals/Batrik_sym.png', landmarks: 'assets/landmarks/animals/Batrik_sym.json' },
                { name: 'Chimp', image: 'assets/animals/Chimp_sym.png', landmarks: 'assets/landmarks/animals/Chimp_sym.json' },
                { name: 'Chimp 2', image: 'assets/animals/Chimp2.png', landmarks: 'assets/landmarks/animals/Chimp2.json' },
                { name: 'Panda', image: 'assets/animals/Panda.png', landmarks: 'assets/landmarks/animals/Panda.json' }
            ],
            // Male celebrities
            celebs: [
                // Male celebs
                { name: 'Tom Cruise', image: 'assets/male/male_celebs/tom_cruise.jpg', landmarks: 'assets/landmarks/male/male_celebs/tom_cruise.json', gender: 'male' },
                { name: 'Messi (GOAT)', image: 'assets/male/male_celebs/Messi(GOAT).png', landmarks: 'assets/landmarks/male/male_celebs/Messi(GOAT).json', gender: 'male' },
                { name: 'Salah', image: 'assets/male/male_celebs/Salah.jpeg', landmarks: 'assets/landmarks/male/male_celebs/Salah.json', gender: 'male' },
                { name: 'Steve', image: 'assets/male/male_celebs/Steve.jpeg', landmarks: 'assets/landmarks/male/male_celebs/Steve.json', gender: 'male' },
                { name: 'Dr. Tamer', image: 'assets/male/male_celebs/Dr. Tamer.jpeg', landmarks: 'assets/landmarks/male/male_celebs/Dr. Tamer.json', gender: 'male' },
                { name: 'Dustin', image: 'assets/male/male_celebs/Dustin.jpg', landmarks: 'assets/landmarks/male/male_celebs/Dustin.json', gender: 'male' },
                { name: 'Ashraf Abdelbaky', image: 'assets/male/male_celebs/ashraf abdelbaky.jpeg', landmarks: 'assets/landmarks/male/male_celebs/ashraf abdelbaky.json', gender: 'male' },
                // Female celebs
                { name: 'Asmaa', image: 'assets/female/female_celebs/asmaa.jpeg', landmarks: 'assets/landmarks/female/female_celebs/asmaa.json', gender: 'female' },
                { name: 'Aya', image: 'assets/female/female_celebs/aya.jpeg', landmarks: 'assets/landmarks/female/female_celebs/aya.json', gender: 'female' },
                { name: 'Gihan', image: 'assets/female/female_celebs/gihan.jpeg', landmarks: 'assets/landmarks/female/female_celebs/gihan.json', gender: 'female' },
                { name: 'Jenna', image: 'assets/female/female_celebs/jenna.jpeg', landmarks: 'assets/landmarks/female/female_celebs/jenna.json', gender: 'female' },
                { name: 'Yasmina', image: 'assets/female/female_celebs/yasmina.jpeg', landmarks: 'assets/landmarks/female/female_celebs/yasmina.json', gender: 'female' }
            ],
            // History figures
            history: [
                // Male history
                { name: 'Einstein', image: 'assets/male/male_history/Einstein.jpeg', landmarks: 'assets/landmarks/male/male_history/Einstein.json', gender: 'male' },
                { name: 'Newton', image: 'assets/male/male_history/Newton.jpeg', landmarks: 'assets/landmarks/male/male_history/Newton.json', gender: 'male' },
                { name: 'Napoleon', image: 'assets/male/male_history/Napoleon.jpeg', landmarks: 'assets/landmarks/male/male_history/Napoleon.json', gender: 'male' },
                { name: 'Muhammad Ali', image: 'assets/male/male_history/Muhamed Aly.jpeg', landmarks: 'assets/landmarks/male/male_history/Muhamed Aly.json', gender: 'male' },
                { name: 'Hitler', image: 'assets/male/male_history/Hitler.jpg', landmarks: 'assets/landmarks/male/male_history/Hitler.json', gender: 'male' },
                // Female history
                { name: 'Diana', image: 'assets/female/female_history/dianna.jpeg', landmarks: 'assets/landmarks/female/female_history/dianna.json', gender: 'female' },
                { name: 'Om Kalsom', image: 'assets/female/female_history/om kalsom.jpeg', landmarks: 'assets/landmarks/female/female_history/om kalsom.json', gender: 'female' },
                { name: 'Queen', image: 'assets/female/female_history/queen.jpeg', landmarks: 'assets/landmarks/female/female_history/queen.json', gender: 'female' },
                { name: 'Cleopatra', image: 'assets/female/female_history/WhatsApp Image 2025-12-15 at 2.54.22 PM.jpeg', landmarks: 'assets/landmarks/female/female_history/WhatsApp Image 2025-12-15 at 2.54.22 PM.json', gender: 'female' }
            ],
            // Races
            races: [
                // Male races
                { name: 'French', image: 'assets/male/male_races/Alexis Petit, french model, France ;.jpg', landmarks: 'assets/landmarks/male/male_races/Alexis Petit, french model, France ;.json', gender: 'male' },
                { name: 'Asian Male', image: 'assets/male/male_races/download (9).jpg', landmarks: 'assets/landmarks/male/male_races/download (9).json', gender: 'male' },
                { name: 'African Male', image: 'assets/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM.jpeg', landmarks: 'assets/landmarks/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM.json', gender: 'male' },
                { name: 'Indian Male', image: 'assets/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM (1).jpeg', landmarks: 'assets/landmarks/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM (1).json', gender: 'male' },
                // Female races
                { name: 'Asian Girl', image: 'assets/female/female_races/asian girl.jpg', landmarks: 'assets/landmarks/female/female_races/asian girl.json', gender: 'female' },
                { name: 'Black Girl', image: 'assets/female/female_races/black girl.jpeg', landmarks: 'assets/landmarks/female/female_races/black girl.json', gender: 'female' },
                { name: 'Indian Girl', image: 'assets/female/female_races/indian girl.jpeg', landmarks: 'assets/landmarks/female/female_races/indian girl.json', gender: 'female' },
                { name: 'White Girl', image: 'assets/female/female_races/white girl.jpeg', landmarks: 'assets/landmarks/female/female_races/white girl.json', gender: 'female' }
            ],
            // Addons  
            addons: [
                // Male addons
                { name: 'Glasses', image: 'assets/male/male_addons/glasses.png', isAddon: true, type: 'glasses', gender: 'male' },
                { name: 'Moustache', image: 'assets/male/male_addons/pngimg.com - moustache_PNG43 (1).png', isAddon: true, type: 'moustache', gender: 'male' },
                { name: 'Santa Hat', image: 'assets/male/male_addons/santa_hat.png', isAddon: true, type: 'hat', gender: 'male' },
                // Female addons
                { name: 'Glass', image: 'assets/female/female_addons/glass.png', isAddon: true, type: 'glasses', gender: 'female' },
                { name: 'Santa Hat', image: 'assets/female/female_addons/santa_hat.png', isAddon: true, type: 'hat', gender: 'female' }
            ]
        };

        // Preload addon images
        for (const addon of this.assets.addons) {
            addon.imageElement = await this.loadImage(addon.image).catch(() => null);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    async initFaceMesh() {
        return new Promise((resolve, reject) => {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => this.onFaceMeshResults(results));

            // Initialize
            this.faceMesh.initialize().then(() => {
                console.log('[FaceMesh] Initialized');
                resolve();
            }).catch(reject);
        });
    }

    async initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            this.video.srcObject = stream;
            this.stream = stream;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            // Set canvas sizes
            const { videoWidth, videoHeight } = this.video;
            this.outputCanvas.width = videoWidth;
            this.outputCanvas.height = videoHeight;
            this.processingCanvas.width = videoWidth;
            this.processingCanvas.height = videoHeight;

            // Hide loading overlay
            this.loadingOverlay.classList.add('hidden');

            // Start processing loop
            this.startProcessing();

            console.log(`[Camera] Started at ${videoWidth}x${videoHeight}`);
        } catch (error) {
            console.error('[Camera] Error:', error);
            this.loadingOverlay.querySelector('span').textContent = 'Camera access denied. Please allow camera access.';
            throw error;
        }
    }

    startProcessing() {
        const processFrame = async () => {
            if (this.video.readyState >= 2) {
                await this.faceMesh.send({ image: this.video });
            }
            requestAnimationFrame(processFrame);
        };
        processFrame();
    }

    onFaceMeshResults(results) {
        const { videoWidth, videoHeight } = this.video;

        // Draw video frame
        this.outputCtx.save();
        this.outputCtx.scale(-1, 1);
        this.outputCtx.drawImage(this.video, -videoWidth, 0, videoWidth, videoHeight);
        this.outputCtx.restore();

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // Convert normalized landmarks to pixel coordinates (with horizontal flip)
            this.cameraLandmarks = landmarks.map(pt => [
                (1 - pt.x) * videoWidth,  // Flip horizontally
                pt.y * videoHeight
            ]);

            this.state.faceDetected = true;
            this.noFaceWarning.classList.remove('visible');

            // Apply morphing or addon
            if (this.state.selectedAddon) {
                this.applyAddon();
            } else if (this.state.morphAmount > 0.01 && this.targetImage && this.targetLandmarks) {
                this.applyMorph();
            } else if (this.state.morphAmount > 0.01) {
                // Debug: show why morphing is not happening
                if (!this.targetImage) console.warn('[Morph] No target image loaded');
                if (!this.targetLandmarks) console.warn('[Morph] No target landmarks loaded');
            }
        } else {
            this.state.faceDetected = false;
            this.cameraLandmarks = null;
            this.noFaceWarning.classList.add('visible');
        }

        // Record frame if recording
        if (this.state.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            // Recording is handled by MediaRecorder capturing the canvas stream
        }
    }

    applyMorph() {
        if (!this.cameraLandmarks || !this.targetLandmarks) return;

        const { videoWidth, videoHeight } = this.video;
        const alpha = this.state.morphAmount;

        try {
            // Get source image data from the canvas
            const srcData = this.outputCtx.getImageData(0, 0, videoWidth, videoHeight);

            // Get target image data
            const targetData = this.targetCtx.getImageData(0, 0, this.targetCanvas.width, this.targetCanvas.height);

            // Create output buffer
            const outputData = this.outputCtx.createImageData(videoWidth, videoHeight);

            // Perform morphing using the engine
            // Pass isAnimal flag for special opacity handling
            const isAnimal = this.state.currentCategory === 'animals';
            this.morphEngine.morphFace(
                srcData,
                targetData,
                this.cameraLandmarks,
                this.targetLandmarks,
                alpha,
                outputData,
                isAnimal
            );

            // Draw result
            this.outputCtx.putImageData(outputData, 0, 0);
        } catch (error) {
            console.error('[Morph] Error:', error);
        }
    }

    /**
     * Calculate head rotation from face landmarks
     * Returns { yaw, roll, pitch } in radians
     */
    calculateHeadRotation(landmarks) {
        // Key landmarks for rotation detection
        const leftEye = landmarks[33];   // Left eye outer corner
        const rightEye = landmarks[263]; // Right eye outer corner
        const noseTip = landmarks[1];    // Nose tip
        const leftCheek = landmarks[234]; // Left side of face
        const rightCheek = landmarks[454]; // Right side of face
        const chin = landmarks[152];      // Chin
        const forehead = landmarks[10];   // Top of forehead

        if (!leftEye || !rightEye || !noseTip || !chin || !forehead) {
            return { yaw: 0, roll: 0, pitch: 0 };
        }

        // Roll: rotation around the Z axis (head tilt left/right)
        // Calculated from the angle between the eyes
        const eyeDeltaX = rightEye[0] - leftEye[0];
        const eyeDeltaY = rightEye[1] - leftEye[1];
        const roll = Math.atan2(eyeDeltaY, eyeDeltaX);

        // Yaw: rotation around the Y axis (head turn left/right)
        // Estimated by comparing distances from nose to each side of face
        const noseToLeft = Math.sqrt(Math.pow(noseTip[0] - leftCheek[0], 2) + Math.pow(noseTip[1] - leftCheek[1], 2));
        const noseToRight = Math.sqrt(Math.pow(noseTip[0] - rightCheek[0], 2) + Math.pow(noseTip[1] - rightCheek[1], 2));
        const faceWidth = noseToLeft + noseToRight;
        // Normalize yaw estimate: 0 when centered, positive when looking right
        const yaw = ((noseToLeft - noseToRight) / faceWidth) * Math.PI * 0.5;

        // Pitch: rotation around the X axis (head look up/down)
        // Estimated by vertical position of nose relative to eye-chin line
        const eyeCenter = [(leftEye[0] + rightEye[0]) / 2, (leftEye[1] + rightEye[1]) / 2];
        const verticalFaceHeight = chin[1] - forehead[1];
        const noseYRelative = (noseTip[1] - eyeCenter[1]) / verticalFaceHeight;
        const pitch = (noseYRelative - 0.3) * Math.PI * 0.5; // 0.3 is approximate neutral position

        return { yaw, roll, pitch };
    }

    applyAddon() {
        if (!this.cameraLandmarks || !this.state.selectedAddon) return;

        const addon = this.state.selectedAddon;
        if (!addon.imageElement) return;

        const { videoWidth, videoHeight } = this.video;
        const landmarks = this.cameraLandmarks;

        try {
            let position, size;

            // Calculate head rotation for all addon types
            const rotation = this.calculateHeadRotation(landmarks);

            switch (addon.type) {
                case 'glasses':
                case 'sunglasses':
                    // Position between eyes
                    const leftEye = landmarks[33];
                    const rightEye = landmarks[263];
                    if (!leftEye || !rightEye) return;

                    const eyeDistance = Math.sqrt(
                        Math.pow(rightEye[0] - leftEye[0], 2) +
                        Math.pow(rightEye[1] - leftEye[1], 2)
                    );

                    size = {
                        width: eyeDistance * 2.2,
                        height: (eyeDistance * 2.2) * (addon.imageElement.height / addon.imageElement.width)
                    };

                    position = {
                        x: (leftEye[0] + rightEye[0]) / 2,
                        y: (leftEye[1] + rightEye[1]) / 2
                    };
                    break;

                case 'moustache':
                case 'beard':
                    // Position at mouth
                    const mouthLeft = landmarks[61];
                    const mouthRight = landmarks[291];
                    if (!mouthLeft || !mouthRight) return;

                    const mouthWidth = Math.sqrt(
                        Math.pow(mouthRight[0] - mouthLeft[0], 2) +
                        Math.pow(mouthRight[1] - mouthLeft[1], 2)
                    );

                    size = {
                        width: mouthWidth * 1.8,
                        height: (mouthWidth * 1.8) * (addon.imageElement.height / addon.imageElement.width)
                    };

                    const mouthCenter = {
                        x: (mouthLeft[0] + mouthRight[0]) / 2,
                        y: (mouthLeft[1] + mouthRight[1]) / 2
                    };

                    // Offset for beard vs moustache (moustache positioned under nose)
                    const yOffset = addon.type === 'beard' ? size.height * 0.2 : -size.height * 0.3;

                    position = {
                        x: mouthCenter.x,
                        y: mouthCenter.y + yOffset
                    };
                    break;

                case 'wig':
                case 'hair':
                case 'clown':
                case 'hat':
                    // Position on top of head
                    const top = landmarks[10];
                    const left = landmarks[234];
                    const right = landmarks[454];
                    if (!top || !left || !right) return;

                    const faceWidth = Math.sqrt(
                        Math.pow(right[0] - left[0], 2) +
                        Math.pow(right[1] - left[1], 2)
                    );

                    size = {
                        width: faceWidth * 1.8,
                        height: (faceWidth * 1.8) * (addon.imageElement.height / addon.imageElement.width)
                    };

                    const centerX = (left[0] + right[0]) / 2;
                    position = {
                        x: centerX,
                        y: top[1] - size.height * 0.2  // Positioned lower on the head
                    };
                    break;

                default:
                    // Generic: center on nose
                    const nosePoint = landmarks[1];
                    const faceLeft = landmarks[234];
                    const faceRight = landmarks[454];
                    if (!nosePoint || !faceLeft || !faceRight) return;

                    const width = Math.abs(faceRight[0] - faceLeft[0]) * 0.9;
                    size = {
                        width: width,
                        height: width * (addon.imageElement.height / addon.imageElement.width)
                    };

                    position = {
                        x: nosePoint[0],
                        y: nosePoint[1]
                    };
            }

            // Apply rotation transform to draw addon with head tilt
            this.outputCtx.save();

            // Translate to position center
            this.outputCtx.translate(position.x, position.y);

            // Apply roll rotation (head tilt)
            this.outputCtx.rotate(rotation.roll);

            // Apply perspective skew for yaw (simulates 3D turn)
            // Scale X slightly based on yaw to simulate perspective
            const perspectiveScale = 1 - Math.abs(rotation.yaw) * 0.3;
            this.outputCtx.scale(perspectiveScale, 1);

            // Flip vertically for certain addon types
            if (['hat', 'wig', 'hair', 'clown', 'moustache', 'beard', 'glasses', 'sunglasses'].includes(addon.type)) {
                this.outputCtx.scale(1, -1);
            }

            // Draw addon centered at origin (after transforms)
            this.outputCtx.drawImage(
                addon.imageElement,
                -size.width / 2,
                -size.height / 2,
                size.width,
                size.height
            );

            this.outputCtx.restore();
        } catch (error) {
            console.error('[Addon] Error:', error);
        }
    }

    loadCategory(category) {
        this.state.currentCategory = category;
        const allAssets = this.assets[category] || [];

        // Apply gender filtering if gender was detected (except for animals)
        const detectedGender = this.state.detectedGender;
        if (detectedGender && category !== 'animals') {
            // Filter by detected gender
            const filtered = allAssets.filter(asset => asset.gender === detectedGender);
            this.currentAssets = filtered.length > 0 ? filtered : allAssets;
            console.log(`[Category] Showing ${this.currentAssets.length} ${detectedGender} ${category}`);
        } else {
            this.currentAssets = allAssets;
        }

        // Clear addon selection when switching to non-addon category
        if (category !== 'addons') {
            this.state.selectedAddon = null;
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn, .mobile-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Render thumbnails
        this.renderThumbnails();

        // Select first item if available
        if (this.currentAssets.length > 0) {
            this.selectAsset(0);
        }
    }

    renderThumbnails() {
        const renderGrid = (container, isMobile = false) => {
            container.innerHTML = '';

            this.currentAssets.forEach((asset, index) => {
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail' + (asset.isAddon ? ' addon-item' : '');
                thumb.dataset.index = index;

                if (index === this.state.selectedImageIndex) {
                    thumb.classList.add('active');
                }

                const img = document.createElement('img');
                img.src = asset.image;
                img.alt = asset.name;
                img.onerror = () => {
                    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" x="50" y="55" text-anchor="middle" font-size="12">No Image</text></svg>';
                };

                thumb.appendChild(img);
                thumb.addEventListener('click', () => this.selectAsset(index));

                container.appendChild(thumb);
            });
        };

        renderGrid(this.thumbnailGrid);
        renderGrid(this.mobileThumbnailStrip, true);
    }

    filterCelebsByGender(gender) {
        // Switch to celebs category
        this.state.currentCategory = 'celebs';

        // Filter celebs by detected gender
        const allCelebs = this.assets.celebs || [];
        this.currentAssets = allCelebs.filter(celeb => celeb.gender === gender);

        // If no matching celebs found, show all celebs
        if (this.currentAssets.length === 0) {
            this.currentAssets = allCelebs;
            console.log(`[Filter] No ${gender} celebs found, showing all`);
        } else {
            console.log(`[Filter] Showing ${this.currentAssets.length} ${gender} celebs`);
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn, .mobile-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'celebs');
        });

        // Clear addon selection
        this.state.selectedAddon = null;

        // Render filtered thumbnails
        this.renderThumbnails();

        // Select first matching celeb
        if (this.currentAssets.length > 0) {
            this.selectAsset(0);
        }
    }

    async selectAsset(index) {
        this.state.selectedImageIndex = index;
        const asset = this.currentAssets[index];

        if (!asset) return;

        // Update thumbnail selection
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

        if (asset.isAddon) {
            // Handle addon selection
            this.state.selectedAddon = asset;
            this.targetImage = null;
            this.targetLandmarks = null;
            this.triangles = [];
            console.log(`[Asset] Selected addon: ${asset.name}`);
        } else {
            // Handle face target selection
            this.state.selectedAddon = null;

            try {
                // Load target image
                this.targetImage = await this.loadImage(asset.image);

                // Set target canvas size and draw image
                this.targetCanvas.width = this.targetImage.width;
                this.targetCanvas.height = this.targetImage.height;
                this.targetCtx.drawImage(this.targetImage, 0, 0);

                // Try to load landmarks
                try {
                    const response = await fetch(asset.landmarks);
                    if (response.ok) {
                        this.targetLandmarks = await response.json();
                        console.log(`[Asset] Loaded ${asset.name} with ${this.targetLandmarks.length} landmarks`);
                    } else {
                        throw new Error('Landmarks not found');
                    }
                } catch (e) {
                    console.warn(`[Asset] No landmarks for ${asset.name}:`, e.message);
                    this.targetLandmarks = null;
                    this.showStatus(`No landmarks for ${asset.name}`, true);
                }
            } catch (error) {
                console.error(`[Asset] Failed to load ${asset.name}:`, error);
                this.showStatus(`Failed to load ${asset.name}`, true);
            }
        }
    }

    async detectLandmarksFromImage(image) {
        return new Promise((resolve) => {
            // Create a temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = image.width;
            tempCanvas.height = image.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(image, 0, 0);

            // Use face mesh to detect landmarks
            this.faceMesh.send({ image: tempCanvas }).then(() => {
                // The onResults callback will be called, but we're processing static image
                // For now, just resolve
                resolve();
            }).catch(() => resolve());
        });
    }

    setupEventListeners() {
        // Morph slider
        this.morphSlider.addEventListener('input', (e) => {
            this.state.morphAmount = parseInt(e.target.value) / 100;
            this.morphValue.textContent = `${e.target.value}%`;
        });

        // Category tabs (desktop)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadCategory(btn.dataset.category);
            });
        });

        // Category tabs (mobile)
        document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadCategory(btn.dataset.category);
            });
        });

        // Desktop buttons
        document.getElementById('scanBtn').addEventListener('click', () => this.scanGender());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('snapshotBtn').addEventListener('click', () => this.takeSnapshot());

        // Mobile buttons
        document.getElementById('mobileScanBtn').addEventListener('click', () => this.scanGender());
        document.getElementById('mobileRecordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('mobileSnapshotBtn').addEventListener('click', () => this.takeSnapshot());
        document.getElementById('toggleSidebarBtn').addEventListener('click', () => this.toggleSidebar());

        // Sidebar overlay click to close
        document.addEventListener('click', (e) => {
            if (this.state.sidebarOpen && !this.sidebar.contains(e.target) &&
                !e.target.closest('#toggleSidebarBtn')) {
                this.closeSidebar();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.state.sidebarOpen) {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        this.state.sidebarOpen = !this.state.sidebarOpen;
        this.sidebar.classList.toggle('open', this.state.sidebarOpen);

        // Create/toggle overlay
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => this.closeSidebar());
        }
        overlay.classList.toggle('visible', this.state.sidebarOpen);
    }

    closeSidebar() {
        this.state.sidebarOpen = false;
        this.sidebar.classList.remove('open');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('visible');
    }

    async scanGender() {
        if (!this.state.faceDetected) {
            this.showStatus('No face detected', true);
            return;
        }

        if (!this.faceApiLoaded) {
            this.showStatus('Gender detection loading...', true);
            return;
        }

        // Show scanning state
        this.scanResult.textContent = 'Scanning...';
        document.getElementById('scanBtn').classList.add('scanning');
        document.getElementById('mobileScanBtn')?.classList.add('scanning');

        try {
            // Use the output canvas for detection (has the current camera frame)
            const detection = await faceapi.detectSingleFace(
                this.outputCanvas,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
            ).withAgeAndGender();

            if (detection) {
                const gender = detection.gender;
                const confidence = Math.round(detection.genderProbability * 100);
                const result = gender.charAt(0).toUpperCase() + gender.slice(1);

                this.scanResult.textContent = result;
                this.showStatus(`Detected: ${result} (${confidence}% confidence), Age: ~${Math.round(detection.age)}`);
                console.log(`[GenderScan] ${result} - ${confidence}% confidence, Age: ~${Math.round(detection.age)}`);

                // Store detected gender and filter celebs
                this.state.detectedGender = gender;
                this.filterCelebsByGender(gender);
            } else {
                this.scanResult.textContent = '--';
                this.showStatus('Could not detect face for gender scan', true);
            }
        } catch (error) {
            console.error('[GenderScan] Error:', error);
            this.scanResult.textContent = '--';
            this.showStatus('Gender scan failed', true);
        } finally {
            document.getElementById('scanBtn').classList.remove('scanning');
            document.getElementById('mobileScanBtn')?.classList.remove('scanning');
        }
    }

    async toggleRecording() {
        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            // Create canvas stream
            const canvasStream = this.outputCanvas.captureStream(30);

            // Try to add audio track if available
            if (this.stream) {
                const audioTracks = this.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    canvasStream.addTrack(audioTracks[0]);
                }
            }

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(canvasStream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 5000000
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };

            this.mediaRecorder.start(100);
            this.state.isRecording = true;

            // Update UI
            document.getElementById('recordBtn').classList.add('recording');
            document.getElementById('mobileRecordBtn').classList.add('recording');

            this.showStatus('Recording started...');
        } catch (error) {
            console.error('[Recording] Error:', error);
            this.showStatus('Recording failed: ' + error.message, true);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        this.state.isRecording = false;

        // Update UI
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('mobileRecordBtn').classList.remove('recording');
    }

    saveRecording() {
        if (this.recordedChunks.length === 0) return;

        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `facemorph_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        this.showStatus('Video saved!');
    }

    takeSnapshot() {
        try {
            // Create download link
            const dataUrl = this.outputCanvas.toDataURL('image/jpeg', 0.9);

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `snapshot_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.showStatus('Snapshot saved!');
        } catch (error) {
            console.error('[Snapshot] Error:', error);
            this.showStatus('Snapshot failed', true);
        }
    }

    showStatus(message, isError = false) {
        this.statusText.textContent = message;
        this.statusText.classList.toggle('error', isError);
        this.statusOverlay.classList.add('visible');

        setTimeout(() => {
            this.statusOverlay.classList.remove('visible');
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FaceMorphApp();
});
