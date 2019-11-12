// 1. This implementation is using a native approach, where we:
//    A. Count on the V8 implementation to track full stack traces, even through `awaits`s.
//    B. Use a native module 'weak-value-map', for allowing garbage collection of the zones.
//    C. Can only support node >= 12, as it will be the first to
//        receive V8 7.3 which has propert await stack tracing.
// 2. This aims for complete conformance with the spec proposal.
// 3. This detects `async` function through the constructor name.
//    As long as you don't have functions called 'AsyncFunction',
//     you should be fine.
//    Otherwise, there may be a tiny extra work done for calling that
//     specific function.

let WeakValueMap;

try {
    WeakValueMap = require('weakvaluemap');
}
catch (ignored) {
    WeakValueMap = require('weak-value-map');
}

const {
    IdSymbol,
    ParentSymbol,
    WrappedSymbol,
    RootZone,
} = require('./private');

const { zoneIdRegex, generateMarkerFunction } = require('./utils');

let idCounter = 1;
let zoneMap = new WeakValueMap();

/** @type {Zone|null} */
let rootZone = null;

class Zone {

    constructor({ name, parent }) {
        const id = idCounter++;

        this[IdSymbol] = id;
        this.name = name;

        if (parent instanceof Zone)
            this[ParentSymbol] = parent;

        zoneMap.set(id, this);
    }

    get parent() {
        return this[ParentSymbol];
    }

    fork({ name }) {
        return new Zone({ name: name, parent: this });
    }

    run(callback, applyThis, applyArguments) {
        if (applyArguments != null && !('length' in applyArguments))
            applyArguments = undefined;

        let zone = Zone.current;
        if (zone === this)
            return callback.apply(applyThis, applyArguments);
        else
            return generateMarkerFunction(this[IdSymbol])(callback, applyThis, applyArguments);
    }

    wrap(callback) {
        let zone = this;

        if (callback[WrappedSymbol]) {
            // Avoid multiple wraps, as there's no point in it
            callback = callback[WrappedSymbol];
        }

        const wrapper = function () {
            return zone.run(callback, this, arguments);
        };

        wrapper[WrappedSymbol] = callback;

        Object.defineProperty(wrapper, 'toString', {
            configurable: true,
            writable: true,
            enumerable: false,
            value: () => callback.toString(),
        });

        return wrapper;
    }

    /** @returns Zone */
    static get current() {
        let obj = {};
        Error.captureStackTrace(obj);
        let m = obj.stack.match(zoneIdRegex);
        if (m)
            return zoneMap.get(parseInt(m[1], 10));
        return rootZone;
    }
}

rootZone = new Zone({ name: '(root zone)' });

Zone[RootZone] = rootZone;

/** @type {typeof Zone} */
module.exports = Zone;