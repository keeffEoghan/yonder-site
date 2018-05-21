import $ from 'zepto';
// @todo Import only the needed functions
import { vec2 } from 'gl-matrix';
import { getSubBezier } from 'bezier-utils';
import { reverse } from 'svg-path-reverse';

import SVG from '../libs/custom/svg';
import Darwin from '../libs/custom/darwin';

import {
        pathCircle, pathMetaball, pickMovePoints, pickMoveEndpoint, movePointOffsets,
        pathWinding
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
        if(!SVG.supported) { return; }

        // Init... needed internally in SVG.js even if we're not drawing in this element.
        SVG($('.yr-nav-holds-defs')[0]);

        // @todo Caching is an optimisation... don't do it prematurely.
        const cache = {
            pojo: Array(2).fill().map(() => ({})),
            vec2: Array(3).fill().map(vec2.create),
            // mat2d: Array(1).fill().map(mat2d.create),
            array: Array(2).fill().map(Array)
        };

        const force = {
            pos: vec2.fromValues(0, 0),
            pow: 2,
            rad: 30
        };

        const pojoToVec2 = (pojo, out = vec2.create()) => vec2.set(out, pojo.x, pojo.y);
        const vec2ToPojo = (vec2, out = {}) => (out.x = vec2[0], out.y = vec2[1], out);

        const boxRad = ({ w, h }) => Math.sqrt(w*h)*0.5;

        force.rad2 = force.rad*force.rad;
        force.angle = Math.atan2(force.pos[1], force.pos[0]);

        const $holds = $element.find('.yr-nav-hold');

        $holds.each((h, hold) => {
            const $hold = $(hold);

            // Find the SVGs we want - the default, or one in a `block-field`.

            const $block = $hold.find('.yr-nav-holds-shape-block');

            const $shapes = (($block.hasClass('empty'))? $hold : $block)
                // These classes must be added to any custom SVGs to opt them into this effect.
                .find('svg.yr-hold-shape, use.yr-use-hold-shape');

            $shapes.each((s, shape) => {
                // Replace any relevant `use` with the symbol - so we can use it independently.
                shape = SVG.adopt(shape);

                if(shape.hasClass('yr-use-hold-shape')) {
                    const href = ((shape.attr('href'))? 'href' : 'xlink:href');

                    shape = shape.replace(shape.reference(href).clone(shape.parent()));
                }

                // @todo Bounds checking.

                const shapeBox = shape.rbox(shape);
                const shapeArea = boxRad(shapeBox);
                const center = vec2.set(vec2.create(), shapeBox.cx, shapeBox.cy);

                // @todo Remove.
                vec2.add(force.pos, vec2.random(force.pos, 100), center);
                force.angle = Math.atan2(force.pos[1], force.pos[0]);

                // Get on with the effect
                // @todo Hook this part up to animation and pointer input.
                shape.select('path').each((p, paths) => {
                    const path = paths[p];

                    // @todo Remove.
                    path.scale(0.5);

                    const pathBox = path.rbox(path);
                    const pathArea = boxRad(pathBox);

                    const moves = path.array().value;

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

                        // @todo Remove.

                        /*toMoves.splice(0, Infinity,
                            // Metaballs
                            ...toMoves,
                            //Original.
                            // ...moves
                            //     .map((m) => ((m[0].search(/^[tcsqa]$/i) >= 0)?
                            //             ['L', m[m.length-2], m[m.length-1]]
                            //         :   m)),
                            // Original shape position.
                            // ...pathCircle(...center, pathArea, 5, startAngle)
                            //     .map((m) => ((m[0].search(/^[tcsqa]$/i) >= 0)?
                            //             ['L', m[m.length-2], m[m.length-1]]
                            //         :   m)),
                            // Original force position.
                            // ...pathCircle(...force.pos, force.rad*pathArea/shapeArea-2,
                            //     3, startAngle),
                            // Shape starting point.
                            ...pathCircle(...pojoToVec2(start), 10, 5, 0)
                                .map((m) => ((m[0].search(/^[tcsqa]$/i) >= 0)?
                                        ['L', m[m.length-2], m[m.length-1]]
                                    :   m)),
                            // Metaball starting point.
                            ...pathCircle(...splits[0].slice(-2), 10, 3, 0)
                                .map((m) => ((m[0].search(/^[tcsqa]$/i) >= 0)?
                                        ['L', m[m.length-2], m[m.length-1]]
                                    :   m))
                        );
                        */

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
                });
            });
        });
    })();
}

export default navHolds;
