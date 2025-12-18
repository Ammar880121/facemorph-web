/**
 * ============================================================================
 * MORPH ENGINE - Face Morphing Core Algorithm
 * ============================================================================
 * 
 * This engine implements the face morphing algorithm using:
 * - Delaunay Triangulation (Bowyer-Watson algorithm)
 * - Affine Transformation (triangle warping)
 * - Feathered mask blending
 * 
 * ALGORITHM OVERVIEW:
 * -------------------
 * 1. TRIANGULATION: Divide face into triangles using Delaunay method
 *    - Uses 468 MediaPipe landmarks as vertices
 *    - Bowyer-Watson algorithm creates optimal triangle mesh
 * 
 * 2. WARPING: For each triangle pair (source ↔ target):
 *    - Compute affine transform matrix
 *    - Map each destination pixel to source using inverse transform
 *    - Sample source color using bilinear interpolation
 * 
 * 3. BLENDING: Combine warped face with original:
 *    - Create face mask from hull landmarks
 *    - Apply multiple blur passes for smooth feathering
 *    - Blend using: output = src*(1-mask*α) + warped*(mask*α)
 * 
 * KEY CONCEPTS:
 * -------------
 * - Hull Indices: 36 landmarks forming face boundary (contour)
 * - Affine Transform: 2x3 matrix that preserves lines & parallelism
 * - Circumcircle: Circle passing through all 3 triangle vertices
 * - Barycentric Coords: Way to express point position within triangle
 * 
 * CONVERTED FROM PYTHON:
 * ----------------------
 * Python version used cv2.Subdiv2D for triangulation.
 * Web version implements Bowyer-Watson algorithm manually.
 * 
 * @see https://en.wikipedia.org/wiki/Bowyer%E2%80%93Watson_algorithm
 * @see https://en.wikipedia.org/wiki/Delaunay_triangulation
 */

class MorphEngine {
    constructor() {
        /**
         * HULL INDICES - Face Boundary Landmarks
         * These 36 landmark indices form the convex hull (outline) of the face.
         * Used to create the face mask for blending the morphed result.
         * 
         * Visual representation (approximate positions):
         *     10 (forehead top)
         *    /              \
         *  109               338 (temples)
         *   |                 |
         *   |    (face)       |
         *   |                 |
         *  172               389 (cheeks)
         *    \              /
         *      152 (chin)
         */
        this.hullIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ];

        /**
         * KEY LANDMARK INDICES - Points used for triangulation
         * A subset of all 468 MediaPipe landmarks selected for:
         * - Dense coverage of facial features (eyes, nose, mouth)
         * - Stable triangulation with minimal artifacts
         * - Complete face coverage for seamless morphing
         */
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
     * ========================================================================
     * BOWYER-WATSON ALGORITHM - Delaunay Triangulation
     * ========================================================================
     * 
     * This algorithm creates an optimal triangulation of points where:
     * - No point lies inside any triangle's circumcircle
     * - Triangles are as "fat" as possible (no skinny triangles)
     * 
     * TIME COMPLEXITY: O(n²) where n = number of points
     * 
     * @param {number[][]} points - Array of [x, y] coordinates
     * @param {number} width - Image width (for super-triangle sizing)
     * @param {number} height - Image height (for super-triangle sizing)
     * @returns {number[][]} Array of triangles, each as [index1, index2, index3]
     */
    bowyerWatson(points, width, height) {
        const triangles = [];

        // ====================================================================
        // STEP 1: CREATE SUPER-TRIANGLE
        // ====================================================================
        // The super-triangle is a giant triangle that contains ALL points.
        // We need this as a starting triangulation to work with.
        // It will be removed at the end.
        //
        // Visual:
        //            S1 (top-left, far outside image)
        //           /  \
        //          /    \
        //         /  ALL \
        //        / POINTS \
        //       /  HERE    \
        //      S2__________S3  (corners far outside image)
        //
        const margin = Math.max(width, height) * 10;  // Make it 10x larger than image
        const superTri = [
            [-margin, -margin],                    // S1: Top-left corner
            [width + margin * 2, -margin],         // S2: Top-right corner
            [width / 2, height + margin * 2]       // S3: Bottom-center
        ];

        // Combine real points with super-triangle vertices
        // Super-triangle vertices are at indices n, n+1, n+2
        const allPoints = [...points, ...superTri];
        const n = points.length;  // Number of real face points

        // ====================================================================
        // STEP 2: INITIALIZE WITH SUPER-TRIANGLE
        // ====================================================================
        // Start with just the super-triangle (using indices n, n+1, n+2)
        let triList = [[n, n + 1, n + 2]];

        // ====================================================================
        // STEP 3: ADD EACH POINT ONE BY ONE
        // ====================================================================
        // For each new point, we:
        // 1. Find triangles whose circumcircle contains the point (these violate Delaunay)
        // 2. Remove those "bad" triangles, creating a hole
        // 3. Fill the hole by connecting the new point to all hole edges
        //
        for (let i = 0; i < n; i++) {
            const p = points[i];  // Current point to insert
            const badTriangles = []; // Triangles that violate Delaunay after adding p

            // ----------------------------------------------------------------
            // STEP 3a: FIND BAD TRIANGLES
            // ----------------------------------------------------------------
            // A triangle is "bad" if the new point lies inside its circumcircle.
            // The circumcircle is the unique circle passing through all 3 vertices.
            //
            // Visual of circumcircle test:
            //       A
            //      /|\
            //     / | \     ● = circumcircle
            //    /  |  \    
            //   B---+---C   If P is inside this circle,
            //       ●       triangle ABC is "bad"
            //       P
            //
            for (const tri of triList) {
                if (this.inCircumcircle(p, allPoints[tri[0]], allPoints[tri[1]], allPoints[tri[2]])) {
                    badTriangles.push(tri);
                }
            }

            // ----------------------------------------------------------------
            // STEP 3b: FIND THE POLYGONAL HOLE BOUNDARY
            // ----------------------------------------------------------------
            // When we remove bad triangles, we get a "hole" in the mesh.
            // We need to find the edges that form the boundary of this hole.
            // An edge is on the boundary if it's NOT shared by two bad triangles.
            //
            // Visual:
            //     Bad triangles removed:     Boundary edges:
            //        A───B───C                 A───B───C
            //        |\  |  /|                 |       |
            //        | \ | / |     →           |       |
            //        |  \|/  |                 |  hole |
            //        D───X───E                 D───────E
            //
            const polygon = [];  // Will hold boundary edges
            for (const tri of badTriangles) {
                // Get all 3 edges of this triangle
                const edges = [
                    [tri[0], tri[1]],  // Edge 1: vertex 0 to vertex 1
                    [tri[1], tri[2]],  // Edge 2: vertex 1 to vertex 2
                    [tri[2], tri[0]]   // Edge 3: vertex 2 to vertex 0
                ];

                // Check each edge: is it shared with another bad triangle?
                for (const edge of edges) {
                    let shared = false;
                    for (const other of badTriangles) {
                        if (tri === other) continue;  // Don't compare with self
                        if (this.hasEdge(other, edge)) {
                            shared = true;  // This edge is internal (shared)
                            break;
                        }
                    }
                    if (!shared) {
                        // This edge is on the boundary of the hole
                        polygon.push(edge);
                    }
                }
            }

            // ----------------------------------------------------------------
            // STEP 3c: REMOVE BAD TRIANGLES
            // ----------------------------------------------------------------
            triList = triList.filter(tri => !badTriangles.includes(tri));

            // ----------------------------------------------------------------
            // STEP 3d: RE-TRIANGULATE THE HOLE
            // ----------------------------------------------------------------
            // Connect the new point P to every edge of the hole boundary.
            // This creates new triangles that satisfy Delaunay property.
            //
            // Visual:
            //     Hole boundary:           After connecting P:
            //        A───B                     A───B
            //        |   |                     |\ /|
            //        |   |         →           | P |
            //        |   |                     |/ \|
            //        D───E                     D───E
            //
            for (const edge of polygon) {
                // Create new triangle: edge[0] → edge[1] → new point i
                triList.push([edge[0], edge[1], i]);
            }
        }

        // ====================================================================
        // STEP 4: REMOVE SUPER-TRIANGLE
        // ====================================================================
        // The super-triangle was just scaffolding. Remove any triangle that
        // uses super-triangle vertices (indices >= n).
        //
        const result = [];
        for (const tri of triList) {
            // Only keep triangles where ALL vertices are real face points
            if (tri[0] < n && tri[1] < n && tri[2] < n) {
                result.push(tri);
            }
        }

        return result;
    }

    /**
     * ========================================================================
     * CHECK IF TRIANGLE CONTAINS EDGE
     * ========================================================================
     * Simple helper to check if a triangle has a specific edge.
     * 
     * @param {number[]} tri - Triangle as [vertexIndex1, vertexIndex2, vertexIndex3]
     * @param {number[]} edge - Edge as [vertexIndex1, vertexIndex2]
     * @returns {boolean} True if the triangle contains this edge
     */
    hasEdge(tri, edge) {
        const [a, b] = edge;
        return (tri.includes(a) && tri.includes(b));
    }

    /**
     * ========================================================================
     * CIRCUMCIRCLE TEST
     * ========================================================================
     * Checks if point P lies inside the circumcircle of triangle ABC.
     * 
     * WHAT IS A CIRCUMCIRCLE?
     * The circumcircle is the unique circle that passes through all 3 vertices
     * of a triangle. Every triangle has exactly one circumcircle.
     * 
     * Visual:
     *            A
     *           /|\
     *          / | \
     *         /  |  \    ← The circumcircle passes through A, B, and C
     *        B---+---C
     *            ●
     *            P      ← Is P inside this circle?
     * 
     * MATH: Uses the determinant formula for circumcircle test.
     * The sign of the determinant tells us if P is inside (positive),
     * on the circle (zero), or outside (negative).
     * 
     * @param {number[]} p - Point to test [x, y]
     * @param {number[]} a - First vertex of triangle [x, y]
     * @param {number[]} b - Second vertex of triangle [x, y]
     * @param {number[]} c - Third vertex of triangle [x, y]
     * @returns {boolean} True if point p is inside the circumcircle
     */
    inCircumcircle(p, a, b, c) {
        // Translate points so P is at origin (simplifies the math)
        const ax = a[0] - p[0];
        const ay = a[1] - p[1];
        const bx = b[0] - p[0];
        const by = b[1] - p[1];
        const cx = c[0] - p[0];
        const cy = c[1] - p[1];

        // Compute the determinant using the formula:
        // | ax  ay  ax²+ay² |
        // | bx  by  bx²+by² |  > 0  means P is inside
        // | cx  cy  cx²+cy² |
        const det = (ax * ax + ay * ay) * (bx * cy - cx * by) -
            (bx * bx + by * by) * (ax * cy - cx * ay) +
            (cx * cx + cy * cy) * (ax * by - bx * ay);

        return det > 0;  // Positive = inside circumcircle
    }

    /**
     * ========================================================================
     * AFFINE TRANSFORMATION MATRIX
     * ========================================================================
     * Computes the 2D affine transformation matrix that maps source triangle
     * to destination triangle.
     * 
     * WHAT IS AN AFFINE TRANSFORM?
     * An affine transform preserves:
     * - Straight lines (lines remain lines)
     * - Parallelism (parallel lines stay parallel)
     * - Ratios of distances along lines
     * 
     * It can represent: rotation, scaling, shearing, translation (and combinations)
     * 
     * THE MATRIX:
     * [a  b  c]   [x]   [x']
     * [d  e  f] × [y] = [y']
     *             [1]
     * 
     * Where:
     * - x' = a*x + b*y + c  (new x coordinate)
     * - y' = d*x + e*y + f  (new y coordinate)
     * 
     * We solve for a,b,c,d,e,f by setting up equations:
     * - srcTri[0] → dstTri[0]
     * - srcTri[1] → dstTri[1]
     * - srcTri[2] → dstTri[2]
     * 
     * @param {number[][]} srcTri - Source triangle [[x0,y0], [x1,y1], [x2,y2]]
     * @param {number[][]} dstTri - Destination triangle [[u0,v0], [u1,v1], [u2,v2]]
     * @returns {number[]|null} [a, b, c, d, e, f] or null if degenerate triangle
     */
    computeAffineTransform(srcTri, dstTri) {
        // Extract source triangle vertices
        const [[x0, y0], [x1, y1], [x2, y2]] = srcTri;
        // Extract destination triangle vertices
        const [[u0, v0], [u1, v1], [u2, v2]] = dstTri;

        // Compute the determinant of the source triangle
        // This is 2x the signed area of the triangle
        // If zero, the triangle is degenerate (all points collinear)
        const det = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);
        if (Math.abs(det) < 1e-10) return null;  // Degenerate triangle

        const invDet = 1.0 / det;

        // Solve for affine matrix coefficients using Cramer's rule
        // These formulas come from solving the system of linear equations
        const a = ((u0 - u2) * (y1 - y2) - (u1 - u2) * (y0 - y2)) * invDet;
        const b = ((u1 - u2) * (x0 - x2) - (u0 - u2) * (x1 - x2)) * invDet;
        const c = u2 - a * x2 - b * y2;  // Translation component for x

        const d = ((v0 - v2) * (y1 - y2) - (v1 - v2) * (y0 - y2)) * invDet;
        const e = ((v1 - v2) * (x0 - x2) - (v0 - v2) * (x1 - x2)) * invDet;
        const f = v2 - d * x2 - e * y2;  // Translation component for y

        return [a, b, c, d, e, f];
    }

    /**
     * ========================================================================
     * POINT IN TRIANGLE TEST (Barycentric Coordinates)
     * ========================================================================
     * Checks if a point (px, py) is inside a triangle using barycentric coordinates.
     * 
     * WHAT ARE BARYCENTRIC COORDINATES?
     * Any point P can be expressed as a weighted sum of triangle vertices:
     * P = u*V0 + v*V1 + w*V2, where u + v + w = 1
     * 
     * If 0 ≤ u,v,w ≤ 1, the point is inside the triangle.
     * 
     * Visual:
     *        V2
     *        /\
     *       /  \
     *      / P  \    P is inside if u,v,w are all between 0 and 1
     *     /      \
     *    V0──────V1
     * 
     * @param {number} px - Point x coordinate
     * @param {number} py - Point y coordinate
     * @param {number[][]} tri - Triangle [[x0,y0], [x1,y1], [x2,y2]]
     * @returns {boolean} True if point is inside (or on edge of) triangle
     */
    isPointInTriangle(px, py, tri) {
        const [[x0, y0], [x1, y1], [x2, y2]] = tri;

        // Compute vectors from V0 to other vertices and to point P
        const v0x = x2 - x0;  // Vector from V0 to V2
        const v0y = y2 - y0;
        const v1x = x1 - x0;  // Vector from V0 to V1
        const v1y = y1 - y0;
        const v2x = px - x0;  // Vector from V0 to P
        const v2y = py - y0;

        // Compute dot products for the barycentric formula
        const dot00 = v0x * v0x + v0y * v0y;  // v0 · v0
        const dot01 = v0x * v1x + v0y * v1y;  // v0 · v1
        const dot02 = v0x * v2x + v0y * v2y;  // v0 · v2
        const dot11 = v1x * v1x + v1y * v1y;  // v1 · v1
        const dot12 = v1x * v2x + v1y * v2y;  // v1 · v2

        // Compute barycentric coordinates
        const denom = dot00 * dot11 - dot01 * dot01;
        if (Math.abs(denom) < 1e-10) return false;  // Degenerate triangle

        const invDenom = 1 / denom;
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        // Check if point is in triangle (with small tolerance for edge cases)
        // u >= 0, v >= 0, and u + v <= 1
        return (u >= -0.001) && (v >= -0.001) && (u + v <= 1.001);
    }

    /**
     * ========================================================================
     * WARP TRIANGLE - Core of Face Morphing
     * ========================================================================
     * Warps pixels from a source triangle to a destination triangle.
     * 
     * HOW IT WORKS:
     * 1. For each pixel in the DESTINATION triangle
     * 2. Use INVERSE transform to find where it came from in SOURCE
     * 3. Sample the source color (using bilinear interpolation)
     * 4. Write to destination
     * 
     * WHY INVERSE TRANSFORM?
     * We iterate over destination pixels (not source) because:
     * - Every destination pixel gets exactly one value (no gaps)
     * - We know exactly which pixels to fill
     * 
     * Visual:
     *     SOURCE                    DESTINATION
     *        A                          A'
     *       /\          warp           /\
     *      /  \        ----→          /  \
     *     /    \                     /    \
     *    B──────C                   B'─────C'
     * 
     * For each pixel P' in dest triangle:
     *   P = inverseTransform(P')  ← Find source location
     *   color = sample(source, P) ← Get color from source
     *   dest[P'] = color          ← Write to destination
     * 
     * @param {ImageData} srcData - Source image data
     * @param {ImageData} dstData - Destination image data (will be modified)
     * @param {number[][]} srcTri - Source triangle [[x0,y0], [x1,y1], [x2,y2]]
     * @param {number[][]} dstTri - Destination triangle
     */
    warpTriangle(srcData, dstData, srcTri, dstTri) {
        // ====================================================================
        // STEP 1: GET BOUNDING BOX OF DESTINATION TRIANGLE
        // ====================================================================
        // Instead of checking every pixel in the image, we only check pixels
        // within the bounding box of the destination triangle.
        //
        // Visual:
        //     ┌─────────────┐
        //     │    /\       │  ← Bounding box
        //     │   /  \      │
        //     │  /____\     │
        //     └─────────────┘
        //
        const minX = Math.max(0, Math.floor(Math.min(dstTri[0][0], dstTri[1][0], dstTri[2][0])));
        const maxX = Math.min(dstData.width - 1, Math.ceil(Math.max(dstTri[0][0], dstTri[1][0], dstTri[2][0])));
        const minY = Math.max(0, Math.floor(Math.min(dstTri[0][1], dstTri[1][1], dstTri[2][1])));
        const maxY = Math.min(dstData.height - 1, Math.ceil(Math.max(dstTri[0][1], dstTri[1][1], dstTri[2][1])));

        if (minX >= maxX || minY >= maxY) return;  // Triangle is outside image or degenerate

        // ====================================================================
        // STEP 2: COMPUTE INVERSE AFFINE TRANSFORM
        // ====================================================================
        // We need the transform that goes from DESTINATION → SOURCE
        // So we can ask: "For this destination pixel, where did it come from?"
        //
        const matrix = this.computeAffineTransform(dstTri, srcTri);
        if (!matrix) return;  // Degenerate triangle

        const [a, b, c, d, e, f] = matrix;  // Transform coefficients
        const srcWidth = srcData.width;
        const srcHeight = srcData.height;
        const dstWidth = dstData.width;

        // ====================================================================
        // STEP 3: ITERATE OVER DESTINATION PIXELS
        // ====================================================================
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Check if this pixel is actually inside the destination triangle
                // (bounding box includes pixels outside the triangle)
                if (!this.isPointInTriangle(x, y, dstTri)) continue;

                // ============================================================
                // STEP 4: APPLY INVERSE TRANSFORM
                // ============================================================
                // x' = a*x + b*y + c
                // y' = d*x + e*y + f
                const srcX = a * x + b * y + c;
                const srcY = d * x + e * y + f;

                // Check if source coordinates are within bounds
                if (srcX < 0 || srcX >= srcWidth - 1 || srcY < 0 || srcY >= srcHeight - 1) continue;

                // ============================================================
                // STEP 5: BILINEAR INTERPOLATION
                // ============================================================
                // The source coordinates are usually not exact integers.
                // We interpolate between the 4 nearest pixels for smooth results.
                //
                // Visual:
                //     (x0,y0)────(x1,y0)
                //        │    P    │      P = source point (may be between pixels)
                //        │    ●    │      
                //     (x0,y1)────(x1,y1)
                //
                const x0 = Math.floor(srcX);    // Left pixel
                const y0 = Math.floor(srcY);    // Top pixel
                const x1 = Math.min(x0 + 1, srcWidth - 1);   // Right pixel
                const y1 = Math.min(y0 + 1, srcHeight - 1);  // Bottom pixel
                const fx = srcX - x0;  // Fractional x (0 to 1)
                const fy = srcY - y0;  // Fractional y (0 to 1)

                const dstIdx = (y * dstWidth + x) * 4;  // Destination pixel index (RGBA = 4 bytes)

                // Interpolate each color channel (R, G, B)
                for (let ch = 0; ch < 3; ch++) {
                    // Get the 4 neighboring pixel values
                    const v00 = srcData.data[(y0 * srcWidth + x0) * 4 + ch];  // Top-left
                    const v10 = srcData.data[(y0 * srcWidth + x1) * 4 + ch];  // Top-right
                    const v01 = srcData.data[(y1 * srcWidth + x0) * 4 + ch];  // Bottom-left
                    const v11 = srcData.data[(y1 * srcWidth + x1) * 4 + ch];  // Bottom-right

                    // Bilinear interpolation formula:
                    // value = v00*(1-fx)*(1-fy) + v10*fx*(1-fy) + v01*(1-fx)*fy + v11*fx*fy
                    const value = v00 * (1 - fx) * (1 - fy) +
                        v10 * fx * (1 - fy) +
                        v01 * (1 - fx) * fy +
                        v11 * fx * fy;

                    dstData.data[dstIdx + ch] = Math.round(value);
                }
                dstData.data[dstIdx + 3] = 255;  // Alpha = fully opaque
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
