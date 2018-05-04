/**
 * Create an approximate circle of beziers.
 *
 * @see https://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
 * @see https://codepen.io/keeffEoghan/pen/odZQJg
 */

import { vec2 } from 'gl-matrix';

import { tau } from '../constants';

export function pathCircleMove(cx, cy, rad, step, steps = 4, startA = 0, out = []) {
    const stepA = tau/steps;

    const a0 = startA+(stepA*(step-1));
    const x0 = Math.cos(a0)*rad;
    const y0 = Math.sin(a0)*rad;

    const a1 = startA+(stepA*step);
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

export function bezierCircle(cx, cy, rad, steps = 4, startA = 0, closed = true, out = []) {
    // Extra index offset if the path is closed.
    const c = ((closed)? 1 : 0);

    for(let s = 0; s < steps; ++s) {
        out[s+c] = pathCircleMove(cx, cy, rad, s, steps, startA, out[s+c]);
    }

    if(closed) {
        const end = out[steps];

        (out[0] || (out[0] = [])).splice(0, Infinity, 'M', end[end.length-2], end[end.length-1]);
        (out[steps+c] || (out[steps+c] = [])).splice(0, Infinity, 'Z');
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
        pickMoveEndpoint(moves, m, (points[p++] || (points[p] = vec2.create())));
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
