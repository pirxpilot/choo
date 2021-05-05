const assert = require('assert')
const LRU = require('nanolru')

module.exports = chooComponentCache

function chooComponentCache (state, emit, lru = 100) {
  assert.equal(typeof state, 'object', 'ChooComponentCache: state should be type object')
  assert.equal(typeof emit, 'function', 'ChooComponentCache: emit should be type function')

  const cache = typeof lru === 'number' ? new LRU(lru) : lru

  return {
    render
  }

  // Get & create component instances.
  function render (Component, id, ...args) {
    assert.equal(typeof Component, 'function', 'ChooComponentCache.render: Component should be type function')
    assert.ok(typeof id === 'string' || typeof id === 'number', 'ChooComponentCache.render: id should be type string or type number')

    let el = cache.get(id)
    if (!el) {
      el = new Component(id, state, emit, ...args)
      cache.set(id, el)
    }

    return el
  }
}
