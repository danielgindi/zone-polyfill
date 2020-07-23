const Zone = require('../');

const Benchmark = require('benchmark-util');

(async () => {
    let bench = new Benchmark();

    bench
        .add(`Test performance of Zoned code (new Zones created)`, {
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
                Zone.disable();
            },
        })
        .add(`Test performance of Zoned code (awaits within single context)`, {
            prepare: () => {
                require('../patches').patch();
                Zone.current.fork('my_zone');
            },
            unit: async () => {
                await new Promise(resolve => {
                    Zone.current.run(() => {
                        /test/.test('test');
                    });
                    resolve();
                });
            },
            teardown: () => {
                require('../patches').unpatch();
                Zone.disable();
            },
        })
        .add(`Test performance of Zone-less code`, async () => {
            return new Promise(resolve => {
                (() => {
                    /test/.test('test');
                })();
                resolve();
            });
        })
        .add(`Test performance of Zone-less code (awaits within single context)`, async () => {
            await new Promise(resolve => {
                /test/.test('test');
                resolve();
            });
        });

    let results = await bench.run({
        onCycle: ({ name, totals }) => {
            console.log(`${name} x ${Math.round(totals.avg)} ops/sec ± ${Math.round(
                (totals.stdDev / totals.avg) * 10000) / 100}% (${totals.runs} runs sampled)`);
        },
    });

    let fastest = results.slice(0).sort(
        (a, b) => a.totals.avg > b.totals.avg ? -1 : a.totals.avg < b.totals.avg ? 1 : 0)[0].name;

    console.log(`Fastest is: ${fastest}`);
})();