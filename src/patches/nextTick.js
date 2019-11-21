let patched = false;
let originals = require('./originals');

function patch() {
    if (patched) return;
    patched = true;

    const Zone = require('../zone');
    const fastWrap = (zone, cb) => {
        return function () {
            return zone.run(cb, this, arguments);
        };
    };

    originals.process = Object.create(null);
    originals.process.nextTick = process.nextTick;
    const _nextTick = process.nextTick;
    process.nextTick = function nextTick(fn, ...args) {
        let zone = Zone.current;
        if (zone !== undefined)
            fn = fastWrap(zone, fn);
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
