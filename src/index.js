const Zone = require('./zone');

// Apply patches
require('./patches').patch();

/** @type {typeof Zone} */
module.exports = Zone;