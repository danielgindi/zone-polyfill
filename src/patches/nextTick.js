let patched = false;
let originals = require('./originals');

function patch() {
    if (patched) return;
    patched = true;

    const Zone = require('../zone');

    originals.process = Object.create(null);
    originals.process.nextTick = process.nextTick;
    const _nextTick = process.nextTick;
    process.nextTick = function nextTick(fn, ...args) {
        let zone = Zone.current;
        if (zone !== undefined)
            fn = zone.wrap(fn);
        return _nextTick(fn, ...args);
    };
}

function unpatch() {
    if (!patched) return;

    global.process.nextTick = originals.process.nextTick;

    patched = false;
}

module.exports.patch = patch;
module.exports.unpatch = unpatch;
