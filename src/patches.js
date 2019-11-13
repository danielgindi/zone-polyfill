let patched = false;
let originals = Object.create(null);

function patchPrototype(proto, name, fn, native = false) {
    if (native) {
        Object.defineProperty(proto, name, {
            configurable: true,
            writable: true,
            enumerable: false,
            value: fn,
        });
    }
    else {
        proto[name] = fn;
    }

    Object.defineProperty(proto[name], 'name', { value: name });
}

function unpatchPrototype(proto, name, fn, native = false) {
    if (native) {
        Object.defineProperty(proto, name, {
            configurable: true,
            writable: true,
            enumerable: false,
            value: fn,
        });
    }
    else {
        proto[name] = fn;
    }
}

function patch() {
    if (patched) return;
    patched = true;

    const WrappedListenerSymbol = Symbol('[[WrappedListener]]');

    const Zone = require('./zone');

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

    originals.process = Object.create(null);
    originals.process.nextTick = process.nextTick;
    const _nextTick = process.nextTick;
    process.nextTick = function nextTick(fn, ...args) {
        let zone = Zone.current;
        if (zone !== undefined)
            fn = zone.wrap(fn);
        return _nextTick(fn, ...args);
    };

    originals.Promise = Object.create(null);
    originals.Promise.prototype = Object.create(null);

    originals.Promise.prototype.then = Promise.prototype.then;
    const _promiseThen = Promise.prototype.then;
    patchPrototype(Promise.prototype, 'then', function (onFulfilled, onRejected) {
        let zone = Zone.current;
        if (zone !== undefined) {
            if (typeof onFulfilled === 'function')
                onFulfilled = zone.wrap(onFulfilled);
            if (typeof onRejected === 'function')
                onRejected = zone.wrap(onRejected);
        }
        return _promiseThen.call(this, onFulfilled, onRejected);
    }, true);

    originals.Promise.prototype.catch = Promise.prototype.catch;
    const _promiseCatch = Promise.prototype.catch;
    patchPrototype(Promise.prototype, 'catch', function (onRejected) {
        let zone = Zone.current;
        if (zone !== undefined)
            onRejected = zone.wrap(onRejected);
        return _promiseCatch.call(this, onRejected);
    }, true);

    originals.Promise.prototype.finally = Promise.prototype.finally;
    const _promiseFinally = Promise.prototype.finally;
    patchPrototype(Promise.prototype, 'finally', function (onFinally) {
        let zone = Zone.current;
        if (zone !== undefined)
            onFinally = zone.wrap(onFinally);
        return _promiseFinally.call(this, onFinally);
    }, true);

    const EventsWrappersSymbol = Symbol('[[Wrappers]]');

    const { EventEmitter } = require('events');
    const _addListener = EventEmitter.prototype.addListener;
    const _prependListener = EventEmitter.prototype.prependListener;
    const _once = EventEmitter.prototype.once;
    const _prependOnceListener = EventEmitter.prototype.prependOnceListener;
    const _removeListener = EventEmitter.prototype.removeListener;
    const _removeAllListeners = EventEmitter.prototype.removeAllListeners;
    const _listeners = EventEmitter.prototype.listeners;

    function wrappedEventListener(zone, emitter, type, listener) {
        if (type === 'uncaughtException')
        // don't patch uncaughtException of nodejs to prevent endless loop
            return listener;

        let wrappersMap = listener[EventsWrappersSymbol];
        if (wrappersMap === undefined) {
            // A WeakMap is a weak *key* map.
            // The key here is the EventEmitter, and we really want a weak ref to it.
            // This is a perfect fit.
            wrappersMap = listener[EventsWrappersSymbol] = new WeakMap();
        }

        let wrapped = zone.wrap(listener);
        wrapped[WrappedListenerSymbol] = listener;

        let wrappers = wrappersMap.get(emitter);
        if (wrappers === undefined) {
            wrappersMap.set(emitter, wrapped);
        }
        else {
            if (typeof wrappers === 'function')
                wrappersMap.set(emitter, [wrappers, wrapped]);
            else
                wrappers.push(wrapped);
        }

        return wrapped;
    }

    originals.EventEmitter = Object.create(null);
    originals.EventEmitter.prototype = Object.create(null);

    originals.EventEmitter.prototype.addListener = EventEmitter.prototype.addListener;
    patchPrototype(EventEmitter.prototype, 'addListener', function (type, listener) {
        let zone = Zone.current;
        if (zone === undefined)
            return _addListener.apply(this, arguments);
        return _addListener.call(this, type, wrappedEventListener(zone, this, type, listener));
    });

    originals.EventEmitter.prototype.on = EventEmitter.prototype.on;
    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    originals.EventEmitter.prototype.prependListener = EventEmitter.prototype.prependListener;
    patchPrototype(EventEmitter.prototype, 'prependListener', function (type, listener) {
        let zone = Zone.current;
        if (zone === undefined)
            return _prependListener.apply(this, arguments);
        return _prependListener.call(this, type, wrappedEventListener(zone, this, type, listener));
    });

    originals.EventEmitter.prototype.once = EventEmitter.prototype.once;
    patchPrototype(EventEmitter.prototype, 'once', function (type, listener) {
        let zone = Zone.current;

        let patchedAddListener = EventEmitter.prototype.addListener;
        EventEmitter.prototype.addListener = _addListener;
        EventEmitter.prototype.on = _addListener;

        if (zone === undefined)
            _once.apply(this, arguments);
        else
            _once.call(this, type, wrappedEventListener(zone, this, type, listener));

        EventEmitter.prototype.addListener = patchedAddListener;
        EventEmitter.prototype.on = patchedAddListener;

        return this;
    });

    originals.EventEmitter.prototype.prependOnceListener = EventEmitter.prototype.prependOnceListener;
    patchPrototype(EventEmitter.prototype, 'prependOnceListener', function (type, listener) {
        let zone = Zone.current;

        let patchedAddListener = EventEmitter.prototype.addListener;
        EventEmitter.prototype.addListener = _addListener;
        EventEmitter.prototype.on = _addListener;

        if (zone === undefined)
            _prependOnceListener.apply(this, arguments);
        else
            _prependOnceListener.call(this, type, wrappedEventListener(zone, this, type, listener));

        EventEmitter.prototype.addListener = patchedAddListener;
        EventEmitter.prototype.on = patchedAddListener;

        return this;
    });

    originals.EventEmitter.prototype.removeListener = EventEmitter.prototype.removeListener;
    patchPrototype(EventEmitter.prototype, 'removeListener', function (type, listener) {
        let wrappersMap = listener[EventsWrappersSymbol];
        let wrappers;

        if (wrappersMap !== undefined)
            wrappers = wrappersMap.get(this);

        if (wrappers === undefined)
            return _removeListener.apply(this, arguments);

        // removeListener always removed the first one found
        let toRemove;
        if (typeof wrappers === 'function') {
            toRemove = wrappers;
            wrappersMap.delete(this);
        }
        else {
            toRemove = wrappers[0];

            if (wrappers.length === 2)
                wrappersMap.set(this, wrappers[1]);
            else
                wrappers.splice(0, 1);
        }

        return _removeListener.call(this, type, toRemove);
    });

    function removeWrapperRefsForEvent(emitter, name) {
        let listeners = _listeners.call(emitter, name);
        for (let listener of listeners) {
            let wrapped = listener[WrappedListenerSymbol];
            if (wrapped) {
                let wrappersMap = wrapped[EventsWrappersSymbol];
                if (wrappersMap !== undefined) {
                    let wrappers = wrappersMap.get(emitter);
                    if (wrappers !== undefined) {
                        if (wrappers === listener) {
                            wrappersMap.delete(emitter);
                        }
                        else if (typeof wrappers !== 'function') {
                            let index = wrappers.indexOf(listener);
                            if (index !== -1) {
                                if (wrappers.length === 2) {
                                    wrappersMap.set(emitter, wrappers[1 - index]);
                                }
                                else {
                                    wrappers.splice(index, 1);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    originals.EventEmitter.prototype.removeAllListeners = EventEmitter.prototype.removeAllListeners;
    patchPrototype(EventEmitter.prototype, 'removeAllListeners', function (type) {
        let eventNames = this.eventNames();

        if (arguments.length === 0) {
            for (let name of eventNames) {
                removeWrapperRefsForEvent(this, name);
            }
        }
        else {
            removeWrapperRefsForEvent(this, type);
        }

        return _removeAllListeners.apply(this, arguments);
    });

    originals.EventEmitter.prototype.listeners = EventEmitter.prototype.listeners;
    patchPrototype(EventEmitter.prototype, 'listeners', function (type) {
        let listeners = _listeners.call(this, type);
        let unwrapped = [];

        for (let listener of listeners) {
            if (listener[WrappedListenerSymbol])
                unwrapped.push(listener[WrappedListenerSymbol]);
            else
                unwrapped.push(listener);
        }

        return unwrapped;
    });
}

function unpatch() {
    if (!patched) return;

    global.setInterval = originals.setInterval;
    global.setImmediate = originals.setImmediate;
    global.setTimeout = originals.setTimeout;
    global.process.nextTick = originals.process.nextTick;

    const { EventEmitter } = require('events');

    unpatchPrototype(Promise.prototype, 'then', originals.Promise.prototype.then, true);
    unpatchPrototype(Promise.prototype, 'catch', originals.Promise.prototype.catch, true);
    unpatchPrototype(Promise.prototype, 'finally', originals.Promise.prototype.finally, true);
    unpatchPrototype(EventEmitter.prototype, 'addListener', originals.EventEmitter.prototype.addListener);
    unpatchPrototype(EventEmitter.prototype, 'prependListener', originals.EventEmitter.prototype.prependListener);
    unpatchPrototype(EventEmitter.prototype, 'on', originals.EventEmitter.prototype.on);
    unpatchPrototype(EventEmitter.prototype, 'once', originals.EventEmitter.prototype.once);
    unpatchPrototype(EventEmitter.prototype, 'prependOnceListener',
        originals.EventEmitter.prototype.prependOnceListener);
    unpatchPrototype(EventEmitter.prototype, 'removeListener', originals.EventEmitter.prototype.removeListener);
    unpatchPrototype(EventEmitter.prototype, 'removeAllListeners', originals.EventEmitter.prototype.removeAllListeners);
    unpatchPrototype(EventEmitter.prototype, 'listeners', originals.EventEmitter.prototype.listeners);
}

module.exports.patch = patch;
module.exports.unpatch = unpatch;
module.exports.originals = originals;