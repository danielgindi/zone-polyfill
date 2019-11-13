/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// This is a copy of angular/zone.js tests, with slight modifications to use Chai and no TS

const Zone = require('../');
require('./patches').patch();

const { EventEmitter } = require('events');

const chai = require('chai');
const expect = chai.expect;

describe('nodejs EventEmitter', () => {
    /** @type Zone */let zone;
    /** @type Zone */let zoneA;
    /** @type Zone */let zoneB;
    /** @type EventEmitter */let emitter;
    /** @type number */let expectZoneACount;
    /** @type string[] */let zoneResults;

    beforeEach(() => {
        zone = Zone.current;
        zoneA = zone.fork({ name: 'A' });
        zoneB = zone.fork({ name: 'B' });

        emitter = new EventEmitter();
        expectZoneACount = 0;

        zoneResults = [];
    });

    function expectZoneA(/**string*/value) {
        expectZoneACount++;
        expect(Zone.current.name).to.equal('A');
        expect(value).to.equal('test value');
    }

    function listenerA() {
        zoneResults.push('A');
    }

    function listenerB() {
        zoneResults.push('B');
    }

    function shouldNotRun() {
        throw new Error('this listener should not run');
    }

    it('should register listeners in the current zone', () => {
        zoneA.run(() => {
            emitter.on('test', expectZoneA);
            emitter.addListener('test', expectZoneA);
        });
        zoneB.run(() => emitter.emit('test', 'test value'));
        expect(expectZoneACount).to.equal(2);
    });

    it('allows chaining methods', () => {
        zoneA.run(() => {
            expect(emitter.on('test', expectZoneA)).to.equal(emitter);
            expect(emitter.addListener('test', expectZoneA)).to.equal(emitter);
        });
    });

    it('should remove listeners properly', () => {
        zoneA.run(() => {
            emitter.on('test', shouldNotRun);
            emitter.on('test2', shouldNotRun);
            emitter.removeListener('test', shouldNotRun);
        });
        zoneB.run(() => {
            emitter.removeListener('test2', shouldNotRun);
            emitter.emit('test', 'test value');
            emitter.emit('test2', 'test value');
        });
    });

    it('remove listener should return event emitter', () => {
        zoneA.run(() => {
            emitter.on('test', shouldNotRun);
            expect(emitter.removeListener('test', shouldNotRun)).to.equal(emitter);
            emitter.emit('test', 'test value');
        });
    });

    it('should return all listeners for an event', () => {
        zoneA.run(() => {
            emitter.on('test', expectZoneA);
        });
        zoneB.run(() => {
            emitter.on('test', shouldNotRun);
        });
        expect(emitter.listeners('test')).to.deep.equal([expectZoneA, shouldNotRun]);
    });

    it('should return empty array when an event has no listeners', () => {
        zoneA.run(() => {
            expect(emitter.listeners('test')).to.deep.equal([]);
        });
    });

    it('should prepend listener by order', () => {
        zoneA.run(() => {
            emitter.on('test', listenerA);
            emitter.on('test', listenerB);
            expect(emitter.listeners('test')).to.deep.equal([listenerA, listenerB]);
            emitter.emit('test');
            expect(zoneResults).to.deep.equal(['A', 'B']);
            zoneResults = [];

            emitter.removeAllListeners('test');

            emitter.on('test', listenerA);
            emitter.prependListener('test', listenerB);
            expect(emitter.listeners('test')).to.deep.equal([listenerB, listenerA]);
            emitter.emit('test');
            expect(zoneResults).to.deep.equal(['B', 'A']);
        });
    });

    it('should remove All listeners properly', () => {
        zoneA.run(() => {
            emitter.on('test', expectZoneA);
            emitter.on('test', expectZoneA);
            emitter.removeAllListeners('test');
            expect(emitter.listeners('test').length).to.equal(0);
        });
    });

    it('remove All listeners should return event emitter', () => {
        zoneA.run(() => {
            emitter.on('test', expectZoneA);
            emitter.on('test', expectZoneA);
            expect(emitter.removeAllListeners('test')).to.equal(emitter);
            expect(emitter.listeners('test').length).to.equal(0);
        });
    });

    it('should remove All listeners properly even without a type parameter', () => {
        zoneA.run(() => {
            emitter.on('test', shouldNotRun);
            emitter.on('test1', shouldNotRun);
            emitter.removeAllListeners();
            expect(emitter.listeners('test').length).to.equal(0);
            expect(emitter.listeners('test1').length).to.equal(0);
        });
    });

    it('should remove once listener after emit', () => {
        zoneA.run(() => {
            emitter.once('test', expectZoneA);
            emitter.emit('test', 'test value');
            expect(emitter.listeners('test').length).to.equal(0);
        });
    });

    it('should remove once listener properly before listener triggered', () => {
        zoneA.run(() => {
            emitter.once('test', shouldNotRun);
            emitter.removeListener('test', shouldNotRun);
            emitter.emit('test');
        });
    });

    it('should trigger removeListener when remove listener', () => {
        zoneA.run(() => {
            emitter.on('removeListener', function (/**string*/type, _handler) {
                zoneResults.push('remove' + type);
            });
            emitter.on('newListener', function (/**string*/type, _handler) {
                zoneResults.push('new' + type);
            });
            emitter.on('test', shouldNotRun);
            emitter.removeListener('test', shouldNotRun);
            expect(zoneResults).to.deep.equal(['newtest', 'removetest']);
        });
    });

    it('should trigger removeListener when remove all listeners with eventname ', () => {
        zoneA.run(() => {
            emitter.on('removeListener', function (/**string*/type, _handler) {
                zoneResults.push('remove' + type);
            });
            emitter.on('test', shouldNotRun);
            emitter.on('test1', expectZoneA);
            emitter.removeAllListeners('test');
            expect(zoneResults).to.deep.equal(['removetest']);
            expect(emitter.listeners('removeListener').length).to.equal(1);
        });
    });

    it('should trigger removeListener when remove all listeners without eventname', () => {
        zoneA.run(() => {
            emitter.on('removeListener', function (/**string*/type, _handler) {
                zoneResults.push('remove' + type);
            });
            emitter.on('test', shouldNotRun);
            emitter.on('test1', shouldNotRun);
            emitter.removeAllListeners();
            expect(zoneResults).to.deep.equal(['removetest', 'removetest1']);
            expect(emitter.listeners('test').length).to.equal(0);
            expect(emitter.listeners('test1').length).to.equal(0);
            expect(emitter.listeners('removeListener').length).to.equal(0);
        });
    });

    it('should not enter endless loop when register uncaughtException to process', () => {
        require('domain');
        zoneA.run(() => {
            process.on('uncaughtException', function () {});
        });
    });

    it('should be able to addEventListener with symbol eventName', () => {
        zoneA.run(() => {
            const testSymbol = Symbol('test');
            const test1Symbol = Symbol('test1');
            emitter.on(testSymbol, expectZoneA);
            emitter.on(test1Symbol, shouldNotRun);
            emitter.removeListener(test1Symbol, shouldNotRun);
            expect(emitter.listeners(testSymbol).length).to.equal(1);
            expect(emitter.listeners(test1Symbol).length).to.equal(0);
            emitter.emit(testSymbol, 'test value');
        });
    });
});