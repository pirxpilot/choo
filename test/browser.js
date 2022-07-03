const be = require('browser-env')
be(
  [
    'window',
    'document'
  ], {
    url: 'http://example.com',
    pretendToBeVisual: true
  }
)

const tape = require('tape')

const choo = require('..')

/* eslint-disable no-prototype-builtins */

globalThis.DEBUG = true

tape('should mount in the DOM', function (t) {
  t.plan(1)
  const app = choo()
  const container = init('/', 'p')
  app.route('/', function () {
    const strong = '<strong>Hello filthy planet</strong>'
    window.requestAnimationFrame(function () {
      const exp = '<p><strong>Hello filthy planet</strong></p>'
      t.equal(container.outerHTML, exp, 'result was OK')
    })
    const p = document.createElement('p')
    p.innerHTML = strong
    return p
  })
  app.mount(container)
})

tape('should expose a public API', function (t) {
  const app = choo()

  t.equal(typeof app.route, 'function', 'app.route prototype method exists')
  t.equal(typeof app.toString, 'function', 'app.toString prototype method exists')
  t.equal(typeof app.start, 'function', 'app.start prototype method exists')
  t.equal(typeof app.mount, 'function', 'app.mount prototype method exists')
  t.equal(typeof app.emitter, 'object', 'app.emitter prototype method exists')

  t.equal(typeof app.emit, 'function', 'app.emit instance method exists')
  t.equal(typeof app.router, 'object', 'app.router instance object exists')
  t.equal(typeof app.state, 'object', 'app.state instance object exists')

  t.end()
})

tape('should enable history and href by defaut', function (t) {
  const app = choo()
  t.true(app._historyEnabled, 'history enabled')
  t.true(app._hrefEnabled, 'href enabled')
  t.end()
})

tape('router should pass state and emit to view', function (t) {
  t.plan(2)
  const app = choo()
  const container = init()
  app.route('/', function (state, emit) {
    t.equal(typeof state, 'object', 'state is an object')
    t.equal(typeof emit, 'function', 'emit is a function')
    return document.createElement('div')
  })
  app.mount(container)
})

tape('router should support a default route', function (t) {
  t.plan(1)
  const app = choo()
  const container = init('/random')
  app.route('*', function () {
    t.pass()
    return document.createElement('div')
  })
  app.mount(container)
})

tape('enabling hash routing should treat hashes as slashes', function (t) {
  t.plan(1)
  const app = choo({ hash: true })
  const container = init('/account#security')
  app.route('/account/security', function () {
    t.pass()
    return document.createElement('div')
  })
  app.mount(container)
})

tape('router should ignore hashes by default', function (t) {
  t.plan(1)
  const app = choo()
  const container = init('/account#security')
  app.route('/account', function () {
    t.pass()
    return document.createElement('div')
  })
  app.mount(container)
})

// built-in state

tape('state should include events', function (t) {
  t.plan(2)
  const app = choo()
  const container = init()
  app.route('/', function (state) {
    t.ok(state.hasOwnProperty('events'), 'state has event property')
    t.ok(Object.keys(state.events).length > 0, 'events object has keys')
    return document.createElement('div')
  })
  app.mount(container)
})

tape('state should include location on render', function (t) {
  t.plan(6)
  const app = choo()
  const container = init('/foo/bar/file.txt?bin=baz')
  app.route('/:first/:second/*', function (state) {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' }
    t.equal(state.href, '/foo/bar/file.txt', 'state has href')
    t.equal(state.route, ':first/:second/*', 'state has route')
    t.ok(state.hasOwnProperty('params'), 'state has params')
    t.deepEqual(state.params, params, 'params match')
    t.ok(state.hasOwnProperty('query'), 'state has query')
    t.deepEqual(state.query, { bin: 'baz' }, 'query match')
    return document.createElement('div')
  })
  app.mount(container)
})

tape('state should include location on store init', function (t) {
  t.plan(6)
  const app = choo()
  const container = init('/foo/bar/file.txt?bin=baz')
  app.use(store)
  app.route('/:first/:second/*', function () {
    return document.createElement('div')
  })
  app.mount(container)

  function store (state, emit) {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' }
    t.equal(state.href, '/foo/bar/file.txt', 'state has href')
    t.equal(state.route, ':first/:second/*', 'state has route')
    t.ok(state.hasOwnProperty('params'), 'state has params')
    t.deepEqual(state.params, params, 'params match')
    t.ok(state.hasOwnProperty('query'), 'state has query')
    t.deepEqual(state.query, { bin: 'baz' }, 'query match')
  }
})

tape('state should include title', function (t) {
  t.plan(3)
  document.title = 'foo'
  const app = choo()
  const container = init()
  t.equal(app.state.title, 'foo', 'title is match')
  app.use(function (state, emitter) {
    emitter.on(state.events.DOMTITLECHANGE, function () {
      t.equal(state.title, 'bar', 'title is changed in state')
      t.equal(document.title, 'bar', 'title is changed in document')
    })
  })
  app.route('/', function (state, emit) {
    emit(state.events.DOMTITLECHANGE, 'bar')
    return document.createElement('div')
  })
  app.mount(container)
})

// create application container and set location
// (str?, str?) -> Element
function init (location = '/', type = 'div') {
  window.history.replaceState({}, document.title, location)
  const container = document.createElement(type)
  document.body.appendChild(container)
  return container
}
