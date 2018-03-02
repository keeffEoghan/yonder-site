import $ from 'zepto';
import { refresh } from '@squarespace/controller';
import { Lifecycle, Tweak, ImageLoader } from '@squarespace/core';
import Mercury from '@squarespace/mercury';

import { authenticated, debug } from '../constants';

function site() {
    loadAJAX();
    loadImages();

    // Prevent link events reaching `body` when `a` descendents are being edited in CMS.
    $('body > *').on('click', 'a .sqs-editing', false);
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
    if ((!debug && authenticated) || !ajaxEnabled) {
        return false;
    }

    const mercury = new Mercury({
        enableCache: true,
        updateMatrix,
        onClickExceptions,
        onRequestExceptions,
        timeout: 10000
    });

    window.addEventListener('mercury:navigate', () => {
        document.documentElement.setAttribute('data-ajax-loading', 'start');
    });

    // Squarespace init and destroy

    window.addEventListener('mercury:unload', () => {
        document.documentElement.setAttribute('data-ajax-loading', 'swap');
        Lifecycle.destroy();
    });

    window.addEventListener('mercury:load', () => {
        document.documentElement.setAttribute('data-ajax-loading', 'done');
        Lifecycle.init();

        setTimeout(() => document.documentElement.removeAttribute('data-ajax-loading'), 500);
    });

    // Sync controllers on AJAX load
    window.addEventListener('mercury:load', refresh);
}

function loadImages() {
    $(() => {
        var images = document.querySelectorAll('img[data-src]:not(.loaded)');

        for(var i = 0; i < images.length; i++) {
            console.log('Loading image', ImageLoader.load(images[i], { load: true }));
        }
    });
}

export default site;
