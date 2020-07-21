const Zone = require('../');

const Benchmark = require('benchmark-util');

(async () => {
    let bench = new Benchmark();

    bench
        .add(`Test performance of Zoned code`, {
            prepare: () => {
                require('../patches').patch();
            },
            unit: async () => {
                Zone.current.fork('my_zone');

                return new Promise(resolve => {
                    Zone.current.run(() => {
                        /test/.test('test');
                    });
                    resolve();
                });
            },
            teardown: () => {
                require('../patches').unpatch();
            },
        })
        .add(`Test performance of Zone-less code`, async () => {
            return new Promise(resolve => {
                (() => {
                    /test/.test('test');
                })();
                resolve();
            });
        });

    let results = await bench.run({
        onCycle: ({ name, totals }) => {
            console.log(`${name} x ${Math.round(totals.avg)} ops/sec ± ${Math.round(
                (totals.stdDev / totals.avg) * 10000) / 100}% (${totals.runs} runs sampled)`);
        },
    });

    let slownessFactor = 1 - (results[0].totals.avg / results[1].totals.avg);

    let fastest = results.sort(
        (a, b) => a.totals.avg > b.totals.avg ? -1 : a.totals.avg < b.totals.avg ? 1 : 0)[0].name;

    console.log(`Fastest is: ${fastest}`);

    console.log(`Zoned code is slower than Zone-less code by ${(slownessFactor * 100).toFixed(2)}%`);
})();