import $ from 'zepto';
import { vec2 } from 'gl-matrix';

import SVG from '../libs/custom/svg';
import Darwin from '../libs/custom/darwin';

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

        const force = {
            pos: vec2.fromValues(100, 100),
            rad: 40,
            pow: 2,
            radFrom: 60,
            radTo: 30
        };

        force.rad2 = force.rad*force.rad;
        force.radFrom2 = force.radFrom*force.radFrom;
        force.radTo2 = force.radTo*force.radTo;

        const vec2Cache = Array(2).fill().map(vec2.create);


        /**
         * Handle each SVG.js path command individually - various ways to move points.
         * Change everything into absolute coordinates.
         * All coordinates are absolute, as handled by `SVG.PathArray`.
         *
         * @see https://css-tricks.com/svg-path-syntax-illustrated-guide/
         * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
         * @see https://github.com/svgdotjs/svg.js/blob/master/src/patharray.js
         */
        function movePoint(m, moves, point) {
            const move = moves[m];
            // SVG.js path moves define the command name first.
            const c = move[0];
            const l = move.length;

            if(c.search(/[mltcsqa]/gi) >= 0) {
                // Endpoint last.
                return vec2.set(point, move[l-2], move[l-1]);
            }
            else if(c.search(/h/gi) >= 0) {
                // Endpoint x last, y in previous move.
                return vec2.set(point, move[l-1], movePoint(m-1, moves, point)[1]);
            }
            else if(c.search(/v/gi) >= 0) {
                // Endpoint y last, x in previous move.
                return vec2.set(point, movePoint(m-1, moves, point)[0], move[l-1]);
            }
            else if(c.search(/z/gi) >= 0) {
                // Endpoint in previous `M` move.
                let i = m-1;

                for(; i > 0; --i) {
                    if(moves[i][0].search(/m/gi) >= 0) {
                        break;
                    }
                }

                return movePoint(i, moves, point);
            }
            else {
                console.warn('Unknown SVG path command.', c, move, m, moves);
            }
        }

        const $holds = $element.find('.yr-nav-hold').each((h, hold) => {
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

                const { cx, cy } = shape.rbox(shape);

                // Exit/reset if the shape's out of range of the force.
                // @todo Improve, take into account the radius...
                // if(!shape.inside(...force.pos)) { return; }

                // Get on with the effect
                // @todo Hook this part up to animation and pointer input.
                shape.select('path').each((p, paths) => {
                    // Create an approximate circle of beziers.
                    // @see https://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
                    // @see https://codepen.io/keeffEoghan/pen/odZQJg
                    const path = paths[p];
                    const moves = path.array().value;
                    const n = moves.length;
                    const angle = Math.PI*2/n;
                    const start = movePoint(0, moves, vec2Cache[0]);
                    const startAngle = Math.atan2(start[1], start[0]);
                    const cp = 4/3*Math.tan(Math.PI/(2*n));

                    const points = moves.map((move, m, moves) => {
                        const x0 = Math.cos(startAngle+(angle*(m-1)))*force.radFrom;
                        const y0 = Math.sin(startAngle+(angle*(m-1)))*force.radFrom;
                        const x1 = Math.cos(startAngle+(angle*m))*force.radFrom;
                        const y1 = Math.sin(startAngle+(angle*m))*force.radFrom;

                        return [
                            'C',
                            cx+x0+(-y0*cp), cy+y0+(x0*cp),
                            cx+x1+(y1*cp), cy+y1+(-x1*cp),
                            cx+x1, cy+y1
                        ];
                    });

                    points.unshift(['M', ...points[points.length-1].slice(-2)]);
                    points.push(['Z']);

                    /*
                    const points = moves.map((move, m, moves) => {
                            const point = movePoint(m, moves, vec2Cache[0]);
                            const to = vec2.sub(vec2Cache[1], point, force.pos);

                            // @todo Check if we're inside the shape?
                            const angle = Math.atan2(to[1], to[0]);
                            const out = ;

                            // Square units used for performance, if accuracy not an issue...
                            // const len2 = vec2.sqrLen(to);
                            // const f = force.pow*Math.max(force.rad2-len2, 0)/force.rad2;

                            // const out = vec2.scaleAndAdd(point, force.pos, to, 1-f);

                            return {
                                move: [...move.slice(0, -2), ...out],
                                angle
                            };
                        })
                        .sort(({ angle }) => angle)
                        .map(({ move }) => move);*/

                    path.animate().loop(true, true).plot(points);
                });
            });
        });
    })();

    /*
    (() => {
        const $menu = $element.find('.yr-nav-holds-menu');
        const $blob = $('<li class="yr-nav-hold-blob"></li>').appendTo($menu);
        const rad = 60;

        const $holds = $menu.find('.yr-nav-hold');

        $(self).on('mousemove', (e) => {
            const menuBox = $menu.offset();

            const s = $holds.reduce((r, hold, i) => {
                    const $hold = $(hold);
                    const holdBox = $hold.offset();
                    const d = distance({
                            x: holdBox.left+(holdBox.width*0.5),
                            y: holdBox.top+(holdBox.height*0.5)
                        },
                        {
                            x: e.pageX,
                            y: e.pageY
                        });
                    const limit = Math.max(holdBox.width, holdBox.height)*0.5;
                    const scale = (limit-d)/limit;

                    if(scale > r.scale) {
                        r.scale = scale;
                        r.$hold = $hold;
                    }

                    return r;
                },
                {
                    scale: 0,
                    $hold: null
                });

            $blob.css({
                backgroundColor: ((s.$hold)?
                        s.$hold.find('.yr-use-hold-shape, .yr-hold-shape').css('color')
                    :   ''),
                transform: `
                    translate(${e.pageX-rad-menuBox.left}px,
                        ${e.pageY-rad-menuBox.top}px)
                    scale(${s.scale})
                `,
                left: 0,
                top: 0,
                width: rad*2,
                height: rad*2
            });
        });
    })();*/
}

export default navHolds;
