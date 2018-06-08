import $ from 'zepto';
// @todo Import only the needed functions
import { vec2 } from 'gl-matrix';
import bezier from 'bezier';
import {
        cubicSuperPath, uncubicSuperPath, splitAtPositions, positions
    } from 'svg.pathmorphing2.js/src/cubicsuperpath';

import SVG from '../libs/custom/svg';
import Darwin from '../libs/custom/darwin';

import {
        pathCircle, pathMetaball, pickMovePoints, pickMoveEndpoint, movePointOffsets,
        bezierVia, pathWinding
    }
    from '../svg/paths';

import nearestOnPath from '../svg/nearest-on-path';

import { __ } from '../constants';
import { atan2Circle, wrapNum } from '../utils';
import { angleBetween, angleDiffX } from '../vec2';

function navHolds(element) {
    const $element = $(element);

    const info = {
        $form: $element.find('.yr-nav-holds-info-form'),
        $container: $element.find('.yr-nav-holds-content'),
        $block: $element.find('.yr-nav-holds-info-block'),

        $holds: null,
        $content: null,

        refresh() {
            info.$holds = $element.find('.yr-nav-holds-menu > .yr-nav-hold');

            info.$content = $element
                .find('.yr-nav-holds-info-block > .sqs-row > [class*="sqs-col"]')
                .children('.sqs-row, .sqs-block, [class*="sqs-col"]');
        },

        chosen: () =>
            info.$form.serializeArray()
                .filter(({ name }) =>
                    name.match(/yr-nav-holds-info-[0-9]*-toggle/gi))
                .map(({ value }) => parseInt(value, 10)-1),

        /**
         * The number of combo'd indeces preceeding a given index, for a given length.
         *
         * @param {Number} n The current index.
         * @param {Number} l The total length.
         * @return {Number} The number of combo'd indeces preceeding the current one.
         */
        preCombo: (n, l) => ((n > 0)? (l-n)+info.preCombo(n-1, l) : 0),

        /**
         * Index into list of info content for pairs of selections.
         * The number of selections is `nC2` (e.g: for `n === 5; nC2 === 10`).
         *
         * Intuitive cascade from the combination maths - each number's pairs in turn, minus
         * already-used pairs:
         *     0 | 0-2, 0-2, 0-3, 0-4
         *     1 | 1-2, 1-3, 1-4
         *     2 | 2-3, 2-4
         *     3 | 3-4
         *     4 | -
         *
         * And, in a flat list:
         *     0 | 0 | 0-1
         *     1 | 0 | 0-2
         *     2 | 0 | 0-3
         *     3 | 0 | 0-4
         *     4 | 1 | 1-2
         *     5 | 1 | 1-3
         *     6 | 1 | 1-4
         *     7 | 2 | 2-3
         *     8 | 2 | 2-4
         *     9 | 3 | 3-4
         *     - | 4 |  -
         *
         * @param {Number} [a, b] Chosen pair of indexes.
         * @param {Number} n The number of options to choose from (`n` in `nCr` or `n choose r`).
         * @return {Number} The matching info item index for the selected pair.
         */
        combo([a, b] = info.chosen(), n = info.$holds.length) {
            if(!isNaN(a+b) && a !== b) {
                const min = Math.min(a, b);
                const max = Math.max(a, b);
                const diff = max-min;

                return info.preCombo(min, n)+diff-1;
            }
        },

        toggle: () =>
            info.scroll(info.$content.addClass('yr-holds-unchosen')
                .eq(info.combo()).removeClass('yr-holds-unchosen')),

        scroll($chosen) {
            // Scroll into view - for a hint while in the CMS (as other info can also be seen).
            if(!info.$block.is('.sqs-editing') && $chosen.length) {
                const box = info.$container.offset();
                const chosenBox = $chosen.offset();

                info.$container.scrollTop(info.$container.scrollTop()+
                    // Align to top
                    chosenBox.top-box.top-
                    // Center
                    Math.max(0, box.height-chosenBox.height)*0.5);
            }

            return $chosen;
        },

        retoggle() {
            info.refresh();
            info.toggle();
        }
    };

    info.retoggle();

    $element.on('change', '.yr-nav-holds-info-show', info.toggle);


    /**
     * Loop the default SVGs used, to `use` only symbols that are available.
     * (Can't do this with JSON-T or CSS alone really.)
     */
    const $holdDefs = $('.yr-nav-holds-shape-defs').children();

    const validateHoldRefs = () => ($holdDefs.length &&
        $element.find('.yr-use-hold-shape').each((i, e) => {
            const $e = $(e);
            const href = (($e.attr('href'))? 'href' : 'xlink:href');
            const oldRef = $e.attr(href);
            const $oldRef = $(oldRef);

            if(!$oldRef.length) {
                const $holdDef = $holdDefs.eq(i%$holdDefs.length);
                const $ref = $holdDef.find('.yr-hold-shape');
                const ref = (($ref.length)? $ref : $holdDef).attr('id');

                if(ref) {
                    $e.attr(href, oldRef.replace(/#.*$/gi, '#'+ref));
                }
            }
        }));

    validateHoldRefs();


    /**
     * Refresh DOM references / controller when CMS edits have occurred.
     * (Otherwise we'll be referencing detached DOM.)
     *
     * @todo Refresh the controller when exiting edit mode, for a clean slate.
     */

    const darwin = new Darwin({
        callback: (mutations) => {
            if(mutations.some((mutation) => mutation.type === 'childList')) {
                info.retoggle();
            }

            validateHoldRefs();
        },

        targets: [
            '.yr-nav-holds-menu > .yr-nav-hold',
            '.yr-nav-holds-info-block'
        ]
    });

    darwin.init();


    // Test
    
    (() => {
        return;

        if(!SVG.supported) { return; }

        // Init... needed internally in SVG.js even if we're not drawing in this element.
        const svg = SVG($('.yr-nav-holds-defs')[0]);

        // @todo Caching is an optimisation... don't do it prematurely.
        const cache = {
            pojo: Array(2).fill().map(() => ({})),
            vec2: Array(3).fill().map(vec2.create),
            // mat2d: Array(1).fill().map(mat2d.create),
            array: Array(2).fill().map(Array)
        };


        /**
         * @todo Remove redundant libs:
         *       - 'svgpath/lib/a2c': `a2c` => 'svg.pathmorphing2.js': `arcToPath`
         *       - 'bezier-utils': `getSubBezier` => 'svg.pathmorphing2.js': `segSplit`
         *
         * @todo Resize SVG to the full container - so the interactions avoid bounds.
         */
        const force = {
            pos: vec2.fromValues(0, 0),
            pow: 2,
            rad: 80
        };

        const pojoToVec2 = (pojo, out = vec2.create()) => vec2.set(out, pojo.x, pojo.y);
        const vec2ToPojo = (vec2, out = {}) => (out.x = vec2[0], out.y = vec2[1], out);

        const boxRad = ({ w, h }) => Math.sqrt(w*h)*0.5;

        // force.rad2 = force.rad*force.rad;
        // force.angle = Math.atan2(force.pos[1], force.pos[0]);

        // const morphBezier = [0, 0, 1, 1];
        const morphBezier = [0, 0, 1.2, 1.2];
        const morphEase = (t) => bezier(morphBezier, t);

        const hits = {
            items: [],
            boxes: [],
            resize: () => hits.items.forEach((item, i) => hits.boxes[i] = item.rbox()),
            get: ([px, py], rad) => hits.items.filter((item, i) => {
                const { x, y, x2, y2 } = hits.boxes[i];

                return (px+rad >= x && py+rad >= y && px-rad <= x2 && py-rad <= y2);
            })
        };

        const $holds = $element.find('.yr-nav-hold');

        $holds.each((h, hold) => {
            const $hold = $(hold);

            // Find the SVGs we want - the default, or one in a `block-field`.

            const $block = $hold.find('.yr-nav-holds-shape-block');

            const $shapes = (($block.hasClass('empty'))? $hold : $block)
                // These classes must be added to any custom SVGs to opt them into this effect.
                .find('svg.yr-hold-shape, use.yr-use-hold-shape');

            $shapes.each((s, shape) => {
                shape = SVG.adopt(shape);

                // Replace any relevant `use` with the symbol - so we can use it independently.
                if(shape.hasClass('yr-use-hold-shape')) {
                    const href = ((shape.attr('href'))? 'href' : 'xlink:href');

                    shape = shape.replace(shape.reference(href).clone(shape.parent()));
                }

                // @todo Increase the SVG size as much as needed.

                // Prepare the effect.
                shape.select('path').each((p, paths) => {
                    const path = paths[p];

                    // @todo Remove.
                    // path.scale(0.5);

                    const coarseMoves = path.array().value;


                    // Prepare paths:

                    // Normalize path as bézier curves.

                    const fineCSP = cubicSuperPath(coarseMoves);

                    // Subdivide into finer pieces.

                    const length = path.node.getTotalLength();
                    const maxSlice = 10;
                    const slice = length/Math.ceil(length/maxSlice);

                    const splitPositions = Array(Math.floor(length/slice)-1).fill(0)
                        .reduce((_a, _b, i, all) => (all[i] = (i+1)*slice/length, all), null);

                    const pathPositions = positions(fineCSP);

                    splitAtPositions(fineCSP, pathPositions, splitPositions);

                    // Replace the old path.

                    const finePathArray = uncubicSuperPath(fineCSP);

                    path.plot(finePathArray.clone());

                    // A clone we can modify for morphing, keeping the original.
                    const morphPathArray = finePathArray.clone();

                    // Store the superpaths to be used later for interaction.
                    path.remember('fine', finePathArray);
                    path.remember('morph', morphPathArray);


                    // Create a hit area for pointers - in a single layer, to manage `z` etc.
                    hits.items.push(path);
                });
            });
        });


        // (2) Respond to interaction:

        // Points to draw a bezier curve through, and index offset.
        const morphVia = {
            points: [],
            index: -1,
            vec2: Array(2).fill(0).map(vec2.create)
        };

        function blobPointer(path, force) {
            // (2.1) Morph points towards pointer - interploate within radius, eased by
            // force/distance.

            const pos = pojoToVec2(path.point(...force.pos), morphVia.vec2[0]);

            // Draw curves through points close enough to the pointer.
            const morphMoves = path.remember('morph').value;
            // @todo Use the morphed path instead of the original path, as the source?
            // const moves = morphMoves;
            const moves = path.remember('fine').value;

            // @todo Reuse memory with indeces, rather than emptying array?
            morphVia.points.length = 0;
            morphVia.index = -1;

            // Account for being on the middle of a curve when crossing the end of the
            // array... so far assumes closed shapes.
            for(let i = 0; i < moves.length || morphVia.index >= 0; ++i) {
                const m = i%moves.length;
                const move = moves[m];

                const point = pickMoveEndpoint(moves, m, morphVia.vec2[1]);
                const dist = force.rad-vec2.dist(point, pos);

                if(dist > 0) {
                    // Gather the points we'll curve through.

                    if(morphVia.index < 0) {
                        // Start a new segment to curve through.
                        morphVia.index = m;

                        // Need a point before the first point curved through.
                        const start = pickMoveEndpoint(moves, wrapNum(m-1, moves.length));

                        morphVia.points.push(start);
                    }

                    // @todo Might need to use a normal here as `lerp` target instead.
                    const morphed = vec2.lerp(vec2.create(), point, pos,
                        morphEase(dist/force.rad));

                    morphVia.points.push(morphed);
                }
                else if(morphVia.index >= 0) {
                    // Curve through the points.

                    // @todo Reuse memory, rather than new array?
                    const curves = bezierVia(morphVia.points);

                    // @todo Loop or view into array, rather than new array.
                    const spliceCurve = (offset, curves) =>
                        curves.forEach((curve, c) => {
                            const move = morphMoves[offset+c];

                            if(move[0].search(/^m$/i) >= 0) {
                                // We might've replaced an 'M' move.
                                move.splice(0, Infinity,
                                    ((move[0] === 'm')? 'm' : 'M'),
                                    curve[curve.length-2], curve[curve.length-1]);
                            }
                            else if(move[0].search(/^z$/i) >= 0) {
                                // We might've replaced an 'Z' move.
                                move.splice(0, Infinity, 'Z');
                            }
                            else {
                                // Béziers fine for anything else.
                                move.splice(0, Infinity, ...curve);
                            }
                        });

                    // Merge in the new curves - accounting for wrapping in the arrays.

                    const extra = (morphVia.index+curves.length)-morphMoves.length;

                    // @todo Indexes or view into array, rather than new array.

                    if(extra > 0) {
                        spliceCurve(0, curves.splice(-extra, extra));
                    }

                    spliceCurve(morphVia.index, curves);

                    // Reset the collection.
                    morphVia.index = -1;
                    morphVia.points.length = 0;
                }
            }

            path
                // .animate(100, '<>')
                .plot(morphMoves);
        }

        $holds.each((h, hold) => {
            return;
            const $hold = $(hold);

            // Find the SVGs we want - the default, or one in a `block-field`.

            const $block = $hold.find('.yr-nav-holds-shape-block');

            const $shapes = (($block.hasClass('empty'))? $hold : $block)
                // These classes must be added to any custom SVGs to opt them into this effect.
                .find('svg.yr-hold-shape, use.yr-use-hold-shape');

            $shapes.each((s, shape) => {
                shape = SVG.adopt(shape);

                // @todo Increase the SVG size as much as needed.

                // @todo Remove.

                const shapeBox = shape.rbox(shape);
                const shapeArea = boxRad(shapeBox);
                const center = vec2.set(vec2.create(), shapeBox.cx, shapeBox.cy);

                vec2.add(force.pos, vec2.random(force.pos, 100), center);
                force.angle = Math.atan2(force.pos[1], force.pos[0]);

                // Get on with the effect.
                shape.select('path').each((p, paths) => {
                    const path = paths[p];

                    // (2.1) Morph points towards pointer - interploate within radius, eased by
                    // force/distance.

                    // Points to draw a bezier curve through, and index offset.
                    const morphVia = {
                        points: [],
                        index: -1,
                        vec2: vec2.create()
                    };

                    const moves = path.remember('fine').value;
                    const morphMoves = path.remember('morph').value;

                    // Draw curves through points close enough to the pointer.
                    // @todo Use the morphed path instead of the original path?
                    // Account for being on the middle of a curve when crossing the end of the
                    // array... so far assumes closed shapes.
                    for(let i = 0; i < moves.length || morphVia.index >= 0; ++i) {
                        const m = i%moves.length;
                        const move = moves[m];

                        const point = pickMoveEndpoint(moves, m, morphVia.vec2);
                        const dist = force.rad-vec2.dist(point, force.pos);

                        if(dist > 0) {
                            // Gather the points we'll curve through.

                            if(morphVia.index < 0) {
                                // Start a new segment to curve through.
                                morphVia.index = m;

                                // Need a point before the first point curved through.
                                const start = pickMoveEndpoint(moves, wrapNum(m-1, moves.length));

                                morphVia.points.push(start);
                            }

                            // @todo Might need to use a normal here as `lerp` target instead.
                            const morphed = vec2.lerp(vec2.create(), point, force.pos,
                                morphEase(dist/force.rad));

                            morphVia.points.push(morphed);
                        }
                        else if(morphVia.index >= 0) {
                            // Curve through the points.

                            // @todo Smooth connections - to curve points, to adjacent points.
                            const curves = bezierVia(morphVia.points);

                            const spliceCurve = (offset, curves) =>
                                curves.forEach((curve, c) => {
                                    const move = morphMoves[offset+c];

                                    if(move[0].search(/^m$/i) >= 0) {
                                        // We might've replaced an 'M' move.
                                        move.splice(0, Infinity,
                                            ((move[0] === 'm')? 'm' : 'M'),
                                            curve[curve.length-2], curve[curve.length-1]);
                                    }
                                    else if(move[0].search(/^z$/i) >= 0) {
                                        // We might've replaced an 'Z' move.
                                        move.splice(0, Infinity, 'Z');
                                    }
                                    else {
                                        // Béziers fine for anything else.
                                        move.splice(0, Infinity, ...curve);
                                    }
                                });

                            // Merge in the new curves - accounting for wrapping in the arrays.

                            const extra = (morphVia.index+curves.length)-morphMoves.length;

                            if(extra > 0) {
                                spliceCurve(0, curves.splice(-extra, extra));
                            }

                            spliceCurve(morphVia.index, curves);

                            // Reset the collection.
                            morphVia.index = -1;
                            morphVia.points.length = 0;
                        }
                    }

                    path
                        .animate(1000, '<>')
                        .loop(true, true)
                        .plot(morphMoves);

                    // (2.2) Draw a curve through the morphed points (`bezierVia`).
                    // console.log(bezierVia([[0, 1], [0, 3], [5, 1], [10, 23]]));

                    /**
                     * @todo How is this going to look at distance...?
                     *       Maybe when a hold is grabbed:
                     *           - Update the influence radius to the distance between the
                     *           pointer and the hold center.
                     *           - Active for only the current hold.
                     *           - Animate the hold towards the pointer with a delay.
                     *           - Hopefully would morph ~half the points towards the pointer,
                     *           until it reaches it.
                     */

                    // Animate.
                    // path
                        // .animate(1000, '<>')
                        // .loop(true, true)
                        // .plot(toMoves);

                    /*
                        ----------------
                        let toMoves = pathMetaball(force.pos, force.rad*pathArea/shapeArea,
                            center, pathArea, __, __, __, __, []);

                        if(Array.isArray(toMoves)) {
                            const toPath = (new SVG.Path()).plot(toMoves);

                            // Line up the start point with with start point of the shape, to
                            // help minimise turning during the morph.
                            // Split the metaball path at the starting point.

                            const start = vec2ToPojo(pickMoveEndpoint(moves, moves.length-1,
                                    vec2.create()),
                                {});

                            // @todo WAY TOO MANY calls to `nearestOnPath` - may need to unroll it.

                            const splitAt = nearestOnPath(toPath.node, start, __, __, __, 'length');

                            // Get the relevant segment of the path.
                            
                            // Could use the old `getPathSegAtLength` API, but the polyfill's biiiig:
                            // const seg = toPath.node.getPathSegAtLength(splitAt);
                            // const segAt0 = nearestOnPath(toPath.node,
                            //     pickMoveEndpoint(toMoves, seg-1, vec2.create()),
                            //     __, __, __, 'length');

                            // const segAt1 = nearestOnPath(toPath.node,
                            //     pickMoveEndpoint(toMoves, seg, vec2.create()),
                            //     __, __, __, 'length');

                            const seg = toMoves.findIndex((move, m, toMoves) => {
                                    if(move[0].search(/^[mz]$/i) >= 0) { return false; }

                                    const end = pickMoveEndpoint(toMoves, m, vec2.create());
                                    const length = nearestOnPath(path.node,
                                        vec2ToPojo(end, {}),
                                        __, __, __, 'length');

                                    return splitAt < length;
                                });

                            if(seg < 0) {
                                console.warn("Couldn't find path segment nearest point");
                                return;
                            }

                            // cache.array[1].length = 0;

                            const points = pickMovePoints(toMoves, seg, []);


                            // Get the length to split the segment at.

                            const segEnd0 = vec2ToPojo(pickMoveEndpoint(toMoves,
                                    wrapNum(seg-1, toMoves.length), vec2.create()),
                                {});

                            const segEnd1 = vec2ToPojo(points[points.length-1], {});

                            const segAt0 = nearestOnPath(toPath.node, segEnd0, __, __, __, 'length');
                            const segAt1 = nearestOnPath(toPath.node, segEnd1, __, __, __, 'length');

                            if(splitAt < segAt0 || segAt1 < splitAt) {
                                console.warn("Invalid lengths on segment nearest point");
                                return;
                            }

                            // Convert into the form `bezier-utils` accepts
                            points.reduceRight((points, point, p) => {
                                    points.splice(p, 1, vec2ToPojo(point));

                                    return points;
                                },
                                points);

                            points.unshift(segEnd0);


                            // Split at the length along the path segment.

                            const splits = getSubBezier(points, (splitAt-segAt0)/(segAt1-segAt0));

                            // Modifying arrays in-place to try keep memory usage down.
                            splits.reduceRight((splits, split, s) => {
                                    split.reduceRight((split, point, p) => {
                                            ((p)?
                                                // Flatten the objects into an array.
                                                split.splice(p, 1, point.x, point.y)
                                                // Don't need the first points, as they're the
                                                // previous move's endpoint.
                                            :   split.shift());

                                            return split;
                                        },
                                        split)
                                        .unshift('C');

                                    splits.splice(s, 1, split);

                                    return splits;
                                },
                                splits);


                            // Insert the new split and sort the path points so the it's at the start.

                            const m = ((toMoves[0][0].search(/^m$/i) < 0)? 0 : 1);

                            // Remove the first moves up to the old segment index.
                            const prev = toMoves.splice(m, seg+1-m, splits[1]);

                            // Remove the old segment, now split.
                            prev.pop();

                            const z = ((toMoves[toMoves.length-1][0].search(/^z$/i) < 0)? 0 : 1);
                            const endSplit = splits[0];

                            // Put the previous items at the end, and insert the new split segments.
                            toMoves.splice(toMoves.length-z, 0, ...prev, endSplit);

                            // Update any opening "M" command.
                            if(m) {
                                toMoves[m-1][1] = endSplit[endSplit.length-2];
                                toMoves[m-1][2] = endSplit[endSplit.length-1];
                            }

                            toPath.plot(toMoves);


                            // Account for winding direction, to help minimise flipping during the
                            // morph.
                            const toD = ((pathWinding(moves)*pathWinding(toMoves) < 0)?
                                    reverse(toPath.attr('d'))
                                :   toPath.attr('d'));

                            toMoves = toPath.plot(toD).array().value;

                            // Animate.
                            path
                                .animate(1000, '<>')
                                .loop(true, true)
                                .plot(toD);
                        }
                        else {
                            console.log('no balls');

                            // Can't draw a metaball - if circles apart, snap back to the orginal
                            // shape.
                            if(path.fx && path.fx.situation) {
                                path.reverse(true);
                            }
                        }
                    */
                });
            });
        });

        // Keep the hits up to date.
        hits.resize();
        $(window).on('resize', hits.resize);

        $element.on('pointermove', ({ x, y }) => {
            vec2.set(force.pos, x, y);
            hits.get(force.pos, force.rad).forEach((hit) => blobPointer(hit, force));
        });
    })();
}

export default navHolds;
