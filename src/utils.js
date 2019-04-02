module.exports.zoneIdRegex = /^\s*at \$Zone\$:(\d+)\b/m;

module.exports.generateMarkerFunction = (id) => {
    let fn = function (f, t, a) {
        return f.apply(t, a);
    };
    Object.defineProperty(fn, 'name', { value: '$Zone$:' + id });
    return fn;
};