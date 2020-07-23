let nodeVersion = parseFloat(process.version.substr(1));

if (nodeVersion >= 12.17) {
    module.exports = require('./zone-async');
} else {
    module.exports = require('./zone-fallback');
}