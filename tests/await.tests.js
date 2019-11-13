const Zone = require('./');
require('./patches').patch();

const chai = require('chai');
const expect = chai.expect;

const waitAsync = (ms) => new Promise(r => setTimeout(r, ms));

async function expectZoneNameAsync(name, result) {
    expect(Zone.current.name).to.equal(name);
    return result;
}

describe('async/await', () => {

    it('should not loose zone context in await calls #1', async () => {
        let zone = Zone.current;
        let zoneA = zone.fork({ name: 'A' });
        let zoneB = zone.fork({ name: 'B' });

        return Promise.all([
            zoneA.run(async () => {

                expect(Zone.current.name).to.equal('A');
                await waitAsync(200);
                expect(Zone.current.name).to.equal('A');

            }),
            zoneB.run(async () => {

                expect(Zone.current.name).to.equal('B');
                await waitAsync(100);
                expect(Zone.current.name).to.equal('B');

            }),
        ]);
    });

    it('should not loose zone context in await calls #2', async () => {

        async function testAsyncZone1() {
            expect(Zone.current.name).to.equal('A');
            const expectedResult = Math.random();
            const result = await expectZoneNameAsync(Zone.current.name, Math.random());
            expect(Zone.current.name).to.equal('A');
            expect(result).to.equal(expectedResult);
        }

        Zone.current.fork({ name: 'A' }).run(testAsyncZone1);
        expect(Zone.current.name).to.equal('(root zone)');

        Zone.current.fork({ name: 'B' }).run(() => {
            expect(Zone.current.name).to.equal('B');
        });

        Zone.current.fork({ name: 'C' }).run(async () => {
            expect(Zone.current.name).to.equal('C');
            await expectZoneNameAsync('C');
        });

    });

});