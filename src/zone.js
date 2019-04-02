// 1. This implementation is using the approach from angular/zone.js of
//     tracking the current zone in a linked list.
// 2. This aims for complete conformance with the spec proposal.
// 3. This detects `async` function through the constructor name.
//    As long as you don't have functions called 'AsyncFunction',
//     you should be fine.
//    Otherwise, there may be a tiny extra work done for calling that
//     specific function.

const {
    IdSymbol,
    ParentSymbol,
    WrappedSymbol,
    RootZone,
} = require('./private');

let idCounter = 1;

/** @type {Zone|null} */
let rootZone = null;
let currentZoneFrame = null;

class Zone {

    constructor({ name, parent }) {
        const id = idCounter++;

        this[IdSymbol] = id;
        this.name = name;

        if (parent instanceof Zone)
            this[ParentSymbol] = parent;
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

        currentZoneFrame = { zone: this, parent: currentZoneFrame };

        try {
            if (callback.constructor.name === 'AsyncFunction') {
                return async function () {
                    currentZoneFrame = { zone: this, parent: currentZoneFrame };
                    try {
                        return callback.apply(applyThis, applyArguments);
                    }
                    finally {
                        currentZoneFrame = currentZoneFrame.parent;
                    }
                };
            }
            else {
                return callback.apply(applyThis, applyArguments);
            }
        }
        finally {
            currentZoneFrame = currentZoneFrame.parent;
        }
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
        return currentZoneFrame === null ? rootZone : currentZoneFrame.zone;
    }
}

rootZone = new Zone({ name: '(root zone)' });

Zone[RootZone] = rootZone;

/** @type {typeof Zone} */
module.exports = Zone;