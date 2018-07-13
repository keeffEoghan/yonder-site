import 'pepjs';

// Use the sqs-core module to access core Squarespace
// functionality, like Lifecycle and ImageLoader. For
// full documentation, go to:
//
// http://github.com/squarespace/squarespace-core

import core from '@squarespace/core';
import controller from '@squarespace/controller';

import site from './controllers/site';
import navHolds from './controllers/nav-holds';
import sticky from './controllers/sticky';

controller.register('yr-site', site);
controller.register('yr-nav-holds', navHolds);
controller.register('yr-sticky', sticky);
