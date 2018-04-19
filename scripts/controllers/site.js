import $ from 'zepto';
import { refresh } from '@squarespace/controller';
import { Lifecycle, Tweak, ImageLoader } from '@squarespace/core';
import Mercury from '@squarespace/mercury';

import { authenticated, debug } from '../constants';

let element;
let $element;

function site(e) {
    element = e;
    $element = $(element);

    loadAJAX();

    $(loadImages);
    window.addEventListener('load', loadImages);

    // Prevent link events reaching `body` when `a` descendents are being edited in CMS.
    $element.find('body > *').on('click', 'a .sqs-editing', false);
}

// Exceptions: external links, hash links
const onClickExceptions = ['[data-no-ajax]'];

// Exceptions after making the request. Does a string match for any of these
// in the responseText
const onRequestExceptions = [];

// updateMatrix indicates which elements need to be updated on load. You can
// choose whether to update attributes, replace HTML, or both.
const updateMatrix = [
    // This would be nice, but won;t work as Mercury only queries for the first selector
    // { selector: '[data-ajax-update~=html]', updateHTML: true },
    // { selector: '[data-ajax-update~=attrs]', updateAttrs: true },
    // { selector: '[data-ajax-update~=script]', updateScript: true },

    { selector: 'html', updateAttrs: true },
    { selector: 'title', updateHTML: true },
    { selector: 'meta[property="og:title"]', updateAttrs: true },
    { selector: 'meta[property="og:latitude"]', updateAttrs: true },
    { selector: 'meta[property="og:longitude"]', updateAttrs: true },
    { selector: 'meta[property="og:url"]', updateAttrs: true },
    { selector: 'meta[property="og:type"]', updateAttrs: true },
    { selector: 'meta[property="og:description"]', updateAttrs: true },
    { selector: 'meta[property="og:image"]', updateAttrs: true },
    { selector: 'meta[itemprop="name"]', updateAttrs: true },
    { selector: 'meta[itemprop="url"]', updateAttrs: true },
    { selector: 'meta[itemprop="description"]', updateAttrs: true },
    { selector: 'meta[itemprop="thumbnailUrl"]', updateAttrs: true },
    { selector: 'meta[itemprop="image"]', updateAttrs: true },
    { selector: 'meta[name="twitter:title"]', updateAttrs: true },
    { selector: 'meta[name="twitter:image"]', updateAttrs: true },
    { selector: 'meta[name="twitter:url"]', updateAttrs: true },
    { selector: 'meta[name="twitter:card"]', updateAttrs: true },
    { selector: 'meta[name="twitter:description"]', updateAttrs: true },
    { selector: 'meta[name="twitter:url"]', updateAttrs: true },
    { selector: 'meta[name="description"]', updateAttrs: true },
    { selector: 'link[rel="canonical"]', updateAttrs: true },
    { selector: 'link[rel="image_src"]', updateAttrs: true },
    { selector: 'link[rel="alternate"]', updateAttrs: true },
    { selector: 'body', updateAttrs: true },
    { selector: '.yr-main', updateAttrs: true, updateHTML: true },
    { selector: '.yr-nav .yr-nav-links', updateAttrs: true, updateHTML: true }
];

/**
 * Instantiates a mercury loader for the site in unauthenticated sessions.
 */
function loadAJAX() {
    const ajaxEnabled = Tweak.getValue('tweak-yr-ajax-enable') === 'true';

    // Don't use ajax in authenticated session or when tweak option is disabled.
    // if ((!debug && authenticated) || !ajaxEnabled) {
    if (!ajaxEnabled) {
        return false;
    }

    // Give enough time for any animations to finish.
    const waitTime = Math.max(waitFade.bar(), waitFade.content());

    const mercury = new Mercury({
        enableCache: true,
        updateMatrix,
        onClickExceptions,
        onRequestExceptions,
        timeout: 10000,
        onLoadDelay: waitTime
    });

    const stages = {
        navigate() {
            $element.attr('data-yr-ajax-loading', 'navigate');
            // Close the navigation menu if it's open.
            $element.find('.yr-nav-toggler').prop('checked', false);
        },
        unload() {
            Lifecycle.destroy();
            $element.attr('data-yr-ajax-loading', 'unload');
        },
        swap() {
            // Mercury doesn't control the data attribute - add a phase...
            $element.attr('data-yr-ajax-loading', 'swap');

            Lifecycle.init();
            loadImages();
            refresh();

            setTimeout(stages.load, 0);
            setTimeout(stages.fin, waitTime);
        },
        load: () => $element.attr('data-yr-ajax-loading', 'load'),
        fin: () => $element.removeAttr('data-yr-ajax-loading')
    };

    window.addEventListener('mercury:navigate', stages.navigate);

    // Squarespace init and destroy

    window.addEventListener('mercury:unload', stages.unload);

    window.addEventListener('mercury:load', stages.swap);
}

const loadImages = () =>
    Array.prototype.forEach.call(document.querySelectorAll('img[data-src]:not(.loaded)'),
        (image) => ImageLoader.load(image, { load: true }));

const timeUnitsMap = {
    'ms': 1,
    's': 1000
};

const waitFade = {
    bar: () => ((Tweak.getValue('tweak-yr-loader-show'))? 500 : 0),
    content() {
        let wait = 0;
        const flagTweak = Tweak.getValue('tweak-yr-loader-fade-content');

        if(flagTweak && !flagTweak.match(/nah/gi)) {
            const timeTweak = (Tweak.getValue('tweak-yr-loader-fade-content-time') || '');

            // Style Editor screws up this time units - fallback.
            const units = (timeTweak.match(/[a-zA-Z]*/gi) || '').join('');
            const time = ((units in timeUnitsMap)?
                    parseFloat(timeTweak, 10)*timeUnits.map[units]
                :   400);
            
            console.log('tweak-yr-loader-fade-content-time', timeTweak, time);

            wait = ((flagTweak.match(/simple/gi))?
                    time
                : ((flagTweak.match(/fancy/gi))?
                    time * 2
                :   0));
        }

        return (wait || 0);
    }
};

export default site;
