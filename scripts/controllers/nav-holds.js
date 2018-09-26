import $ from 'zepto';
// @todo Import only the needed functions
import { vec2 } from 'gl-matrix';
import bezier from 'bezier';
import throttle from 'lodash/fp/throttle';

import { cubicSuperPath, uncubicSuperPath, splitAtPositions, positions }
    from 'svg.pathmorphing2.js/src/cubicsuperpath';

import SVG from '../libs/custom/svg';
import Darwin from '../libs/custom/darwin';
import { Tweak } from '@squarespace/core';

import { pickMoveEndpoint, bezierVia } from '../svg/paths';
import nearestOnPath from '../svg/nearest-on-path';

import { __ } from '../constants';
import { atan2Circle, wrapNum } from '../utils';
import { angleBetween, angleDiffX } from '../vec2';

function navHolds(element) {
    const $element = $(element);

    const info = {
        $form: $element.find('.yr-nav-holds-info-form'),
        $container: $element.find('.yr-nav-holds-info-block'),
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
         * Intuitive cascade from the combination maths - each number's pairs in
         * turn, minus already-used pairs:
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
         * @param {Number} n The number of options to choose from (`n` in `nCr` or
         *     `n choose r`).
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
        callback(mutations) {
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


    /**
     * Set up blobby holds and animations.
     */
    function setupBlobs() {
        if(!SVG.supported) { return; }

        // Init... needed internally in SVG.js even if we're not drawing in this
        // element.
        const svg = SVG($('.yr-nav-holds-defs')[0]);

        // @todo Caching is an optimisation... don't do it prematurely.
        const cache = {
            pojo: Array(2).fill().map(() => ({})),
            vec2: Array(3).fill().map(vec2.create),
            array: Array(2).fill().map(Array)
        };

        const clipHolds = Tweak.getValue('tweak-yr-nav-holds-blob-clip') === 'true';


        /**
         * @todo Remove redundant libs:
         *       - 'svgpath/lib/a2c': `a2c` => 'svg.pathmorphing2.js': `arcToPath`
         *       - 'bezier-utils': `getSubBezier` => 'svg.pathmorphing2.js': `segSplit`
         *
         * @todo Resize SVG to the full container - so the interactions avoid bounds.
         */
        const force = {
            pos: vec2.fromValues(0, 0),
            rad: 60,
            pow: (parseFloat(Tweak.getValue('tweak-yr-nav-holds-blob-power'), 10) ||
                0.15)
        };

        const pojoToVec2 = (pojo, out = vec2.create()) => vec2.set(out, pojo.x, pojo.y);

        const morphBezier = [0, 0, 1, 1];
        const morphEase = (t) => bezier(morphBezier, t);

        const hits = {
            items: [],
            boxes: [],
            resize: () =>
                hits.items.forEach((item, i) => hits.boxes[i] = item.rbox()),

            get: ([px, py], rad) => hits.items.filter((item, i) => {
                const { x, y, x2, y2 } = hits.boxes[i];

                return (px+rad >= x && py+rad >= y && px-rad <= x2 && py-rad <= y2);
            })
        };

        /** (1) Setup: */

        // Find the SVGs we want - the default, or one in a `block-field`.
        function findShapes($hold) {
            const $block = $hold.find('.yr-nav-holds-shape-block');

            return (($block.hasClass('empty'))? $hold : $block)
                // These classes must be on any SVGs to opt in to this effect.
                .find('.yr-hold-shape, .yr-use-hold-shape');
        }

        $element.find('.yr-nav-hold').each((h, hold) => {
            const $hold = $(hold);

            findShapes($hold).each((s, shape) => {
                shape = (shape.instance || SVG.adopt(shape));

                // Replace any relevant `use` with the symbol - to use independently.
                if(shape.hasClass('yr-use-hold-shape')) {
                    const href = ((shape.attr('href'))? 'href' : 'xlink:href');

                    shape = shape.replace(shape.reference(href).clone(shape.parent()));
                }

                // @todo Increase the SVG canvas size as much as needed.

                // Prepare the effect.
                shape.select('path').each((p, paths) => {
                    const path = paths[p];
                    const coarseMoves = path.array();


                    // Prepare paths:

                    // Normalize path as bézier curves.
                    const fineCSP = cubicSuperPath(coarseMoves);

                    // Subdivide into finer pieces.

                    const length = path.node.getTotalLength();
                    const maxSlice = 5;
                    const slice = length/Math.ceil(length/maxSlice);

                    const splitPositions = Array(Math.floor(length/slice)-1).fill()
                        .reduce((_a, _b, i, all) =>
                            (all[i] = (i+1)*slice/length, all), null);

                    splitAtPositions(fineCSP, positions(fineCSP), splitPositions);

                    // Replace the old path.

                    const finePathArray = uncubicSuperPath(fineCSP);

                    /**
                     * @todo `uncubicSuperPath` only accounts for `m` and `c` moves.
                     *     For a smoothly closed path, we also need `z`.
                     *     This isn't perfect, but it'll keep the last `z` if any.
                     */
                    const zPrev = coarseMoves.value[coarseMoves.value.length-1];
                    const zNext = finePathArray.value[finePathArray.value.length-1];

                    if(zPrev[0].search(/^z$/i) >= 0 && zNext[0].search(/^z$/i) < 0) {
                        finePathArray.value.push(['z']);
                    }

                    path.plot(finePathArray);

                    // Store for use in later interaction.
                    path.remember('base', finePathArray);

                    // Create a hit area for pointers - in a shared layer, to
                    // manage `z` etc.
                    hits.items.push(path);
                });
            });

            // Clip the hold to the SVG path to keep everything inside the lines.
            if(clipHolds) {
                // This class must be on any SVGs to opt in to this clipping effect.
                let clipPath = findShapes($hold).find('.yr-hold-clip')[0];

                if(clipPath) {
                    clipPath = (clipPath.instance || SVG.adopt(clipPath));

                    const clipSVG = clipPath.doc();
                    const clipDef = clipSVG.clip().add(clipSVG.use(clipPath));

                    $hold.find('.yr-nav-hold-a')
                        .css('clip-path', `url(#${ clipDef.attr('id') })`);
                }
            }
        });


        /** (2) Respond to interaction: */

        // Points to draw a bezier curve through, and index offset.
        const morphVia = {
            // The points we'll draw our curve through.
            points: [],
            // The start of the new curve in the original path array; or -1 if none.
            index: -1,
            // The number of points in the new curve.
            length: 0,
            // Invalidates the new curve.
            reset() {
                morphVia.index = -1;
                morphVia.length = 0;
            },
            // Cache.
            vec2: Array(2).fill().map(vec2.create)
        };

        const spliceCurve = (moves, offset, curves) => curves.forEach((curve, c) => {
            const move = moves[offset+c];
            const type = move[0];

            if(type.search(/^m$/i) >= 0) {
                // We might've replaced an 'M' move.
                move.splice(0, Infinity,
                    type, curve[curve.length-2], curve[curve.length-1]);
            }
            else if(type.search(/^z$/i) >= 0) {
                // We might've replaced a 'Z' move.
                move.splice(0, Infinity, type);
            }
            else {
                // Bézier's fine for anything else.
                move.splice(0, Infinity, ...curve);
            }
        });

        function blobPointer(path, force) {
            /**
             * (2.1) Morph points towards pointer - interploate within radius, eased
             *     by force/distance.
             */

            // The force position relative to the path.
            const pos = pojoToVec2(path.point(...force.pos), morphVia.vec2[0]);

            // Draw curves through points close enough to the pointer.
            const morphPathArray = path.stop(false, true).array();
            const morphMoves = morphPathArray.value;

            morphVia.reset();

            // Account for wrapping; being in the middle of a curve when passing
            // the end of the array.
            // So far, assumes closed shapes.
            for(let i = 0; i < Math.max(0, morphVia.index)+morphMoves.length; ++i) {
                const m = i%morphMoves.length;
                const point = pickMoveEndpoint(morphMoves, m, morphVia.vec2[1]);
                const dist = force.rad-vec2.dist(point, pos);

                if(dist > 0) {
                    // Gather the points we'll curve through.

                    if(morphVia.index < 0) {
                        // Start a new segment to curve through.
                        morphVia.index = m;

                        // Need an extra point before the first point curved through.
                        const start = pickMoveEndpoint(morphMoves,
                            wrapNum(m-1, morphMoves.length));

                        morphVia.points[morphVia.length++] = start;
                    }

                    // Get/create the next morphed point as needed.
                    const next = (morphVia.points[morphVia.length] ||
                        (morphVia.points[morphVia.length] = vec2.create()));

                    /**
                     * @todo Might need to use the nearest point on a circle as
                     *     `lerp` target instead - so the blob isn't pointy.
                     * @todo Might look better if we only move away from the shape
                     *     center, never back inwards.
                     */
                    vec2.lerp(next, point, pos, morphEase(dist/force.rad)*force.pow);

                    morphVia.length++;
                }
                else if(morphVia.length) {
                    // Curve through any gathered points.

                    morphVia.points.length = morphVia.length;

                    const curves = bezierVia(morphVia.points);

                    // Merge in the new curves - accounting for array wrapping.

                    const extra = (morphVia.index+curves.length)-morphMoves.length;

                    // Splice in the extra wrapped part of the new curve, if any.
                    if(extra > 0) {
                        // @todo Indexes or view into array, not new `spliced` array.
                        spliceCurve(morphMoves, 0, curves.splice(-extra));
                    }

                    spliceCurve(morphMoves, morphVia.index, curves);

                    morphVia.reset();
                }
            }

            path
                .animate(250, '<')
                .plot(morphPathArray)
                .animate(500, '<>')
                .plot(path.remember('base'));
        }

        // Keep the hits up to date.
        hits.resize();
        $(window).on('resize', hits.resize);

        $element.on('pointermove', throttle(50, ({ x, y }) => {
            vec2.set(force.pos, x, y);
            hits.get(force.pos, force.rad).forEach((hit) => blobPointer(hit, force));
        }));
    }

    if(Tweak.getValue('tweak-yr-nav-holds-blob-show') === 'true') {
        setupBlobs();
    }
}

export default navHolds;
