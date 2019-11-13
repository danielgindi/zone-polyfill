# zone-polyfill

[![npm Version](https://badge.fury.io/js/zone-polyfill.png)](https://npmjs.org/package/zone-polyfill)

This is an attempt to create a `Zone` polyfill for the TC39 proposal at [https://github.com/domenic/zones](https://github.com/domenic/zones).

I'm aware that there is an `angular/zone.js` implementation, but:
1. I found it to *not* be compliant to the spec
2. It tries to patch too much.  
   This repo patches only basic node Apis: `Promise`, `EventEmitter` (maybe more in the future).
   As the spec says, other libraries should support Zone by themselves, or be passed a `zone.wrap(...)`
3. At the time of writing this, `angular/zone.js` does not support `async/await`. It looses context.
4. Here I only try to support `Node.js`, although if there will be a need, it could be adjusted for other platforms as well.

Notes:
---
* There was an experimental (`src/zone.node12.js`) version for node 12.x, which counts on the latest V8 upgrades to properly
  keep stack traces through `await` calls.  
  That version proved to be *very* slow due to forcing V8 to generate stack traces which has its cost.
* I actually took some of the tests from the angular repo, as they already have solid tests (mainly for `EventEmitter`).

Benchmarks of `zone.js` vs `zone-polyfill` (2019-11-12, Intel i7-6770HQ @ 2.60GHz):
---
- `zone.js` - Zone-less code - `1062717 ops/sec`
- `zone.js` - Zoned code - `892525 ops/sec` - **slower by 19.07% than Zone-less code**
- `zone-polyfill` - Zoned code - `2472462 ops/sec`
- `zone-polyfill` - Zone-less code - `3084971 ops/sec` - **slower by 24.77% than Zone-less code**
- No require of any Zone library - `3470300 ops/sec`
- `zone-polyfill` vs `zone-js` - Zoned code - `zone-polyfill` **faster by 277%**
- `zone-polyfill` vs `zone-js` - Zone-less code - `zone-polyfill` **faster by 190%**
- Penalty of requiring `zone-polyfill`, without any usage, vs clean code - **12%**
- Zone-less mean that the Zone library is required, but `fork`/`run` not called in the benchmark unit.
- Zone mean that the Zone library is required, and `fork`/`run` are called in the benchmark unit. 

These benchmarks are testing a very simple case of usage vs non-usage of Zone methods, to measure basic penalty to code performance.  
There could be made more complex benchmarks, for longer scenarios, but these are enough for me to know not to use `zone.js`.  

## Installation:

```
npm i zone-polyfill

// With default patches:
const Zone = require('zone-polyfill');

// No patched by default:
const Zone = require('zone-polyfill/unpatched');
```
 
By default `zone-polyfill` patches:
* `EventEmitter`
* `Promise`
* `setInterval`
* `setTimeout`
* `setImmediate`
* `process.nextTick`

This covers most cases, as many callbacks in various libraries are triggered from events etc.  
This will not cover more complicated cases like a library that has one long-running background connection and many library endpoints that listen to it, as the events were not bound in the context of the current Zone.  
In this case - `Zone.current.wrap`/`Zone.current.run` usage is required, or a manual patch.

An example of a manual patch:  
```js
function patchCallbackArg(proto, name) {
    const original = proto[name];
    proto[name] = function (...args) {
        let cb = args[args.length - 1];
        if (typeof cb === 'function') {
            args[args.length - 1] = Zone.current.wrap(cb);
        }
        return original.apply(this, args);
    };
}

patchCallbackArg(Mongodb.Collection.prototype, 'find');
```
