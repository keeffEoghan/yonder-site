/**
 * Based on Metaball script by Hiroyuki Sato
 * @see http://shspage.com/aijs/en/#metaball
 * @see http://varun.ca/metaballs/
 */

import { vec2 } from 'gl-matrix';

import { angle, fromPolar } from '../vec2';

const halfPI = Math.PI*0.5;
const cacheVec2 = Array(8).fill().map(vec2.create);

export function metaball(radius1, radius2, center1, center2, handleSize, v = 0.5, maxScale = 2) {
    const dist = vec2.dist(center1, center2);
    const dist2 = dist*dist;
    const sumRadius = radius1+radius2;
    const maxDist = sumRadius*maxScale;

    // No blob if a radius is 0...
    // Or if distance between the circles is larger than max-dist...
    // Or if `circle2` is completely inside `circle1`.
    if(radius1 === 0 || radius2 === 0 || dist > maxDist || dist <= Math.abs(radius1-radius2)) {
        return [];
    }

    let u1, u2;

    if(dist < sumRadius) {
        // Calculate u1 and u2 if the circles are overlapping.
        u1 = Math.acos(((radius1*radius1)+dist2-(radius2*radius2))/(2*radius1*dist));
        u2 = Math.acos(((radius2*radius2)+dist2-(radius1*radius1))/(2*radius2*dist));
    }
    else {
        u1 = 0;
        u2 = 0;
    }

    // Calculate the max spread
    const angleBetweenCenters = angle(center2, center1);
    const maxSpread = Math.acos((radius1-radius2)/dist);

    // Angles for the points
    const angle1 = angleBetweenCenters+u1+(maxSpread-u1)*v;
    const angle2 = angleBetweenCenters-u1-(maxSpread-u1)*v;
    const angle3 = angleBetweenCenters+Math.PI-u2-(Math.PI-u2-maxSpread)*v;
    const angle4 = angleBetweenCenters-Math.PI+u2+(Math.PI-u2-maxSpread)*v;

    // Point locations
    const p1 = fromPolar(cacheVec2[0], center1, angle1, radius1);
    const p2 = fromPolar(cacheVec2[1], center1, angle2, radius1);
    const p3 = fromPolar(cacheVec2[2], center2, angle3, radius2);
    const p4 = fromPolar(cacheVec2[3], center2, angle4, radius2);

    // Define handle length by the distance between both ends of the curve
    const dist2Base = Math.min(v*handleSize, vec2.dist(p1, p3)/sumRadius);

    // Take into account when circles are overlapping
    const d2 = dist2Base*Math.min(1, (dist*2)/sumRadius);

    // Length of the handles
    const r1 = radius1*d2;
    const r2 = radius2*d2;

    // Handle locations
    const h1 = fromPolar(cacheVec2[4], p1, angle1-halfPI, r1);
    const h2 = fromPolar(cacheVec2[5], p2, angle2+halfPI, r1);
    const h3 = fromPolar(cacheVec2[6], p3, angle3+halfPI, r2);
    const h4 = fromPolar(cacheVec2[7], p4, angle4-halfPI, r2);

    // Generate the connector path
    return metaballPath(p1, p2, p3, p4, h1, h2, h3, h4, dist > radius1, radius2);
}

export const metaballPath = (p1, p2, p3, p4, h1, h2, h3, h4, escaped, r) =>
    [
        ['M', ...p1],
        ['C', ...h1, ...h3, ...p3],
        ['A', r, r, 0, ((escaped)? 1 : 0), 0, ...p4],
        ['C', ...h4, ...h3, ...p4]
    ];

export default metaball;
