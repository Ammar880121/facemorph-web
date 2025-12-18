/**
 * ============================================================================
 * FACE MORPH PRO - Web Application
 * ============================================================================
 * 
 * A real-time face morphing application that transforms your face into
 * celebrities, animals, historical figures, and different ethnicities.
 * 
 * MODELS USED:
 * ------------
 * 1. MediaPipe Face Mesh - Detects 468 facial landmarks in real-time
 *    - Loaded from: https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh
 *    - Used for: Face detection, landmark extraction, morph positioning
 * 
 * 2. Face-API.js - Gender and age detection
 *    - Loaded from: https://cdn.jsdelivr.net/npm/@vladmandic/face-api
 *    - Models: tinyFaceDetector, ageGenderNet
 *    - Used for: Scanning user's gender/age to filter appropriate morphs
 * 
 * HOW MORPHING WORKS:
 * -------------------
 * 1. Camera captures video frames continuously
 * 2. MediaPipe detects face and extracts 468 landmarks
 * 3. Target image landmarks are loaded from pre-computed JSON files
 * 4. MorphEngine performs Delaunay triangulation on landmarks
 * 5. Each triangle is affine-warped from target to camera position
 * 6. A feathered mask blends the warped face onto the camera feed
 * 
 * CONVERTED FROM:
 * ---------------
 * Originally a Python desktop app using OpenCV and MediaPipe.
 * Key differences in web version:
 * - Uses Canvas API instead of OpenCV for image manipulation
 * - Custom Bowyer-Watson algorithm instead of cv2.Subdiv2D
 * - Face-API.js instead of Caffe model for gender detection
 * 
 * @author Face Morph Pro Team
 * @version 2.0.0 (Web)
 */

class FaceMorphApp {
    /**
     * ========================================================================
     * CONSTRUCTOR - Initialize the Face Morph Application
     * ========================================================================
     * Sets up all DOM references, state, and initializes the app.
     */
    constructor() {
        // ====================================================================
        // DOM ELEMENT REFERENCES
        // ====================================================================
        // These are references to HTML elements defined in index.html

        // Video and Canvas elements for camera display
        this.video = document.getElementById('video');           // Hidden video element for camera feed
        this.outputCanvas = document.getElementById('outputCanvas'); // Main visible canvas showing morphed result
        this.processingCanvas = document.getElementById('processingCanvas'); // Hidden canvas for intermediate processing

        // UI Elements
        this.filterCarousel = document.getElementById('filterCarousel');   // Horizontal scrolling filter thumbnails
        this.loadingOverlay = document.getElementById('loadingOverlay');   // "Loading..." overlay shown during init
        this.noFaceWarning = document.getElementById('noFaceWarning');     // Warning shown when no face detected
        this.statusOverlay = document.getElementById('statusOverlay');     // Toast-style status messages
        this.statusText = document.getElementById('statusText');           // Text content of status messages
        this.morphSlider = document.getElementById('morphSlider');         // Slider to control morph intensity (0-100%)
        this.morphValue = document.getElementById('morphValue');           // Display showing current morph percentage

        // Gender/Age scan display elements
        this.scanResultDisplay = document.getElementById('scanResultDisplay');
        this.scanGender = document.getElementById('scanGender');
        this.scanAge = document.getElementById('scanAge');
        this.scanBadge = document.getElementById('scanBadge');

        // Modal and panel elements
        this.effectsPanel = document.getElementById('effectsPanel');     // Side panel for color effects
        this.profileModal = document.getElementById('profileModal');     // User profile modal
        this.galleryModal = document.getElementById('galleryModal');     // Gallery modal
        this.galleryGrid = document.getElementById('galleryGrid');       // Grid container for gallery items
        this.galleryEmpty = document.getElementById('galleryEmpty');     // "No photos yet" message
        this.galleryBadge = document.getElementById('galleryBadge');     // Badge showing gallery count
        this.userNameDisplay = document.getElementById('userName');       // Display user's name in header

        // ====================================================================
        // CANVAS CONTEXTS
        // ====================================================================
        // 2D rendering contexts for drawing on canvases
        this.outputCtx = this.outputCanvas.getContext('2d');     // Context for final output
        this.processingCtx = this.processingCanvas.getContext('2d'); // Context for intermediate processing

        // ====================================================================
        // APPLICATION STATE
        // ====================================================================
        // Centralized state object - tracks all app state in one place
        this.state = {
            currentCategory: 'celebs',    // Currently selected category tab
            selectedImageIndex: -1,       // Index of selected morph target (-1 = none)
            morphAmount: 0,               // Morph intensity 0.0 to 1.0
            isRecording: false,           // True when recording video
            faceDetected: false,          // True when a face is visible in camera
            selectedAddon: null,          // Currently selected addon (glasses, hat, etc.)
            currentEffect: 'none',        // Color effect: 'none', 'bw', or 'purple'
            profile: { name: '', email: '' }  // User profile data
        };

        // ====================================================================
        // GALLERY STORAGE
        // ====================================================================
        this.gallery = [];  // Array of captured photos/videos (stored in localStorage)

        // ====================================================================
        // FILTER INTERACTION STATE
        // ====================================================================
        // Tracks touch/click state for the filter carousel
        // Tap once = select filter, Tap again = take photo, Hold = record video
        this.filterHoldTimer = null;   // Timer for detecting long press
        this.isFilterHolding = false;  // True while user is holding down on filter
        this.filterDownTime = 0;       // Timestamp when user started pressing

        // ====================================================================
        // CAMERA STATE
        // ====================================================================
        this.currentFacingMode = 'user';  // 'user' = front camera, 'environment' = back camera

        // ====================================================================
        // MORPH ASSETS
        // ====================================================================
        this.categories = ['animals', 'celebs', 'history', 'races', 'addons'];  // Available categories
        this.assets = {};          // All loaded assets organized by category
        this.currentAssets = [];   // Assets currently displayed in carousel

        // ====================================================================
        // TARGET FACE DATA (the face to morph INTO)
        // ====================================================================
        this.targetImage = null;     // Image element of selected morph target
        this.targetLandmarks = null; // 468 landmark points for target face (from JSON)

        // ====================================================================
        // CAMERA FACE DATA (the user's face)
        // ====================================================================
        this.cameraLandmarks = null;  // 468 landmark points detected in camera feed

        // ====================================================================
        // MORPH ENGINE
        // ====================================================================
        // The MorphEngine handles all the math: triangulation, warping, blending
        this.morphEngine = new MorphEngine();

        // ====================================================================
        // MEDIAPIPE FACE MESH
        // ====================================================================
        // Google's face detection library - detects 468 facial landmarks
        this.faceMesh = null;

        // ====================================================================
        // FACE-API.JS (Gender/Age Detection)
        // ====================================================================
        this.faceApiLoaded = false;  // True when Face-API models are loaded

        // ====================================================================
        // VIDEO RECORDING
        // ====================================================================
        this.mediaRecorder = null;   // MediaRecorder instance for video capture
        this.recordedChunks = [];    // Array of video data chunks

        // ====================================================================
        // TARGET IMAGE CANVAS
        // ====================================================================
        // Offscreen canvas used to draw and process the target morph image
        this.targetCanvas = document.createElement('canvas');
        this.targetCtx = this.targetCanvas.getContext('2d');

        // Start initialization
        this.init();
    }

    async init() {
        try {
            this.loadProfile();
            this.loadGallery();
            await this.loadAssets();
            await this.initFaceMesh();
            await this.initFaceApi();
            await this.initCamera();
            this.setupEventListeners();
            this.loadCategory(this.state.currentCategory);
            console.log('[FaceMorphApp] Initialized');
        } catch (error) {
            console.error('[FaceMorphApp] Init error:', error);
            this.showStatus('Failed to initialize: ' + error.message, true);
        }
    }

    // ============ PROFILE ============

    loadProfile() {
        try {
            const saved = localStorage.getItem('facemorphProfile');
            if (saved) {
                this.state.profile = JSON.parse(saved);
                this.updateProfileDisplay();
            }
        } catch (e) { }
    }

    saveProfile() {
        localStorage.setItem('facemorphProfile', JSON.stringify(this.state.profile));
        this.updateProfileDisplay();
        this.showStatus('Profile saved!', false);
    }

    clearProfile() {
        this.state.profile = { name: '', email: '' };
        localStorage.removeItem('facemorphProfile');
        this.updateProfileDisplay();
        document.getElementById('profileName').value = '';
        document.getElementById('profileEmail').value = '';
        document.getElementById('profileAvatar').innerHTML = '<span>?</span>';
    }

    updateProfileDisplay() {
        const name = this.state.profile.name || 'Guest';
        this.userNameDisplay.textContent = name;
        const avatar = document.getElementById('profileAvatar');
        if (this.state.profile.name) {
            avatar.innerHTML = `<span>${this.state.profile.name.charAt(0).toUpperCase()}</span>`;
        }
    }

    // ============ GALLERY ============

    loadGallery() {
        try {
            const saved = localStorage.getItem('facemorphGallery');
            if (saved) {
                this.gallery = JSON.parse(saved);
                this.updateGalleryBadge();
            }
        } catch (e) { }
    }

    saveGallery() {
        try {
            localStorage.setItem('facemorphGallery', JSON.stringify(this.gallery));
            this.updateGalleryBadge();
        } catch (e) {
            // Storage might be full, remove oldest items
            if (this.gallery.length > 10) {
                this.gallery = this.gallery.slice(-10);
                localStorage.setItem('facemorphGallery', JSON.stringify(this.gallery));
            }
        }
    }

    updateGalleryBadge() {
        const count = this.gallery.length;
        this.galleryBadge.textContent = count > 0 ? count : '';
        this.galleryBadge.setAttribute('data-count', count);
    }

    addToGallery(dataUrl, type = 'photo', ext = null) {
        const item = {
            id: Date.now(),
            data: dataUrl,
            type: type,
            ext: ext || (type === 'video' ? 'webm' : 'png'),
            timestamp: new Date().toISOString()
        };
        this.gallery.push(item);
        this.saveGallery();
        this.showStatus(`${type === 'photo' ? 'Photo' : 'Video'} saved to gallery!`, false);
    }

    renderGallery() {
        this.galleryGrid.innerHTML = '';

        if (this.gallery.length === 0) {
            this.galleryEmpty.style.display = 'block';
            this.galleryGrid.style.display = 'none';
            return;
        }

        this.galleryEmpty.style.display = 'none';
        this.galleryGrid.style.display = 'grid';

        this.gallery.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';

            if (item.type === 'video') {
                const video = document.createElement('video');
                video.src = item.data;
                video.muted = true;
                video.loop = true;
                video.addEventListener('mouseenter', () => video.play());
                video.addEventListener('mouseleave', () => video.pause());
                div.appendChild(video);

                const badge = document.createElement('span');
                badge.className = 'video-badge';
                badge.textContent = '🎥';
                div.appendChild(badge);
            } else {
                const img = document.createElement('img');
                img.src = item.data;
                img.alt = 'Photo';
                div.appendChild(img);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteGalleryItem(index);
            });
            div.appendChild(deleteBtn);

            // Click to download
            div.addEventListener('click', () => this.downloadGalleryItem(item));

            this.galleryGrid.appendChild(div);
        });
    }

    deleteGalleryItem(index) {
        this.gallery.splice(index, 1);
        this.saveGallery();
        this.renderGallery();
    }

    downloadGalleryItem(item) {
        const link = document.createElement('a');
        link.href = item.data;
        const ext = item.ext || (item.type === 'video' ? 'webm' : 'png');
        link.download = `facemorph_${item.id}.${ext}`;
        link.click();
    }

    clearGallery() {
        this.gallery = [];
        this.saveGallery();
        this.renderGallery();
        this.showStatus('Gallery cleared', false);
    }

    downloadAllGallery() {
        if (this.gallery.length === 0) return;
        this.gallery.forEach(item => this.downloadGalleryItem(item));
    }

    // ============ FACE API ============

    async initFaceApi() {
        try {
            if (typeof faceapi === 'undefined') {
                await new Promise((resolve) => {
                    const check = setInterval(() => {
                        if (typeof faceapi !== 'undefined') {
                            clearInterval(check);
                            resolve();
                        }
                    }, 100);
                });
            }

            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
            ]);
            this.faceApiLoaded = true;
        } catch (e) {
            this.faceApiLoaded = false;
        }
    }

    // ============ ASSETS ============

    async loadAssets() {
        this.assets = {
            animals: [
                { name: 'Batrik', image: 'assets/animals/Batrik_sym.png', landmarks: 'assets/landmarks/animals/Batrik_sym.json' },
                { name: 'Chimp', image: 'assets/animals/Chimp_sym.png', landmarks: 'assets/landmarks/animals/Chimp_sym.json' },
                { name: 'Chimp 2', image: 'assets/animals/Chimp2.png', landmarks: 'assets/landmarks/animals/Chimp2.json' },
                { name: 'Panda', image: 'assets/animals/Panda.png', landmarks: 'assets/landmarks/animals/Panda.json' },
                { name: 'Sloth', image: 'assets/animals/Sloth.jpg', landmarks: 'assets/landmarks/animals/Sloth.json' }
            ],
            celebs: [
                { name: 'Tom Cruise', image: 'assets/male/male_celebs/tom_cruise.jpg', landmarks: 'assets/landmarks/male/male_celebs/tom_cruise.json', gender: 'male' },
                { name: 'Messi', image: 'assets/male/male_celebs/Messi(GOAT).png', landmarks: 'assets/landmarks/male/male_celebs/Messi(GOAT).json', gender: 'male' },
                { name: 'Salah', image: 'assets/male/male_celebs/Salah.jpeg', landmarks: 'assets/landmarks/male/male_celebs/Salah.json', gender: 'male' },
                { name: 'Steve', image: 'assets/male/male_celebs/Steve.jpeg', landmarks: 'assets/landmarks/male/male_celebs/Steve.json', gender: 'male' },
                { name: 'Dr. Tamer', image: 'assets/male/male_celebs/Dr. Tamer.jpeg', landmarks: 'assets/landmarks/male/male_celebs/Dr. Tamer.json', gender: 'male' },
                { name: 'Dustin', image: 'assets/male/male_celebs/Dustin.jpg', landmarks: 'assets/landmarks/male/male_celebs/Dustin.json', gender: 'male' },
                { name: 'Ashraf', image: 'assets/male/male_celebs/ashraf abdelbaky.jpeg', landmarks: 'assets/landmarks/male/male_celebs/ashraf abdelbaky.json', gender: 'male' },
                { name: 'Ronaldo', image: 'assets/male/male_celebs/Ronaldo.png', landmarks: 'assets/landmarks/male/male_celebs/Ronaldo.json', gender: 'male' },
                { name: 'Asmaa', image: 'assets/female/female_celebs/asmaa.jpeg', landmarks: 'assets/landmarks/female/female_celebs/asmaa.json', gender: 'female' },
                { name: 'Aya', image: 'assets/female/female_celebs/aya.jpeg', landmarks: 'assets/landmarks/female/female_celebs/aya.json', gender: 'female' },
                { name: 'Gihan', image: 'assets/female/female_celebs/gihan.jpeg', landmarks: 'assets/landmarks/female/female_celebs/gihan.json', gender: 'female' },
                { name: 'Jenna', image: 'assets/female/female_celebs/jenna.jpeg', landmarks: 'assets/landmarks/female/female_celebs/jenna.json', gender: 'female' },
                { name: 'Yasmina', image: 'assets/female/female_celebs/yasmina.jpeg', landmarks: 'assets/landmarks/female/female_celebs/yasmina.json', gender: 'female' }
            ],
            history: [
                { name: 'Einstein', image: 'assets/male/male_history/Einstein.jpeg', landmarks: 'assets/landmarks/male/male_history/Einstein.json', gender: 'male' },
                { name: 'Newton', image: 'assets/male/male_history/Newton.jpeg', landmarks: 'assets/landmarks/male/male_history/Newton.json', gender: 'male' },
                { name: 'Napoleon', image: 'assets/male/male_history/Napoleon.jpeg', landmarks: 'assets/landmarks/male/male_history/Napoleon.json', gender: 'male' },
                { name: 'Muhammad Ali', image: 'assets/male/male_history/Muhamed Aly.jpeg', landmarks: 'assets/landmarks/male/male_history/Muhamed Aly.json', gender: 'male' },
                { name: 'Hitler', image: 'assets/male/male_history/Hitler.jpg', landmarks: 'assets/landmarks/male/male_history/Hitler.json', gender: 'male' },
                { name: 'Diana', image: 'assets/female/female_history/dianna.jpeg', landmarks: 'assets/landmarks/female/female_history/dianna.json', gender: 'female' },
                { name: 'Om Kalsom', image: 'assets/female/female_history/om kalsom.jpeg', landmarks: 'assets/landmarks/female/female_history/om kalsom.json', gender: 'female' },
                { name: 'Queen', image: 'assets/female/female_history/queen.jpeg', landmarks: 'assets/landmarks/female/female_history/queen.json', gender: 'female' },
                { name: 'Cleopatra', image: 'assets/female/female_history/WhatsApp Image 2025-12-15 at 2.54.22 PM.jpeg', landmarks: 'assets/landmarks/female/female_history/WhatsApp Image 2025-12-15 at 2.54.22 PM.json', gender: 'female' }
            ],
            races: [
                { name: 'French', image: 'assets/male/male_races/Alexis Petit, french model, France ;.jpg', landmarks: 'assets/landmarks/male/male_races/Alexis Petit, french model, France ;.json', gender: 'male' },
                { name: 'Asian Male', image: 'assets/male/male_races/download (9).jpg', landmarks: 'assets/landmarks/male/male_races/download (9).json', gender: 'male' },
                { name: 'African Male', image: 'assets/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM.jpeg', landmarks: 'assets/landmarks/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM.json', gender: 'male' },
                { name: 'Indian Male', image: 'assets/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM (1).jpeg', landmarks: 'assets/landmarks/male/male_races/WhatsApp Image 2025-12-14 at 6.53.55 PM (1).json', gender: 'male' },
                { name: 'Asian Girl', image: 'assets/female/female_races/asian girl.jpg', landmarks: 'assets/landmarks/female/female_races/asian girl.json', gender: 'female' },
                { name: 'Black Girl', image: 'assets/female/female_races/black girl.jpeg', landmarks: 'assets/landmarks/female/female_races/black girl.json', gender: 'female' },
                { name: 'Indian Girl', image: 'assets/female/female_races/indian girl.jpeg', landmarks: 'assets/landmarks/female/female_races/indian girl.json', gender: 'female' },
                { name: 'White Girl', image: 'assets/female/female_races/white girl.jpeg', landmarks: 'assets/landmarks/female/female_races/white girl.json', gender: 'female' }
            ],
            addons: [
                { name: 'Glasses', image: 'assets/male/male_addons/glasses.png', isAddon: true, type: 'glasses', gender: 'male' },
                { name: 'Moustache', image: 'assets/male/male_addons/pngimg.com - moustache_PNG43 (1).png', isAddon: true, type: 'moustache', gender: 'male' },
                { name: 'Santa Hat', image: 'assets/male/male_addons/santa_hat.png', isAddon: true, type: 'hat', gender: 'male' },
                { name: 'Glass', image: 'assets/female/female_addons/glass.png', isAddon: true, type: 'glasses', gender: 'female' },
                { name: 'Santa Hat', image: 'assets/female/female_addons/santa_hat.png', isAddon: true, type: 'hat', gender: 'female' }
            ]
        };

        for (const addon of this.assets.addons) {
            addon.imageElement = await this.loadImage(addon.image).catch(() => null);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed: ${src}`));
            img.src = src;
        });
    }

    // ============ FACE MESH ============

    async initFaceMesh() {
        return new Promise((resolve, reject) => {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => this.onFaceMeshResults(results));
            this.faceMesh.initialize().then(resolve).catch(reject);
        });
    }

    // ============ CAMERA ============

    async initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
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

            const { videoWidth, videoHeight } = this.video;
            this.outputCanvas.width = videoWidth;
            this.outputCanvas.height = videoHeight;
            this.processingCanvas.width = videoWidth;
            this.processingCanvas.height = videoHeight;

            this.loadingOverlay.classList.add('hidden');
            this.startProcessing();
        } catch (error) {
            this.loadingOverlay.querySelector('span').textContent = 'Camera access denied';
            throw error;
        }
    }

    /**
     * ========================================================================
     * START PROCESSING LOOP
     * ========================================================================
     * Begins the main animation loop that processes each video frame.
     * This runs at ~30-60 FPS using requestAnimationFrame.
     */
    startProcessing() {
        const processFrame = async () => {
            // Only process if video has loaded enough data
            // readyState >= 2 means HAVE_CURRENT_DATA (at least one frame available)
            if (this.video.readyState >= 2) {
                // Send the current video frame to MediaPipe for face detection
                // Results come back via the onFaceMeshResults callback
                await this.faceMesh.send({ image: this.video });
            }
            // Request next frame (creates smooth 60fps loop)
            requestAnimationFrame(processFrame);
        };
        processFrame();
    }

    /**
     * ========================================================================
     * FACE MESH RESULTS CALLBACK
     * ========================================================================
     * Called by MediaPipe whenever it finishes processing a frame.
     * This is the heart of the app - it runs every frame (~30-60 times/second).
     * 
     * FLOW:
     * 1. Draw the video frame to canvas (mirrored for selfie mode)
     * 2. If face detected: extract landmarks, apply morph or addon
     * 3. If no face: show warning
     * 4. Apply any color effects
     * 
     * @param {Object} results - MediaPipe results containing multiFaceLandmarks array
     */
    onFaceMeshResults(results) {
        const { videoWidth, videoHeight } = this.video;
        const isFrontCamera = this.currentFacingMode === 'user';

        // ====================================================================
        // STEP 1: DRAW VIDEO FRAME TO CANVAS
        // ====================================================================
        // For front camera: mirror horizontally (like a selfie)
        // For back camera: draw normally
        this.outputCtx.save();
        if (isFrontCamera) {
            // Mirror for front camera (selfie mode)
            // Scale X by -1 to flip horizontally
            this.outputCtx.scale(-1, 1);
            this.outputCtx.drawImage(this.video, -videoWidth, 0, videoWidth, videoHeight);
        } else {
            // No mirror for back camera
            this.outputCtx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
        }
        this.outputCtx.restore();

        // ====================================================================
        // STEP 2: PROCESS FACE LANDMARKS
        // ====================================================================
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            // Face detected! Extract the 468 landmark points
            const landmarks = results.multiFaceLandmarks[0];

            // Convert normalized coordinates (0-1) to pixel coordinates
            // Also mirror X coordinates for front camera
            if (isFrontCamera) {
                this.cameraLandmarks = landmarks.map(pt => [(1 - pt.x) * videoWidth, pt.y * videoHeight]);
            } else {
                this.cameraLandmarks = landmarks.map(pt => [pt.x * videoWidth, pt.y * videoHeight]);
            }

            this.state.faceDetected = true;
            this.noFaceWarning.classList.remove('visible');

            // ================================================================
            // STEP 3: APPLY MORPH OR ADDON
            // ================================================================
            if (this.state.selectedAddon) {
                // Addon mode: draw glasses, hat, moustache, etc.
                this.applyAddon();
            } else if (this.state.morphAmount > 0.01 && this.targetImage && this.targetLandmarks) {
                // Morph mode: transform face to look like target
                this.applyMorph();
            }
        } else {
            // No face detected
            this.state.faceDetected = false;
            this.cameraLandmarks = null;
            this.noFaceWarning.classList.add('visible');
        }

        // ====================================================================
        // STEP 4: APPLY COLOR EFFECTS
        // ====================================================================
        // Apply B&W or Purple filter if selected
        this.applyColorEffect();
    }

    // ============ EFFECTS ============

    /**
     * Apply color effect (B&W or Purple) to the output canvas.
     * Modifies pixels directly using ImageData.
     */
    applyColorEffect() {
        if (this.state.currentEffect === 'none') return;

        const { videoWidth, videoHeight } = this.video;
        const imageData = this.outputCtx.getImageData(0, 0, videoWidth, videoHeight);
        const data = imageData.data;  // Uint8ClampedArray: [R,G,B,A, R,G,B,A, ...]

        if (this.state.currentEffect === 'bw') {
            // Convert to grayscale using luminance formula
            // Human eyes are most sensitive to green, then red, then blue
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = data[i + 1] = data[i + 2] = gray;
            }
        } else if (this.state.currentEffect === 'purple') {
            // Purple tint: boost red and blue, reduce green
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.1 + 30);      // Red: boost
                data[i + 1] = Math.max(0, data[i + 1] * 0.7);     // Green: reduce
                data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 40); // Blue: boost
            }
        }

        this.outputCtx.putImageData(imageData, 0, 0);
    }

    // ============ MORPH ============

    /**
     * ========================================================================
     * APPLY MORPH - Transform User's Face
     * ========================================================================
     * This is the main morphing function. It:
     * 1. Gets pixel data from current canvas (camera frame)
     * 2. Gets pixel data from target image
     * 3. Calls morphEngine to perform triangulation and warping
     * 4. Writes the result back to the canvas
     * 
     * The morph amount (alpha) controls how much of the target face shows:
     * - alpha = 0: 100% camera face
     * - alpha = 0.5: 50% blend
     * - alpha = 1: 100% target face (fully morphed)
     */
    applyMorph() {
        if (!this.cameraLandmarks || !this.targetLandmarks) return;

        const { videoWidth, videoHeight } = this.video;
        const alpha = this.state.morphAmount;  // 0.0 to 1.0

        try {
            // Get pixel data from canvas (current camera frame)
            const srcData = this.outputCtx.getImageData(0, 0, videoWidth, videoHeight);

            // Get pixel data from target image
            const targetData = this.targetCtx.getImageData(0, 0, this.targetCanvas.width, this.targetCanvas.height);

            // Create output buffer for the morphed result
            const outputData = this.outputCtx.createImageData(videoWidth, videoHeight);

            // Check if morphing to an animal (uses different blending)
            const isAnimal = this.state.currentCategory === 'animals';

            // Call the morph engine to do the heavy lifting
            // This performs triangulation, warping, and blending
            this.morphEngine.morphFace(srcData, targetData, this.cameraLandmarks, this.targetLandmarks, alpha, outputData, isAnimal);

            // Write the morphed result to the canvas
            this.outputCtx.putImageData(outputData, 0, 0);
        } catch (e) { /* Silently handle errors */ }
    }

    // ============ ADDON ============

    calculateHeadRotation(landmarks) {
        const leftEye = landmarks[33], rightEye = landmarks[263], noseTip = landmarks[1];
        const leftCheek = landmarks[234], rightCheek = landmarks[454];
        const chin = landmarks[152], forehead = landmarks[10];

        if (!leftEye || !rightEye || !noseTip || !chin || !forehead) return { yaw: 0, roll: 0, pitch: 0 };

        const roll = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]);
        const noseToLeft = Math.hypot(noseTip[0] - leftCheek[0], noseTip[1] - leftCheek[1]);
        const noseToRight = Math.hypot(noseTip[0] - rightCheek[0], noseTip[1] - rightCheek[1]);
        const yaw = ((noseToLeft - noseToRight) / (noseToLeft + noseToRight)) * Math.PI * 0.5;

        return { yaw, roll, pitch: 0 };
    }

    applyAddon() {
        if (!this.cameraLandmarks || !this.state.selectedAddon) return;
        const addon = this.state.selectedAddon;
        if (!addon.imageElement) return;

        const landmarks = this.cameraLandmarks;
        let position, size;
        const rotation = this.calculateHeadRotation(landmarks);

        switch (addon.type) {
            case 'glasses':
            case 'sunglasses':
                const leftEye = landmarks[33], rightEye = landmarks[263];
                if (!leftEye || !rightEye) return;
                const eyeDist = Math.hypot(rightEye[0] - leftEye[0], rightEye[1] - leftEye[1]);
                size = { width: eyeDist * 2.2, height: (eyeDist * 2.2) * (addon.imageElement.height / addon.imageElement.width) };
                position = { x: (leftEye[0] + rightEye[0]) / 2, y: (leftEye[1] + rightEye[1]) / 2 };
                break;
            case 'moustache':
                const ml = landmarks[61], mr = landmarks[291];
                if (!ml || !mr) return;
                const mw = Math.hypot(mr[0] - ml[0], mr[1] - ml[1]);
                size = { width: mw * 1.8, height: (mw * 1.8) * (addon.imageElement.height / addon.imageElement.width) };
                position = { x: (ml[0] + mr[0]) / 2, y: (ml[1] + mr[1]) / 2 - size.height * 0.3 };
                break;
            case 'hat':
                const top = landmarks[10], left = landmarks[234], right = landmarks[454];
                if (!top || !left || !right) return;
                const fw = Math.hypot(right[0] - left[0], right[1] - left[1]);
                size = { width: fw * 1.8, height: (fw * 1.8) * (addon.imageElement.height / addon.imageElement.width) };
                position = { x: (left[0] + right[0]) / 2, y: top[1] - size.height * 0.2 };
                break;
            default: return;
        }

        this.outputCtx.save();
        this.outputCtx.translate(position.x, position.y);
        this.outputCtx.rotate(rotation.roll);
        this.outputCtx.scale(1 - Math.abs(rotation.yaw) * 0.3, 1);
        if (['hat', 'moustache', 'glasses', 'sunglasses'].includes(addon.type)) this.outputCtx.scale(1, -1);
        this.outputCtx.drawImage(addon.imageElement, -size.width / 2, -size.height / 2, size.width, size.height);
        this.outputCtx.restore();
    }

    // ============ CATEGORY & FILTERS ============

    loadCategory(category) {
        this.state.currentCategory = category;
        const allAssets = this.assets[category] || [];

        const gender = this.state.detectedGender;
        if (gender && category !== 'animals') {
            const filtered = allAssets.filter(a => a.gender === gender);
            this.currentAssets = filtered.length > 0 ? filtered : allAssets;
        } else {
            this.currentAssets = allAssets;
        }

        if (category !== 'addons') this.state.selectedAddon = null;

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Reset selection when switching categories
        this.state.selectedImageIndex = -1;
        this.state.morphAmount = 0;
        this.morphSlider.value = 0;
        this.morphValue.textContent = '0%';

        this.renderFilterCarousel();
    }

    renderFilterCarousel() {
        this.filterCarousel.innerHTML = '';

        this.currentAssets.forEach((asset, index) => {
            const item = document.createElement('div');
            item.className = 'filter-item' + (asset.isAddon ? ' addon-item' : '');
            item.dataset.index = index;

            const img = document.createElement('img');
            img.src = asset.image;
            img.alt = asset.name;
            img.loading = 'lazy';
            img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>'; };
            item.appendChild(img);

            // Filter interactions
            item.addEventListener('mousedown', () => this.onFilterDown(index));
            item.addEventListener('mouseup', () => this.onFilterUp(index));
            item.addEventListener('mouseleave', () => this.cancelFilterHold());
            item.addEventListener('touchstart', (e) => { e.preventDefault(); this.onFilterDown(index); });
            item.addEventListener('touchend', () => this.onFilterUp(index));

            this.filterCarousel.appendChild(item);
        });
    }

    onFilterDown(index) {
        this.isFilterHolding = true;
        this.filterDownTime = Date.now();

        // Start hold timer for video (800ms) - only if already selected
        if (this.state.selectedImageIndex === index) {
            this.filterHoldTimer = setTimeout(() => {
                if (this.isFilterHolding) {
                    this.startRecording(index);
                }
            }, 800);
        }
    }

    onFilterUp(index) {
        const wasHolding = this.isFilterHolding;
        const holdDuration = Date.now() - this.filterDownTime;
        this.isFilterHolding = false;

        if (this.filterHoldTimer) {
            clearTimeout(this.filterHoldTimer);
            this.filterHoldTimer = null;
        }

        if (this.state.isRecording) {
            // Stop recording
            this.stopRecording();
        } else if (wasHolding && holdDuration < 800) {
            // Quick tap (less than 800ms)
            if (this.state.selectedImageIndex === index) {
                // Already selected - take photo
                this.takeSnapshot();
            } else {
                // Not selected - select it (NO photo)
                this.selectAsset(index);
            }
        }
        // If holdDuration >= 800 and not recording, it means recording failed or was on unselected filter
    }

    cancelFilterHold() {
        if (this.filterHoldTimer) {
            clearTimeout(this.filterHoldTimer);
            this.filterHoldTimer = null;
        }
    }

    async selectAsset(index) {
        this.state.selectedImageIndex = index;
        const asset = this.currentAssets[index];
        if (!asset) return;

        // Update visual selection
        document.querySelectorAll('.filter-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        if (asset.isAddon) {
            this.state.selectedAddon = asset;
            this.targetImage = null;
            this.targetLandmarks = null;
            this.state.morphAmount = 0;
            this.morphSlider.value = 0;
            this.morphValue.textContent = '0%';
            this.showStatus(`${asset.name} selected`, false);
        } else {
            this.state.selectedAddon = null;

            try {
                this.targetImage = await this.loadImage(asset.image);
                this.targetCanvas.width = this.targetImage.width;
                this.targetCanvas.height = this.targetImage.height;
                this.targetCtx.drawImage(this.targetImage, 0, 0);

                const response = await fetch(asset.landmarks);
                if (response.ok) {
                    this.targetLandmarks = await response.json();
                    this.state.morphAmount = 1.0;
                    this.morphSlider.value = 100;
                    this.morphValue.textContent = '100%';
                    this.showStatus(`${asset.name} selected`, false);
                } else {
                    this.targetLandmarks = null;
                    this.showStatus(`No landmarks for ${asset.name}`, true);
                }
            } catch (e) {
                this.showStatus(`Failed to load ${asset.name}`, true);
            }
        }
    }

    // ============ CAPTURE ============

    takeSnapshot() {
        try {
            const dataUrl = this.outputCanvas.toDataURL('image/png');
            this.addToGallery(dataUrl, 'photo');

            // Flash effect
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;inset:0;background:white;opacity:0.8;pointer-events:none;z-index:9999;animation:flash 0.3s ease-out forwards;';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 300);

            if (!document.getElementById('flash-style')) {
                const style = document.createElement('style');
                style.id = 'flash-style';
                style.textContent = '@keyframes flash{0%{opacity:0.8}100%{opacity:0}}';
                document.head.appendChild(style);
            }
        } catch (e) {
            this.showStatus('Snapshot failed', true);
        }
    }

    startRecording(index) {
        if (this.state.isRecording) return;

        // Check if MediaRecorder is available
        if (typeof MediaRecorder === 'undefined') {
            this.showStatus('Recording not supported on this device', true);
            return;
        }

        try {
            const stream = this.outputCanvas.captureStream(30);
            if (this.stream) {
                this.stream.getAudioTracks().forEach(t => stream.addTrack(t));
            }

            // Detect supported MIME type - iOS Safari needs specific H.264/AAC codecs
            let mimeType = null;
            const mimeTypes = [
                // Safari/iOS specific (must be first for iOS)
                'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
                'video/mp4;codecs=h264,aac',
                'video/mp4',
                // Chrome/Firefox
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp8',
                'video/webm'
            ];

            for (const type of mimeTypes) {
                try {
                    if (MediaRecorder.isTypeSupported(type)) {
                        mimeType = type;
                        console.log('[Recording] Using MIME type:', type);
                        break;
                    }
                } catch (e) {
                    // isTypeSupported might throw on some browsers
                    continue;
                }
            }

            // Store the mime type for saving later
            this.recordingMimeType = mimeType || 'video/mp4';
            const ext = (mimeType && mimeType.includes('webm')) ? 'webm' : 'mp4';
            this.recordingExt = ext;

            // Create MediaRecorder with or without specific MIME type
            let options = {};
            if (mimeType) {
                options.mimeType = mimeType;
            }

            try {
                this.mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                // If that fails, try without specifying mimeType
                console.log('[Recording] Falling back to default codec');
                this.mediaRecorder = new MediaRecorder(stream);
                this.recordingMimeType = 'video/mp4';
                this.recordingExt = 'mp4';
            }

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onerror = (e) => {
                console.error('[Recording] MediaRecorder error:', e);
                this.showStatus('Recording error', true);
                this.state.isRecording = false;
            };

            this.mediaRecorder.onstop = () => this.saveRecording();

            this.mediaRecorder.start(100);
            this.state.isRecording = true;

            document.querySelectorAll('.filter-item')[index]?.classList.add('recording');
            this.showStatus('Recording...', false);
        } catch (e) {
            console.error('[Recording] Error:', e);
            this.showStatus('Video recording not available', true);
        }
    }

    stopRecording() {
        if (!this.state.isRecording || !this.mediaRecorder) return;
        this.mediaRecorder.stop();
        this.state.isRecording = false;
        document.querySelectorAll('.filter-item').forEach(item => item.classList.remove('recording'));
    }

    saveRecording() {
        if (this.recordedChunks.length === 0) return;
        const mimeType = this.recordingMimeType || 'video/mp4';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
            // Use the stored extension
            const ext = this.recordingExt || (mimeType.includes('webm') ? 'webm' : 'mp4');
            this.addToGallery(reader.result, 'video', ext);
        };
        reader.readAsDataURL(blob);
    }

    // ============ SCAN ============

    async scanGenderAndAge() {
        if (!this.faceApiLoaded) {
            this.showStatus('Detection not ready', true);
            return;
        }

        const btn = document.getElementById('scanBtnTop');
        btn.classList.add('scanning');

        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.outputCanvas.width;
            tempCanvas.height = this.outputCanvas.height;
            tempCanvas.getContext('2d').drawImage(this.outputCanvas, 0, 0);

            const detection = await faceapi.detectSingleFace(tempCanvas, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender();

            if (detection) {
                const gender = detection.gender;
                const age = Math.round(detection.age);
                const prob = Math.round(detection.genderProbability * 100);

                this.state.detectedGender = gender;
                this.scanGender.textContent = `${gender === 'male' ? '♂ Male' : '♀ Female'} (${prob}%)`;
                this.scanAge.textContent = `Age: ~${age}`;
                this.scanResultDisplay.classList.remove('hidden');
                this.scanBadge.textContent = age;
                this.scanBadge.classList.add('visible');

                this.loadCategory(this.state.currentCategory);
                setTimeout(() => this.scanResultDisplay.classList.add('hidden'), 5000);
            } else {
                this.showStatus('No face detected', true);
            }
        } catch (e) {
            this.showStatus('Scan failed', true);
        } finally {
            btn.classList.remove('scanning');
        }
    }

    // ============ EVENT LISTENERS ============

    setupEventListeners() {
        // Morph slider
        this.morphSlider.addEventListener('input', (e) => {
            this.state.morphAmount = parseInt(e.target.value) / 100;
            this.morphValue.textContent = `${e.target.value}%`;
        });

        // Navigation
        document.querySelectorAll('.nav-btn[data-category]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.category) this.loadCategory(btn.dataset.category);
            });
        });

        // Profile
        document.getElementById('profileBtn').addEventListener('click', () => this.openProfileModal());
        document.getElementById('closeProfileModal').addEventListener('click', () => this.closeProfileModal());
        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            this.state.profile.name = document.getElementById('profileName').value;
            this.state.profile.email = document.getElementById('profileEmail').value;
            this.saveProfile();
            this.closeProfileModal();
        });
        document.getElementById('clearProfileBtn').addEventListener('click', () => this.clearProfile());
        this.profileModal.addEventListener('click', (e) => { if (e.target === this.profileModal) this.closeProfileModal(); });

        // Gallery
        document.getElementById('galleryBtn').addEventListener('click', () => this.openGalleryModal());
        document.getElementById('closeGalleryModal').addEventListener('click', () => this.closeGalleryModal());
        document.getElementById('clearGalleryBtn').addEventListener('click', () => this.clearGallery());
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAllGallery());
        this.galleryModal.addEventListener('click', (e) => { if (e.target === this.galleryModal) this.closeGalleryModal(); });

        // Scan
        document.getElementById('scanBtnTop').addEventListener('click', () => this.scanGenderAndAge());

        // Effects
        document.getElementById('effectsBtn')?.addEventListener('click', () => this.toggleEffectsPanel());
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setEffect(btn.dataset.effect));
        });

        // Flip camera
        document.getElementById('flipCameraBtn')?.addEventListener('click', () => this.flipCamera());
    }

    openProfileModal() {
        document.getElementById('profileName').value = this.state.profile.name || '';
        document.getElementById('profileEmail').value = this.state.profile.email || '';
        this.profileModal.classList.remove('hidden');
    }

    closeProfileModal() { this.profileModal.classList.add('hidden'); }

    openGalleryModal() {
        this.renderGallery();
        this.galleryModal.classList.remove('hidden');
    }

    closeGalleryModal() { this.galleryModal.classList.add('hidden'); }

    toggleEffectsPanel() {
        this.effectsPanel.classList.toggle('hidden');
        document.getElementById('effectsBtn').classList.toggle('active', !this.effectsPanel.classList.contains('hidden'));
    }

    setEffect(effect) {
        this.state.currentEffect = effect;
        document.querySelectorAll('.effect-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.effect === effect));
        this.showStatus(`Effect: ${effect === 'none' ? 'None' : effect === 'bw' ? 'B&W' : 'Purple'}`, false);
    }

    async flipCamera() {
        try {
            // Stop current stream
            if (this.stream) this.stream.getTracks().forEach(t => t.stop());

            // Toggle facing mode
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

            // Try with exact constraint first (more reliable on mobile)
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { exact: this.currentFacingMode },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: true
                });
            } catch (exactError) {
                // Fallback to non-exact constraint
                console.log('[Camera] Exact constraint failed, trying fallback');
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: this.currentFacingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: true
                });
            }

            this.video.srcObject = stream;
            this.stream = stream;
            await new Promise(r => { this.video.onloadedmetadata = () => { this.video.play(); r(); }; });

            const cameraName = this.currentFacingMode === 'user' ? 'Front' : 'Back';
            this.showStatus(`${cameraName} camera`, false);
        } catch (e) {
            console.error('[Camera] Flip error:', e);
            // Revert facing mode on failure
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            this.showStatus('Could not flip camera', true);
        }
    }

    showStatus(message, isError = false) {
        this.statusText.textContent = message;
        this.statusText.classList.toggle('error', isError);
        this.statusOverlay.classList.add('visible');
        setTimeout(() => this.statusOverlay.classList.remove('visible'), 2500);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => { window.app = new FaceMorphApp(); });
