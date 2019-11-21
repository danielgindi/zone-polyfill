let patched = false;
let originals = require('./originals');

function patch() {
    if (patched) return;
    patched = true;

    const Zone = require('../zone');

    originals.setInterval = setInterval;
    const _setInterval = setInterval;
    global.setInterval = function setInterval(fn, ...args) {
        let zone = Zone.current;
        if (zone !== undefined)
            fn = zone.wrap(fn);
        return _setInterval(fn, ...args);
    };

    originals.setImmediate = setImmediate;
    const _setImmediate = setImmediate;
    global.setImmediate = function setImmediate(fn, ...args) {
        let zone = Zone.current;
        if (zone !== undefined)
            fn = zone.wrap(fn);
        return _setImmediate(fn, ...args);
    };

    originals.setTimeout = setTimeout;
    const _setTimeout = setTimeout;
    global.setTimeout = function setTimeout(fn, ...args) {
        let zone = Zone.current;
        if (zone !== undefined)
            fn = zone.wrap(fn);
        return _setTimeout(fn, ...args);
    };
}

function unpatch() {
    if (!patched) return;

    global.setInterval = originals.setInterval;
    global.setImmediate = originals.setImmediate;
    global.setTimeout = originals.setTimeout;

    patched = false;
}

module.exports.patch = patch;
module.exports.unpatch = unpatch;
