function patch() {
    require('./timers').patch();
    require('./promise').patch();
    require('./events').patch();
    require('./nextTick').patch();
}

function unpatch() {
    require('./timers').unpatch();
    require('./promise').unpatch();
    require('./events').unpatch();
    require('./nextTick').unpatch();
}

module.exports.patch = patch;
module.exports.unpatch = unpatch;
module.exports.originals = require('./originals');
