/**
 * Face Morph Engine - Corrected Version
 * Handles Delaunay triangulation and affine warping for face morphing
 * Based on the working Python implementation
 */

class MorphEngine {
    constructor() {
        // Hull indices for face boundary (same as Python version)
        this.hullIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ];

        // Key landmark indices to use for triangulation (reduced set for stability)
        // Using major face landmarks for more stable triangulation
        this.keyLandmarkIndices = this.getKeyLandmarkIndices();
    }

    /**
     * Get key landmark indices for triangulation
     * Using comprehensive landmarks for stable and complete face morphing
     */
    getKeyLandmarkIndices() {
        const indices = new Set();

        // Face contour (full)
        [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109].forEach(i => indices.add(i));

        // Left eye (complete contour)
        [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
            130, 25, 110, 24, 23, 22, 26, 112, 243, 190, 56, 28, 27, 29, 30, 247].forEach(i => indices.add(i));

        // Right eye (complete contour)  
        [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
            359, 255, 339, 254, 253, 252, 256, 341, 463, 414, 286, 258, 257, 259, 260, 467].forEach(i => indices.add(i));

        // Left eyebrow
        [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 124, 35, 111, 117, 118, 119, 120, 121, 128, 245].forEach(i => indices.add(i));

        // Right eyebrow
        [300, 293, 334, 296, 336, 285, 295, 282, 283, 276, 353, 265, 340, 346, 347, 348, 349, 350, 357, 465].forEach(i => indices.add(i));

        // Nose (complete)
        [1, 2, 98, 327, 4, 5, 6, 168, 197, 195, 19, 94, 164, 0, 11, 12, 13, 14, 15, 16, 17, 18,
            200, 199, 175, 129, 209, 49, 48, 219, 166, 79, 218, 237, 44, 1, 274, 457, 275, 278,
            279, 360, 363, 420, 399, 412, 351, 6, 122, 196, 3, 51, 45, 275].forEach(i => indices.add(i));

        // Lips outer (COMPLETE - all outer lip landmarks)
        [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
            61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
            76, 77, 90, 180, 85, 16, 315, 404, 320, 307, 306, 408, 304, 303, 302, 11, 72, 38, 41, 74].forEach(i => indices.add(i));

        // Lips inner (COMPLETE - all inner lip landmarks)
        [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
            78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95].forEach(i => indices.add(i));

        // Mouth interior (teeth area connections)
        [62, 96, 89, 179, 86, 15, 316, 403, 319, 325, 307, 292, 306, 408, 304, 303, 302,
            183, 42, 73, 72, 11, 302, 303, 304, 408, 306, 292, 307, 325, 319, 403, 316, 15, 86, 179, 89, 96, 62].forEach(i => indices.add(i));

        // Chin and jaw area
        [152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
            377, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389, 251, 284, 332, 297, 338, 10,
            175, 171, 140, 169, 170, 211].forEach(i => indices.add(i));

        // Additional face interior points for better triangulation
        [36, 205, 206, 207, 187, 147, 123, 116, 137, 227, 34, 139, 143, 35, 124,
            266, 425, 426, 427, 411, 376, 352, 345, 366, 447, 264, 368, 372, 265, 353].forEach(i => indices.add(i));

        // Iris centers for eye alignment
        [468, 469, 470, 471, 472, 473, 474, 475, 476, 477].forEach(i => indices.add(i));

        // Cheek and face interior for denser mesh
        [101, 100, 142, 126, 47, 114, 188, 217, 174, 196, 197, 419, 248, 281,
            329, 330, 280, 346, 352, 371, 266, 423, 426, 436, 432, 422, 410, 287,
            50, 36, 115, 131, 198, 126, 204, 202, 212, 214, 192, 213].forEach(i => indices.add(i));

        // Forehead area (usually covered but helps with hats)
        [68, 69, 104, 108, 151, 337, 299, 333, 298, 301].forEach(i => indices.add(i));

        // More nose bridge and sides
        [193, 168, 417, 245, 244, 233, 232, 231, 230, 229, 228, 31, 32, 33, 246,
            261, 262, 448, 449, 450, 451, 452, 453].forEach(i => indices.add(i));

        return Array.from(indices).sort((a, b) => a - b);
    }

    /**
     * Compute Delaunay triangulation using Bowyer-Watson algorithm
     * @param {number[][]} points - Array of [x, y] coordinates  
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {number[][]} Array of triangle vertex indices
     */
    computeDelaunay(points, width, height) {
        if (!points || points.length < 3) return [];

        // Filter valid points
        const validPoints = [];
        const indexMap = {};  // maps filtered index back to original index

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p && typeof p[0] === 'number' && typeof p[1] === 'number' &&
                p[0] >= 0 && p[0] < width && p[1] >= 0 && p[1] < height) {
                indexMap[validPoints.length] = i;
                validPoints.push([p[0], p[1]]);
            }
        }

        if (validPoints.length < 3) return [];

        // Use a simpler approach: Delaunay via ear clipping with proper sorting
        const triangles = this.bowyerWatson(validPoints, width, height);

        // Map back to original indices
        return triangles.map(tri => [
            indexMap[tri[0]],
            indexMap[tri[1]],
            indexMap[tri[2]]
        ]).filter(tri => tri[0] !== undefined && tri[1] !== undefined && tri[2] !== undefined);
    }

    /**
     * Bowyer-Watson algorithm for Delaunay triangulation
     */
    bowyerWatson(points, width, height) {
        const triangles = [];

        // Create super-triangle that contains all points
        const margin = Math.max(width, height) * 10;
        const superTri = [
            [-margin, -margin],
            [width + margin * 2, -margin],
            [width / 2, height + margin * 2]
        ];

        // Add super-triangle vertices to points array
        const allPoints = [...points, ...superTri];
        const n = points.length;

        // Start with super-triangle
        let triList = [[n, n + 1, n + 2]];

        // Add each point one at a time
        for (let i = 0; i < n; i++) {
            const p = points[i];
            const badTriangles = [];

            // Find all triangles whose circumcircle contains the point
            for (const tri of triList) {
                if (this.inCircumcircle(p, allPoints[tri[0]], allPoints[tri[1]], allPoints[tri[2]])) {
                    badTriangles.push(tri);
                }
            }

            // Find the boundary of the polygonal hole
            const polygon = [];
            for (const tri of badTriangles) {
                const edges = [
                    [tri[0], tri[1]],
                    [tri[1], tri[2]],
                    [tri[2], tri[0]]
                ];

                for (const edge of edges) {
                    let shared = false;
                    for (const other of badTriangles) {
                        if (tri === other) continue;
                        if (this.hasEdge(other, edge)) {
                            shared = true;
                            break;
                        }
                    }
                    if (!shared) {
                        polygon.push(edge);
                    }
                }
            }

            // Remove bad triangles
            triList = triList.filter(tri => !badTriangles.includes(tri));

            // Re-triangulate the hole
            for (const edge of polygon) {
                triList.push([edge[0], edge[1], i]);
            }
        }

        // Remove triangles that use super-triangle vertices
        const result = [];
        for (const tri of triList) {
            if (tri[0] < n && tri[1] < n && tri[2] < n) {
                result.push(tri);
            }
        }

        return result;
    }

    /**
     * Check if triangle contains edge
     */
    hasEdge(tri, edge) {
        const [a, b] = edge;
        return (tri.includes(a) && tri.includes(b));
    }

    /**
     * Check if point p is inside the circumcircle of triangle abc
     */
    inCircumcircle(p, a, b, c) {
        const ax = a[0] - p[0];
        const ay = a[1] - p[1];
        const bx = b[0] - p[0];
        const by = b[1] - p[1];
        const cx = c[0] - p[0];
        const cy = c[1] - p[1];

        const det = (ax * ax + ay * ay) * (bx * cy - cx * by) -
            (bx * bx + by * by) * (ax * cy - cx * ay) +
            (cx * cx + cy * cy) * (ax * by - bx * ay);

        return det > 0;
    }

    /**
     * Compute affine transformation matrix from srcTri to dstTri
     */
    computeAffineTransform(srcTri, dstTri) {
        const [[x0, y0], [x1, y1], [x2, y2]] = srcTri;
        const [[u0, v0], [u1, v1], [u2, v2]] = dstTri;

        // Compute the determinant of the source triangle
        const det = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);
        if (Math.abs(det) < 1e-10) return null;

        const invDet = 1.0 / det;

        // Compute affine matrix coefficients
        const a = ((u0 - u2) * (y1 - y2) - (u1 - u2) * (y0 - y2)) * invDet;
        const b = ((u1 - u2) * (x0 - x2) - (u0 - u2) * (x1 - x2)) * invDet;
        const c = u2 - a * x2 - b * y2;

        const d = ((v0 - v2) * (y1 - y2) - (v1 - v2) * (y0 - y2)) * invDet;
        const e = ((v1 - v2) * (x0 - x2) - (v0 - v2) * (x1 - x2)) * invDet;
        const f = v2 - d * x2 - e * y2;

        return [a, b, c, d, e, f];
    }

    /**
     * Check if point is inside triangle using barycentric coordinates
     */
    isPointInTriangle(px, py, tri) {
        const [[x0, y0], [x1, y1], [x2, y2]] = tri;

        const v0x = x2 - x0;
        const v0y = y2 - y0;
        const v1x = x1 - x0;
        const v1y = y1 - y0;
        const v2x = px - x0;
        const v2y = py - y0;

        const dot00 = v0x * v0x + v0y * v0y;
        const dot01 = v0x * v1x + v0y * v1y;
        const dot02 = v0x * v2x + v0y * v2y;
        const dot11 = v1x * v1x + v1y * v1y;
        const dot12 = v1x * v2x + v1y * v2y;

        const denom = dot00 * dot11 - dot01 * dot01;
        if (Math.abs(denom) < 1e-10) return false;

        const invDenom = 1 / denom;
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        return (u >= -0.001) && (v >= -0.001) && (u + v <= 1.001);
    }

    /**
     * Warp a single triangle from source to destination
     */
    warpTriangle(srcData, dstData, srcTri, dstTri) {
        // Get bounding box of destination triangle
        const minX = Math.max(0, Math.floor(Math.min(dstTri[0][0], dstTri[1][0], dstTri[2][0])));
        const maxX = Math.min(dstData.width - 1, Math.ceil(Math.max(dstTri[0][0], dstTri[1][0], dstTri[2][0])));
        const minY = Math.max(0, Math.floor(Math.min(dstTri[0][1], dstTri[1][1], dstTri[2][1])));
        const maxY = Math.min(dstData.height - 1, Math.ceil(Math.max(dstTri[0][1], dstTri[1][1], dstTri[2][1])));

        if (minX >= maxX || minY >= maxY) return;

        // Compute inverse affine transform (from dst to src)
        const matrix = this.computeAffineTransform(dstTri, srcTri);
        if (!matrix) return;

        const [a, b, c, d, e, f] = matrix;
        const srcWidth = srcData.width;
        const srcHeight = srcData.height;
        const dstWidth = dstData.width;

        // Iterate over destination bounding box
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Check if point is inside destination triangle
                if (!this.isPointInTriangle(x, y, dstTri)) continue;

                // Apply inverse transform to get source coordinates
                const srcX = a * x + b * y + c;
                const srcY = d * x + e * y + f;

                // Check bounds
                if (srcX < 0 || srcX >= srcWidth - 1 || srcY < 0 || srcY >= srcHeight - 1) continue;

                // Bilinear interpolation
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = Math.min(x0 + 1, srcWidth - 1);
                const y1 = Math.min(y0 + 1, srcHeight - 1);
                const fx = srcX - x0;
                const fy = srcY - y0;

                const dstIdx = (y * dstWidth + x) * 4;

                for (let ch = 0; ch < 3; ch++) {
                    const v00 = srcData.data[(y0 * srcWidth + x0) * 4 + ch];
                    const v10 = srcData.data[(y0 * srcWidth + x1) * 4 + ch];
                    const v01 = srcData.data[(y1 * srcWidth + x0) * 4 + ch];
                    const v11 = srcData.data[(y1 * srcWidth + x1) * 4 + ch];

                    const value = v00 * (1 - fx) * (1 - fy) +
                        v10 * fx * (1 - fy) +
                        v01 * (1 - fx) * fy +
                        v11 * fx * fy;

                    dstData.data[dstIdx + ch] = Math.round(value);
                }
                dstData.data[dstIdx + 3] = 255;
            }
        }
    }

    /**
     * Create face hull mask with smooth edges
     * Uses multiple blur passes for ultra-smooth feathering
     */
    createFaceMask(landmarks, width, height) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext('2d');

        // Fill with black background
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, width, height);

        // Get hull points
        const hullPoints = this.hullIndices.map(i => landmarks[i]).filter(p => p && p[0] !== undefined);
        if (hullPoints.length < 3) return null;

        // Calculate face center and scale inward for erosion
        let cx = 0, cy = 0;
        hullPoints.forEach(p => { cx += p[0]; cy += p[1]; });
        cx /= hullPoints.length;
        cy /= hullPoints.length;

        // Erode the hull slightly inward (98% scale - minimal erosion for maximum coverage)
        const erosionFactor = 0.98;
        const erodedPoints = hullPoints.map(p => [
            cx + (p[0] - cx) * erosionFactor,
            cy + (p[1] - cy) * erosionFactor
        ]);

        // Draw filled polygon with eroded hull
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.moveTo(erodedPoints[0][0], erodedPoints[0][1]);
        for (let i = 1; i < erodedPoints.length; i++) {
            maskCtx.lineTo(erodedPoints[i][0], erodedPoints[i][1]);
        }
        maskCtx.closePath();
        maskCtx.fill();

        // Apply multiple blur passes for ultra-smooth feathering
        // Pass 1: Extra large blur for very smooth edges
        maskCtx.filter = 'blur(60px)';
        maskCtx.drawImage(maskCanvas, 0, 0);

        // Pass 2: Large blur
        maskCtx.filter = 'blur(50px)';
        maskCtx.drawImage(maskCanvas, 0, 0);

        // Pass 3: Medium blur
        maskCtx.filter = 'blur(40px)';
        maskCtx.drawImage(maskCanvas, 0, 0);

        // Pass 4: Small blur for smooth gradient
        maskCtx.filter = 'blur(25px)';
        maskCtx.drawImage(maskCanvas, 0, 0);

        // Pass 4: Final polish
        maskCtx.filter = 'blur(10px)';
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = 'none';

        return maskCtx.getImageData(0, 0, width, height);
    }

    /**
     * Detect how open the mouth is (0 = closed, 1 = fully open)
     * Uses the ratio of vertical to horizontal mouth opening
     */
    detectMouthOpenness(landmarks) {
        // Inner lip landmarks for mouth opening detection
        // Top inner lip: 13 (center top)
        // Bottom inner lip: 14 (center bottom)
        // Left corner: 78
        // Right corner: 308

        const topLip = landmarks[13];
        const bottomLip = landmarks[14];
        const leftCorner = landmarks[78];
        const rightCorner = landmarks[308];

        if (!topLip || !bottomLip || !leftCorner || !rightCorner) return 0;

        // Vertical opening (distance between top and bottom inner lips)
        const verticalOpening = Math.abs(bottomLip[1] - topLip[1]);

        // Horizontal width of mouth
        const horizontalWidth = Math.abs(rightCorner[0] - leftCorner[0]);

        if (horizontalWidth < 1) return 0;

        // Ratio of vertical to horizontal (higher = more open)
        const ratio = verticalOpening / horizontalWidth;

        // Normalize: typically ratio < 0.1 is closed, > 0.3 is wide open
        // Map to 0-1 range with some threshold
        const openness = Math.max(0, Math.min(1, (ratio - 0.08) / 0.25));

        return openness;
    }

    /**
     * Create a mask for the mouth interior region
     * This mask is white inside the mouth opening (where teeth would show)
     */
    createMouthInteriorMask(landmarks, width, height, openness) {
        if (openness < 0.15) return null; // Mouth is essentially closed

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext('2d');

        // Fill with black (no mouth)
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, width, height);

        // Inner lip landmarks (forming the mouth opening)
        // These landmarks form the inner contour of the lips
        const innerLipIndices = [
            78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308,
            324, 318, 402, 317, 14, 87, 178, 88, 95
        ];

        const innerLipPoints = innerLipIndices
            .map(i => landmarks[i])
            .filter(p => p && p[0] !== undefined);

        if (innerLipPoints.length < 10) return null;

        // Draw the mouth interior polygon
        maskCtx.fillStyle = 'white';
        maskCtx.beginPath();
        maskCtx.moveTo(innerLipPoints[0][0], innerLipPoints[0][1]);
        for (let i = 1; i < innerLipPoints.length; i++) {
            maskCtx.lineTo(innerLipPoints[i][0], innerLipPoints[i][1]);
        }
        maskCtx.closePath();
        maskCtx.fill();

        // Apply slight blur for smooth edges
        maskCtx.filter = 'blur(3px)';
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = 'none';

        // Scale mask by openness (more open = stronger mask)
        const maskData = maskCtx.getImageData(0, 0, width, height);
        const scaleFactor = Math.min(1, openness * 1.5); // Boost effect slightly

        for (let i = 0; i < maskData.data.length; i += 4) {
            maskData.data[i] = Math.round(maskData.data[i] * scaleFactor);
        }

        return maskData;
    }


    /**
     * Apply color correction to match skin tones
     */
    colorCorrect(srcData, targetData, mask, width, height) {
        // Calculate average colors in masked region for both images
        let srcR = 0, srcG = 0, srcB = 0, srcCount = 0;
        let tgtR = 0, tgtG = 0, tgtB = 0, tgtCount = 0;

        for (let i = 0; i < mask.data.length; i += 4) {
            const maskVal = mask.data[i] / 255;
            if (maskVal > 0.5) {
                srcR += srcData.data[i];
                srcG += srcData.data[i + 1];
                srcB += srcData.data[i + 2];
                srcCount++;

                tgtR += targetData.data[i];
                tgtG += targetData.data[i + 1];
                tgtB += targetData.data[i + 2];
                tgtCount++;
            }
        }

        if (srcCount === 0 || tgtCount === 0) return targetData;

        // Average colors
        srcR /= srcCount; srcG /= srcCount; srcB /= srcCount;
        tgtR /= tgtCount; tgtG /= tgtCount; tgtB /= tgtCount;

        // Color correction factors (stronger blend for better skin matching)
        const correctionStrength = 0.5;
        const rFactor = 1 + correctionStrength * (srcR - tgtR) / Math.max(tgtR, 1);
        const gFactor = 1 + correctionStrength * (srcG - tgtG) / Math.max(tgtG, 1);
        const bFactor = 1 + correctionStrength * (srcB - tgtB) / Math.max(tgtB, 1);

        // Apply correction
        const corrected = new ImageData(width, height);
        for (let i = 0; i < targetData.data.length; i += 4) {
            corrected.data[i] = Math.min(255, Math.max(0, Math.round(targetData.data[i] * rFactor)));
            corrected.data[i + 1] = Math.min(255, Math.max(0, Math.round(targetData.data[i + 1] * gFactor)));
            corrected.data[i + 2] = Math.min(255, Math.max(0, Math.round(targetData.data[i + 2] * bFactor)));
            corrected.data[i + 3] = targetData.data[i + 3];
        }

        return corrected;
    }

    /**
     * Perform face morphing - main function
     * This matches the Python implementation more closely
     * @param {boolean} isAnimal - If true, use full opacity for animals
     */
    morphFace(srcImageData, targetImageData, srcLandmarks, targetLandmarks, alpha, outputData, isAnimal = false) {
        try {
            const width = outputData.width;
            const height = outputData.height;

            // Validate inputs
            if (!srcLandmarks || srcLandmarks.length < 400) {
                console.error('[MorphEngine] Invalid source landmarks:', srcLandmarks?.length);
                for (let i = 0; i < srcImageData.data.length; i++) {
                    outputData.data[i] = srcImageData.data[i];
                }
                return;
            }
            if (!targetLandmarks || targetLandmarks.length < 400) {
                console.error('[MorphEngine] Invalid target landmarks:', targetLandmarks?.length);
                for (let i = 0; i < srcImageData.data.length; i++) {
                    outputData.data[i] = srcImageData.data[i];
                }
                return;
            }

            // Scale target landmarks to match source dimensions
            const scaleX = srcImageData.width / targetImageData.width;
            const scaleY = srcImageData.height / targetImageData.height;

            const scaledTargetLandmarks = targetLandmarks.map(p => {
                if (!p || p[0] === undefined) return null;
                return [p[0] * scaleX, p[1] * scaleY];
            });

            // Compute Delaunay triangulation from TARGET landmarks (not camera)
            // This ensures consistent triangulation like the Python version
            // The target image landmarks are stable, camera landmarks change every frame
            const keyTargetPoints = this.keyLandmarkIndices
                .filter(i => scaledTargetLandmarks[i] && scaledTargetLandmarks[i][0] !== undefined)
                .map(i => ({ idx: i, pt: scaledTargetLandmarks[i] }));

            const trianglePoints = keyTargetPoints.map(p => p.pt);
            const triangles = this.computeDelaunay(trianglePoints, width, height);

            // Map triangle indices back to original landmark indices
            const mappedTriangles = triangles.map(tri => [
                keyTargetPoints[tri[0]].idx,
                keyTargetPoints[tri[1]].idx,
                keyTargetPoints[tri[2]].idx
            ]).filter(tri =>
                tri[0] < srcLandmarks.length &&
                tri[1] < srcLandmarks.length &&
                tri[2] < srcLandmarks.length &&
                tri[0] < scaledTargetLandmarks.length &&
                tri[1] < scaledTargetLandmarks.length &&
                tri[2] < scaledTargetLandmarks.length
            );

            // Initialize output with source
            for (let i = 0; i < srcImageData.data.length; i++) {
                outputData.data[i] = srcImageData.data[i];
            }

            // Scale target image to source size
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = srcImageData.width;
            tempCanvas.height = srcImageData.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Create ImageData from target
            const targetCanvas = document.createElement('canvas');
            targetCanvas.width = targetImageData.width;
            targetCanvas.height = targetImageData.height;
            const targetCtx = targetCanvas.getContext('2d');
            targetCtx.putImageData(targetImageData, 0, 0);

            // Draw scaled
            tempCtx.drawImage(targetCanvas, 0, 0, srcImageData.width, srcImageData.height);
            const scaledTargetData = tempCtx.getImageData(0, 0, srcImageData.width, srcImageData.height);

            // Create warped image buffer (initialized to transparent)
            const warpedData = new ImageData(width, height);

            // Warp each triangle from TARGET to SOURCE position
            // This is the key: we warp the target image's content into the shape of the source landmarks
            for (const indices of mappedTriangles) {
                const [i, j, k] = indices;

                // Skip invalid indices
                if (i >= srcLandmarks.length || j >= srcLandmarks.length || k >= srcLandmarks.length) continue;
                if (i >= scaledTargetLandmarks.length || j >= scaledTargetLandmarks.length || k >= scaledTargetLandmarks.length) continue;

                const srcTri = [srcLandmarks[i], srcLandmarks[j], srcLandmarks[k]];
                const targetTri = [scaledTargetLandmarks[i], scaledTargetLandmarks[j], scaledTargetLandmarks[k]];

                // Check for valid points
                if (!srcTri[0] || !srcTri[1] || !srcTri[2]) continue;
                if (!targetTri[0] || !targetTri[1] || !targetTri[2]) continue;

                // Skip degenerate triangles
                const srcArea = Math.abs(
                    (srcTri[1][0] - srcTri[0][0]) * (srcTri[2][1] - srcTri[0][1]) -
                    (srcTri[2][0] - srcTri[0][0]) * (srcTri[1][1] - srcTri[0][1])
                );
                const targetArea = Math.abs(
                    (targetTri[1][0] - targetTri[0][0]) * (targetTri[2][1] - targetTri[0][1]) -
                    (targetTri[2][0] - targetTri[0][0]) * (targetTri[1][1] - targetTri[0][1])
                );
                if (srcArea < 1.0 || targetArea < 1.0) continue;

                // Warp from target to source position
                this.warpTriangle(scaledTargetData, warpedData, targetTri, srcTri);
            }

            // Create face mask
            const mask = this.createFaceMask(srcLandmarks, width, height);
            if (!mask) {
                console.error('[MorphEngine] Failed to create face mask');
                return;
            }

            // Detect mouth openness and create mouth interior mask
            const mouthOpenness = this.detectMouthOpenness(srcLandmarks);
            const mouthMask = this.createMouthInteriorMask(srcLandmarks, width, height, mouthOpenness);

            // Apply color correction to warped data to match source skin tones
            const correctedWarpedData = this.colorCorrect(srcImageData, warpedData, mask, width, height);

            // Blend source and warped target using mask
            for (let i = 0; i < outputData.data.length; i += 4) {
                const maskValue = mask.data[i] / 255;

                // Calculate blend factor based on category
                let blendFactor;
                if (isAnimal) {
                    // For animals: use full opacity in masked area
                    // No transparency - if mask > 0.1, show full morph
                    blendFactor = maskValue > 0.1 ? alpha : 0;
                } else if (alpha > 0.95) {
                    // At 100% for humans: boost entire masked area
                    blendFactor = Math.sqrt(maskValue) * alpha;
                } else {
                    // Normal blend for lower percentages
                    blendFactor = maskValue * alpha;
                }

                // Check if this pixel is inside the mouth opening (for teeth preservation)
                let mouthFactor = 0;
                if (mouthMask && !isAnimal) {
                    mouthFactor = mouthMask.data[i] / 255;
                }

                // Only blend if we have valid warped data (alpha > 0)
                const hasWarpedPixel = warpedData.data[i + 3] > 0;

                for (let ch = 0; ch < 3; ch++) {
                    if (hasWarpedPixel && blendFactor > 0.01) {
                        // Calculate the morphed pixel
                        const morphedPixel = srcImageData.data[i + ch] * (1 - blendFactor) +
                            correctedWarpedData.data[i + ch] * blendFactor;

                        // If mouth is open and this is inside the mouth, blend back to source (show teeth)
                        if (mouthFactor > 0.1) {
                            // Inside mouth opening: blend back towards source to show teeth
                            outputData.data[i + ch] = Math.round(
                                morphedPixel * (1 - mouthFactor) +
                                srcImageData.data[i + ch] * mouthFactor
                            );
                        } else {
                            outputData.data[i + ch] = Math.round(morphedPixel);
                        }
                    } else {
                        // Keep source pixel if no warped data or very low blend
                        outputData.data[i + ch] = srcImageData.data[i + ch];
                    }
                }
                outputData.data[i + 3] = 255;
            }
        } catch (error) {
            console.error('[MorphEngine] Error in morphFace:', error);
            // On error, copy source to output
            for (let i = 0; i < srcImageData.data.length; i++) {
                outputData.data[i] = srcImageData.data[i];
            }
        }
    }
}

// Export for use in app.js
window.MorphEngine = MorphEngine;
