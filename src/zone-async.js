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
    UsesAsyncLocalStorage,
} = require('./private');

const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

let idCounter = 1;

class Zone {

    constructor({ name, parent }) {
        this[IdSymbol] = idCounter++;
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
        if (Array.isArray(applyArguments) || (
            applyArguments !== null &&
            typeof applyArguments === 'object' &&
            'length' in applyArguments)) {
            return asyncLocalStorage.run(this, callback.bind(applyThis), ...applyArguments);
        }

        return asyncLocalStorage.run(this, callback.bind(applyThis));
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
        return asyncLocalStorage.getStore() || rootZone;
    }

    static disable() {
        asyncLocalStorage.disable();
    }
}

const rootZone = new Zone({ name: '(root zone)' });

Zone[RootZone] = rootZone;

Zone.prototype[UsesAsyncLocalStorage] = true;

/** @type {typeof Zone} */
module.exports = Zone;