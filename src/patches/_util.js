
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

module.exports.patchPrototype = patchPrototype;
module.exports.unpatchPrototype = unpatchPrototype;
