const { UsesAsyncLocalStorage } = require('../private');

function patch(Zone) {
    if (!Zone) {
        Zone = require('../zone');
    }

    const usesAsyncLocalStorage = Zone.prototype[UsesAsyncLocalStorage];

    if (!usesAsyncLocalStorage) {
        require('./timers').patch();
        require('./promise').patch();
        require('./nextTick').patch();
    }

    require('./events').patch();
}

function unpatch() {
    require('./timers').unpatch();
    require('./promise').unpatch();
    require('./nextTick').unpatch();
    require('./events').unpatch();
}

module.exports.patch = patch;
module.exports.unpatch = unpatch;
module.exports.originals = require('./originals');
