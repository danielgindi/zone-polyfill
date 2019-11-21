let patched = false;
let originals = require('./originals');

const { patchPrototype, unpatchPrototype } = require('./_util');

function patch() {
    if (patched) return;
    patched = true;

    const Zone = require('../zone');
    const fastWrap = (zone, cb) => {
        return function () {
            return zone.run(cb, this, arguments);
        };
    };

    originals.Promise = Object.create(null);
    originals.Promise.prototype = Object.create(null);

    originals.Promise.prototype.then = Promise.prototype.then;
    const _promiseThen = Promise.prototype.then;
    patchPrototype(Promise.prototype, 'then', function (onFulfilled, onRejected) {
        let zone = Zone.current;
        if (zone !== undefined) {
            if (typeof onFulfilled === 'function')
                onFulfilled = fastWrap(zone, onFulfilled);
            if (typeof onRejected === 'function')
                onRejected = fastWrap(zone, onRejected);
        }
        return _promiseThen.call(this, onFulfilled, onRejected);
    }, true);

    originals.Promise.prototype.catch = Promise.prototype.catch;
    const _promiseCatch = Promise.prototype.catch;
    patchPrototype(Promise.prototype, 'catch', function (onRejected) {
        let zone = Zone.current;
        if (zone !== undefined)
            onRejected = fastWrap(zone, onRejected);
        return _promiseCatch.call(this, onRejected);
    }, true);

    originals.Promise.prototype.finally = Promise.prototype.finally;
    const _promiseFinally = Promise.prototype.finally;
    patchPrototype(Promise.prototype, 'finally', function (onFinally) {
        let zone = Zone.current;
        if (zone !== undefined)
            onFinally = fastWrap(zone, onFinally);
        return _promiseFinally.call(this, onFinally);
    }, true);
}

function unpatch() {
    if (!patched) return;

    unpatchPrototype(Promise.prototype, 'then', originals.Promise.prototype.then, true);
    unpatchPrototype(Promise.prototype, 'catch', originals.Promise.prototype.catch, true);
    unpatchPrototype(Promise.prototype, 'finally', originals.Promise.prototype.finally, true);

    patched = false;
}

module.exports.patch = patch;
module.exports.unpatch = unpatch;
