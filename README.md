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
* There was an experimental (`src/zone.node12.js`) version for node 12.x, which counts on the latest V8 upgrades to properly
  keep stack traces through `await` calls.  
  That version proved to be *very* slow due to forcing V8 to generate stack traces which has its cost.
* I actually took some of the tests from the angular repo, as they already have solid tests (mainly for `EventEmitter`).

## Installation:

```
npm i zone-polyfill
```
 
