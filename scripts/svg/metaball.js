/**
 * Adapted from the below...
 * Based on Metaball script by Hiroyuki Sato.
 * Beware some misordered variables in the original source.
 *
 * @see http://shspage.com/aijs/en/#metaball
 * @see http://varun.ca/metaballs/
 * @see https://codepen.io/keeffEoghan/pen/LmLPad
 */

import { vec2 } from 'gl-matrix';

import { angleDiff, polar } from '../vec2';

const halfPI = Math.PI*0.5;
const cacheVec2 = Array(8).fill().map(vec2.create);

/**
 * Draws a metaball blob in SVG path (SVG.js `PathArray` notation).
 * If the metaball can't be drawn, returns values to indicate why and how far off it is:
 * - `Undefined` if either radius is `0`.
 * - `Number` greater than `0` if the circles are too far apart (the extra distance).
 * - `Number` less than or equal to `0` if one circles is within the other (the extra distance).
 *
 * @param {Number} radius0 The radius of the first circle.
 * @param {Array.<Number>} center0 The center of the first circle.
 * @param {Number} radius1 The radius of the second circle.
 * @param {Array.<Number>} center1 The center of the second circle.
 * @param {Number?} handle Factor for the scale of the curve handles.
 * @param {Number?} spread Factor for the spread of the connecting membrane.
 * @param {Number?} stretch Factor for the maximum distance between the circles.
 *
 * @return {(Array|Number|Undefined)} The path if the metaballs can be drawn, or error values
 *                                    if not (see description).
 */
export function metaball(radius0, center0, radius1, center1,
        handle = 2.4, spread = 0.5, stretch = 2.5, out = []) {
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

    const angleBetweenCenters = angleDiff(center1, center0);

    // Calculate the max spread
    const maxSpread = Math.acos((radius0-radius1)/dist);

    // Angles for the points
    const a0 = angleBetweenCenters+u0+(maxSpread-u0)*spread;
    const a1 = angleBetweenCenters+Math.PI-u1-(Math.PI-u1-maxSpread)*spread;
    const a2 = angleBetweenCenters-Math.PI+u1+(Math.PI-u1-maxSpread)*spread;
    const a3 = angleBetweenCenters-u0-(maxSpread-u0)*spread;

    // Point locations
    const m0p = polar(cacheVec2[0], center0, a0, radius0);
    const m1p = polar(cacheVec2[1], center1, a1, radius1);
    const m2p = polar(cacheVec2[2], center1, a2, radius1);
    const m3p = polar(cacheVec2[3], center0, a3, radius0);

    // Define handle length by the distance between both ends of the curve
    const d2Base = Math.min(spread*handle, vec2.dist(m0p, m1p)/sumRadius);

    // Take into account when circles are overlapping
    const d2 = d2Base*Math.min(1, (dist*2)/sumRadius);

    // Length of the handles
    const r0 = radius0*d2;
    const r1 = radius1*d2;

    // Handle locations

    const m1h0 = polar(cacheVec2[4], m0p, a0-halfPI, r0);
    const m1h1 = polar(cacheVec2[5], m1p, a1+halfPI, r1);

    const m3h0 = polar(cacheVec2[6], m2p, a2-halfPI, r1);
    const m3h1 = polar(cacheVec2[7], m3p, a3+halfPI, r0);

    // Generate the connector path
    metaballPath(m0p, m1p, m2p, m3p,
        m1h0, m1h1,
        m3h0, m3h1,
        radius0,
        radius1,
        dist,
        out);

    return out;
}

export function metaballPath(m0p, m1p, m2p, m3p, m1h0, m1h1, m3h0, m3h1, r0, r1, d, out = []) {
    out.splice(0, 0,
        ['M', ...m0p],
        ['C', ...m1h0, ...m1h1, ...m1p],
        ['A', r1, r1, 0, ((d < r0 && r0 > r1)? 0 : 1), 0, ...m2p],
        ['C', ...m3h0, ...m3h1, ...m3p],
        ['A', r0, r0, 0, ((d < r1 && r1 > r0)? 0 : 1), 0, ...m0p],
        ['Z']);

    return out;
}

export default metaball;
