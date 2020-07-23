const IdSymbol = Symbol('[[Id]]');
const ParentSymbol = Symbol('[[ParentZone]]');
const WrappedSymbol = Symbol('[[Wrapped]]');
const RootZone = Symbol('[[RootZone]]');
const UsesAsyncLocalStorage = Symbol('[[UsesAsyncLocalStorage]]');

module.exports = {
    IdSymbol: IdSymbol,
    ParentSymbol: ParentSymbol,
    WrappedSymbol: WrappedSymbol,
    RootZone: RootZone,
    UsesAsyncLocalStorage: UsesAsyncLocalStorage,
};