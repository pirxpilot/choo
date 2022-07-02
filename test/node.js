const tape = require('tape')

const choo = require('..')

/* eslint-disable no-prototype-builtins */

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

tape('should enable history and hash by defaut', function (t) {
  const app = choo()
  t.true(app._historyEnabled, 'history enabled')
  t.true(app._hrefEnabled, 'href enabled')
  t.end()
})

tape('router should pass state and emit to view', function (t) {
  t.plan(2)
  const app = choo()
  app.route('/', function (state, emit) {
    t.equal(typeof state, 'object', 'state is an object')
    t.equal(typeof emit, 'function', 'emit is a function')
    return '<div></div>'
  })
  app.toString('/')
  t.end()
})

tape('router should support a default route', function (t) {
  t.plan(1)
  const app = choo()
  app.route('*', function (state, emit) {
    t.pass()
    return '<div></div>'
  })
  app.toString('/random')
  t.end()
})

tape('enabling hash routing should treat hashes as slashes', function (t) {
  t.plan(1)
  const app = choo({ hash: true })
  app.route('/account/security', function (state, emit) {
    t.pass()
    return '<div></div>'
  })
  app.toString('/account#security')
  t.end()
})

tape('router should ignore hashes by default', function (t) {
  t.plan(1)
  const app = choo()
  app.route('/account', function (state, emit) {
    t.pass()
    return '<div></div>'
  })
  app.toString('/account#security')
  t.end()
})

// built-in state

tape('state should include events', function (t) {
  t.plan(2)
  const app = choo()
  app.route('/', function (state, emit) {
    t.ok(state.hasOwnProperty('events'), 'state has event property')
    t.ok(Object.keys(state.events).length > 0, 'events object has keys')
    return '<div></div>'
  })
  app.toString('/')
  t.end()
})

tape('state should include location on render', function (t) {
  t.plan(6)
  const app = choo()
  app.route('/:first/:second/*', function (state, emit) {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' }
    t.equal(state.href, '/foo/bar/file.txt', 'state has href')
    t.equal(state.route, ':first/:second/*', 'state has route')
    t.ok(state.hasOwnProperty('params'), 'state has params')
    t.deepEqual(state.params, params, 'params match')
    t.ok(state.hasOwnProperty('query'), 'state has query')
    t.deepLooseEqual(state.query, { bin: 'baz' }, 'query match')
    return '<div></div>'
  })
  app.toString('/foo/bar/file.txt?bin=baz')
  t.end()
})

tape('state should include location on store init', function (t) {
  t.plan(6)
  const app = choo()
  app.use(store)
  app.route('/:first/:second/*', function (state, emit) {
    return '<div></div>'
  })
  app.toString('/foo/bar/file.txt?bin=baz')

  function store (state, emit) {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' }
    t.equal(state.href, '/foo/bar/file.txt', 'state has href')
    t.equal(state.route, ':first/:second/*', 'state has route')
    t.ok(state.hasOwnProperty('params'), 'state has params')
    t.deepEqual(state.params, params, 'params match')
    t.ok(state.hasOwnProperty('query'), 'state has query')
    t.deepLooseEqual(state.query, { bin: 'baz' }, 'query match')
  }
})

tape('state should not mutate on toString', function (t) {
  t.plan(6)

  const app = choo()
  app.use(store)

  const routes = ['foo', 'bar']
  const states = routes.map(function (route) {
    const state = {}
    app.route(`/${route}`, view)
    app.toString(`/${route}`, state)
    return state
  })

  for (let i = 0, len = routes.length; i < len; i++) {
    t.equal(states[i].test, routes[i], 'store was used')
    t.equal(states[i].title, routes[i], 'title was added to state')
  }

  function store (state, emitter) {
    state.test = null
    emitter.on('test', function (str) {
      t.equal(state.test, null, 'state has been reset')
      state.test = str
    })
  }

  function view (state, emit) {
    emit('test', state.route)
    emit(state.events.DOMTITLECHANGE, state.route)
    return `<body>Hello ${state.route}</body>`
  }
})
