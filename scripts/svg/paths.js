import { vec2 } from 'gl-matrix';
import a2c from 'svgpath/lib/a2c';

import { tau } from '../constants';
import { angleDiffX, polar } from '../vec2';

/**
 * Create an approximate circle of beziers.
 *
 * @see https://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
 * @see https://codepen.io/keeffEoghan/pen/odZQJg
 */

export function pathCircleMove(cx, cy, rad, step, steps = 4, angle = 0, out = []) {
    const stepA = tau/steps;

    const a0 = angle+(stepA*(step-1));
    const x0 = Math.cos(a0)*rad;
    const y0 = Math.sin(a0)*rad;

    const a1 = angle+(stepA*step);
    const x1 = Math.cos(a1)*rad;
    const y1 = Math.sin(a1)*rad;

    const cp = 4/3*Math.tan(Math.PI/(2*steps));

    out.splice(0, Infinity,
        'C',
        cx+x0+(-y0*cp), cy+y0+(x0*cp),
        cx+x1+(y1*cp), cy+y1+(-x1*cp),
        cx+x1, cy+y1);

    return out;
}

export function pathCircle(cx, cy, rad, steps = 4, angle = 0, closed = true, out = []) {
    // Extra index offset if the path is closed.
    const c = ((closed)? 1 : 0);

    for(let s = 0; s < steps; ++s) {
        out[s+c] = pathCircleMove(cx, cy, rad, s, steps, angle, out[s+c]);
    }

    const end = out[steps];

    (out[0] || (out[0] = [])).splice(0, Infinity, 'M', end[end.length-2], end[end.length-1]);

    if(closed) {
        (out[steps+c] || (out[steps+c] = [])).splice(0, Infinity, 'Z');
    }

    return out;
}


/**
 * Adapted from the below...
 * Based on Metaball script by Hiroyuki Sato.
 * Beware some misordered variables in the original source.
 *
 * @see http://shspage.com/aijs/en/#metaball
 * @see http://varun.ca/metaballs/
 * @see https://codepen.io/keeffEoghan/pen/LmLPad
 */

const halfPI = Math.PI*0.5;
const cacheVec2 = Array(8).fill().map(vec2.create);

// For converting from `a2c` curves to SVG.js curves - ignore the first point.
const a2cToSVG = (() => {
    const a2cCurveToSVG = (c, i) => c.splice(0, 2, 'C');

    return (curves) => (curves.forEach(a2cCurveToSVG), curves);
})();

/**
 * Draws a metaball blob in SVG path (SVG.js `PathArray` notation).
 * If the metaball can't be drawn, returns values to indicate why and how far off it is:
 * - `Undefined` if either radius is `0`.
 * - `Number` greater than `0` if the circles are too far apart (the extra distance).
 * - `Number` less than or equal to `0` if one circles is within the other (the extra distance).
 *
 * @param {Array.<Number>} center0 The center of the first circle.
 * @param {Number} radius0 The radius of the first circle.
 * @param {Array.<Number>} center1 The center of the second circle.
 * @param {Number} radius1 The radius of the second circle.
 * @param {Number?} handle Factor for the scale of the curve handles.
 * @param {Number?} spread Factor for the spread of the connecting membrane.
 * @param {Number?} stretch Factor for the maximum distance between the circles.
 *
 * @return {(Array|Number|Undefined)} The path if the metaballs can be drawn, or error values
 *                                    if not (see description).
 *
 * @todo Change from vector inputs to individual coordinates.
 */
export function pathMetaball(center0, radius0, center1, radius1,
        handle = 2.4, spread = 0.5, stretch = 2.5, closed = true, out = []) {
    const dist = vec2.dist(center0, center1);
    const dist2 = dist*dist;
    const sumRadius = radius0+radius1;
    const maxRadius = Math.max(radius0, radius1);
    // const maxDist = sumRadius*stretch;
    const maxDist = radius0+(radius1*stretch);

    // Boundaries:

    // No blob if a radius is 0.
    if(radius0 === 0 || radius1 === 0) {
        return;
    }

    // No blob if distance between the circles is more than maximum.

    const outside = dist-maxDist;

    if(outside > 0) {
        return outside;
    }

    // No blob if one circle is completely inside the other.
    
    const inside = dist-Math.abs(radius0-radius1);

    if(inside <= 0) {
        return inside;
    }

    // Blob, carry on:

    let u0, u1;

    if(dist < sumRadius) {
        // Calculate u0 and u1 if the circles are overlapping.
        u0 = Math.acos(((radius0*radius0)+dist2-(radius1*radius1))/(2*radius0*dist));
        u1 = Math.acos(((radius1*radius1)+dist2-(radius0*radius0))/(2*radius1*dist));
    }
    else {
        u0 = 0;
        u1 = 0;
    }

    const angleBetweenCenters = angleDiffX(center1, center0);

    // Calculate the max spread
    const maxSpread = Math.acos((radius0-radius1)/dist);

    // Angles for the points
    const a0 = angleBetweenCenters+u0+(maxSpread-u0)*spread;
    const a1 = angleBetweenCenters+Math.PI-u1-(Math.PI-u1-maxSpread)*spread;
    const a2 = angleBetweenCenters-Math.PI+u1+(Math.PI-u1-maxSpread)*spread;
    const a3 = angleBetweenCenters-u0-(maxSpread-u0)*spread;

    // Point locations
    let m0p = polar(cacheVec2[0], center0, a0, radius0);
    let m1p = polar(cacheVec2[1], center1, a1, radius1);
    let m2p = polar(cacheVec2[2], center1, a2, radius1);
    let m3p = polar(cacheVec2[3], center0, a3, radius0);

    // Define handle length by the distance between both ends of the curve
    const d2Base = Math.min(spread*handle, vec2.dist(m0p, m1p)/sumRadius);

    // Take into account when circles are overlapping
    const d2 = d2Base*Math.min(1, (dist*2)/sumRadius);

    // Length of the handles
    const r0 = radius0*d2;
    const r1 = radius1*d2;

    // Handle locations

    let m1h0 = polar(cacheVec2[4], m0p, a0-halfPI, r0);
    let m1h1 = polar(cacheVec2[5], m1p, a1+halfPI, r1);

    let m3h0 = polar(cacheVec2[6], m2p, a2-halfPI, r1);
    let m3h1 = polar(cacheVec2[7], m3p, a3+halfPI, r0);

    const arcFlag0 = ((dist < radius0 && radius0 > radius1)? 0 : 1);
    const arcFlag1 = ((dist < radius1 && radius1 > radius0)? 0 : 1);

    // @todo Put this behind an `anti` flag.
    // [m0p, m3p, m2p, m1p, m3h1, m3h0, m1h1, m1h0] =
    // [m0p, m1p, m2p, m3p, m1h0, m1h1, m3h0, m3h1];

    // Use beziers rather than arcs - makes animation easier for everyone.
    // The arguments are in a different order to the SVG arc command:
    // - SVG arc: `(a, rX, rY, rotation, arc, sweep, eX, eY)`
    // - a2c: `(prevX, prevY, eX, eY, arc, sweep, rX, rY, rotation)`
    const a2c0 = a2c(...m1p, ...m2p, arcFlag0, 0, radius1, radius1, 0);
    const a2c1 = a2c(...m3p, ...m0p, arcFlag1, 0, radius0, radius0, 0);

    // Generate the connector path
    // @todo Reuse any input arrays.
    out.splice(0, Infinity,
        ['M', ...m0p],
        ['C', ...m1h0, ...m1h1, ...m1p],
        // ['A', radius1, radius1, 0, arcFlag0, 0, ...m2p],
        ...a2cToSVG(a2c0),
        ['C', ...m3h0, ...m3h1, ...m3p],
        // ['A', radius0, radius0, 0, arcFlag1, 0, ...m0p]
        ...a2cToSVG(a2c1));

    if(closed) {
        (out[out.length] || (out[out.length] = [])).splice(0, Infinity, 'Z');
    }

    return out;
}


/**
 * Return the endpoint of a move - an SVG.js path move command.
 * Handle each SVG.js path move command individually - various ways to move points.
 * All coordinates assumed absolute, as handled by `SVG.PathArray`.
 *
 * @param {Array.<Array>} moves The path array of moves.
 * @param {Number} m The index of the move within `moves` to use.
 * @param {Array?} point A point to write the result into.
 * @return {(Array|Null)} The endpoint in this move, if valid.
 */
export function pickMoveEndpoint(moves, m, point = vec2.create()) {
    const move = moves[m];
    // SVG.js path moves define the command name first.
    const c = move[0];

    if(c.search(/^[mlcsqta]$/i) >= 0) {
        // Endpoint last.
        vec2.set(point, move[move.length-2], move[move.length-1]);
    }
    else if(c.search(/^h$/i) >= 0) {
        // Endpoint x, y in previous move.
        vec2.set(point, move[1], pickMoveEndpoint(moves, m-1, point)[1]);
    }
    else if(c.search(/^v$/i) >= 0) {
        // Endpoint y, x in previous move.
        vec2.set(point, pickMoveEndpoint(moves, m-1, point)[0], move[1]);
    }
    else if(c.search(/^z$/i) >= 0) {
        // Endpoint in previous `M` move.
        for(let i = m-1; i >= 0; --i) {
            if(moves[i][0].search(/m/gi) >= 0) {
                pickMoveEndpoint(moves, i, point);
                break;
            }
        }
    }
    else {
        console.warn('Unknown SVG path command.', c, move, m, moves);
    }

    return point;
}

/**
 * The offsets at which points are defined in an SVG.js path move command.
 * If there's no point decalared in the command, `null` indicates this.
 * @type {Object.<Array.<Array.<(Number|Null)>>>}
 */
const movePointOffsets = {
    m: [[1, 2]],
    l: [[1, 2]],
    h: [[1, null]],
    v: [[null, 1]],
    z: [[null, null]],
    t: [[1, 2]],
    c: [[1, 2], [3, 4], [5, 6]],
    s: [[1, 2], [3, 4]],
    q: [[1, 2], [3, 4]],
    a: [[1, 2], [6, 7]]
};

Object.keys(movePointOffsets).forEach((o) =>
    movePointOffsets[o.toUpperCase()] = movePointOffsets[o]);

export { movePointOffsets };


/**
 * Return all the points of a move - an SVG.js path move command.
 * Handle each SVG.js path move command individually - various ways to move points.
 * All coordinates assumed absolute, as handled by `SVG.PathArray`.
 *
 * @see https://css-tricks.com/svg-path-syntax-illustrated-guide/
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
 * @see https://github.com/svgdotjs/svg.js/blob/master/src/patharray.js
 *
 * @param {Array.<Array>} moves The path array of moves.
 * @param {Number} m The index of the move within `moves` to use.
 * @param {Array.<Array?>?} points An array of points to write the results into.
 * @return {(Array.<Array>|Null)} The array of points in this move, if valid.
 */
/*export const pickMovePoints = (() => {
    const pickMovePoint = (points, p, move, v) =>
        vec2.set((points[p] || (points[p] = vec2.create())), move[v], move[v+1]);
*/
export function pickMovePoints(moves, m, points = []) {
    const move = moves[m];
    // SVG.js path moves define the command name first.
    const c = move[0];
    let p = 0;

    if(c.search(/^[mlhvzt]$/i) >= 0) {
        // Just the endpoint
        pickMoveEndpoint(moves, m, (points[p] || (points[p] = vec2.create())));
        p++;
    }
    else if(c.search(/^[csqa]$/i) >= 0) {
        // Points at various offsets.
        const offsets = movePointOffsets[c];

        offsets.forEach((offset, o) =>
            vec2.set((points[o] || (points[o] = vec2.create())),
                move[offset[0]], move[offset[1]]));

        p = offsets.length;
    }
    else {
        console.warn('Unknown SVG path command.', c, move, m, moves);
    }

    points.length = p;

    return points;
}
