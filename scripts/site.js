
// Use the sqs-core module to access core Squarespace
// functionality, like Lifecycle and ImageLoader. For
// full documentation, go to:
//
// http://github.com/squarespace/squarespace-core

import core from '@squarespace/core';
import controller from '@squarespace/controller';

import siteLoader from './controllers/site-loader';

controller.register('site-loader', siteLoader);

window.addEventListener('DOMContentLoaded', function() {
    var images = document.querySelectorAll('img[data-src]');

    for(var i = 0; i < images.length; i++) {
        core.ImageLoader.load(images[i], {
            load: true
        });
    }
});
