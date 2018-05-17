/**
 * Adapted from a Gist by Bostock (link below).
 * A general search-based method for finding the nearest point along an SVG path to a given point.
 * Uses a coarse (linear) and then a fine (binary) search to find a point within tolerance.
 *
 * @see https://gist.github.com/mbostock/8027637
 *
 * There are also bézier-specific methods, but this one will do and seems simpler.
 *
 * @see https://stackoverflow.com/a/44993719/716898
 * @see https://www.npmjs.com/package/jsbezier
 *
 * @todo Do we need to polyfill `getPointAtLength`?
 */

/**
 * Convenience to find the squared distance between point objects.
 *
 * @param {Object.<Number>} a 2D point, in object form.
 * @param {Object.<Number>} b 2D point, in object form.
 * @return {Number} Squared distance between the points.
 */
function dist2(a, b) {
    const dx = a.x-b.x;
    const dy = a.y-b.y;

    return (dx*dx)+(dy*dy);
}

/**
 * A coarse and fine search to find the closest approximate point along a path to a given point.
 *
 * @param {SVG.Path} path An SVG path.
 * @param {Object.<Number>} point 2D point, in object form.
 * @param {Number?} limit Minimum threshold of accuracy for the result.
 * @param {Number?} step Starting precision.
 * @param {Number?} length Starting length, if given, will be used instead of the coarse step.
 * @param {(String|Object)?} type Type of result - 'length'/'point'/'distance2', or an object to
 *                                be assigned all of them.
 * @return {(Number|Object.<Number>|Object)} Values for the closest point on the path to the
 *                                           given point - in the form denoted by `type`.
 */
export function nearestOnPath(path, point, limit = 0.5, step = 8, length = -1, type = 'length') {
    let pathL = path.getTotalLength();
    let bestD2 = Infinity;
    let best, bestL;

    if(0 <= length && length <= pathL) {
        bestL = length;
        best = path.getPointAtLength(bestL);
    }
    else {
        // Linear scan - coarse approximation.
        for(let scanL = 0; scanL <= pathL; scanL += step) {
            const scan = path.getPointAtLength(scanL);
            const scanD2 = dist2(point, scan);

            if(scanD2 < bestD2) {
                best = scan, bestL = scanL, bestD2 = scanD2;
            }
        }

        step *= 0.5;
    }


    // Binary search - precise estimate.

    while(step > limit) {
        let prev, prevL, prevD2, next, nextL, nextD2;

        if((prevL = bestL-step) >= 0 &&
                (prevD2 = dist2(point, (prev = path.getPointAtLength(prevL)))) < bestD2) {
            best = prev, bestL = prevL, bestD2 = prevD2;
        }
        else if((nextL = bestL+step) <= pathL &&
                (nextD2 = dist2(point, (next = path.getPointAtLength(nextL)))) < bestD2) {
            best = next, bestL = nextL, bestD2 = nextD2;
        }
        else {
            step *= 0.5;
        }
    }


    // Return types.

    if(type === 'length') { return bestL; }
    else if(type === 'point') { return best; }
    else if(type === 'distance2') { return bestD2; }
    else {
        out.length = bestL;
        out.point = best;
        out.distance2 = bestD2;

        return out;
    }
}

export default nearestOnPath;
