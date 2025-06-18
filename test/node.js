import test from 'node:test';
import choo from '../index.js';

test('should expose a public API', t => {
  const app = choo();

  t.assert.equal(typeof app.route, 'function', 'app.route prototype method exists');
  t.assert.equal(typeof app.toString, 'function', 'app.toString prototype method exists');
  t.assert.equal(typeof app.start, 'function', 'app.start prototype method exists');
  t.assert.equal(typeof app.mount, 'function', 'app.mount prototype method exists');
  t.assert.equal(typeof app.emitter, 'object', 'app.emitter prototype method exists');

  t.assert.equal(typeof app.emit, 'function', 'app.emit instance method exists');
  t.assert.equal(typeof app.router, 'object', 'app.router instance object exists');
  t.assert.equal(typeof app.state, 'object', 'app.state instance object exists');
});

test('should enable history and hash by defaut', t => {
  const app = choo();
  t.assert.ok(app._historyEnabled, 'history enabled');
  t.assert.ok(app._hrefEnabled, 'href enabled');
});

test('router should pass state and emit to view', t => {
  t.plan(2);
  const app = choo();
  app.route('/', (state, emit) => {
    t.assert.equal(typeof state, 'object', 'state is an object');
    t.assert.equal(typeof emit, 'function', 'emit is a function');
    return '<div></div>';
  });
  app.toString('/');
});

test('router should support a default route', t => {
  t.plan(1);
  const app = choo();
  app.route('*', (_state, _emit) => {
    t.assert.ok(true);
    return '<div></div>';
  });
  app.toString('/random');
});

test('enabling hash routing should treat hashes as slashes', t => {
  t.plan(1);
  const app = choo({ hash: true });
  app.route('/account/security', (_state, _emit) => {
    t.assert.ok(true);
    return '<div></div>';
  });
  app.toString('/account#security');
});

test('router should ignore hashes by default', t => {
  t.plan(1);
  const app = choo();
  app.route('/account', (_state, _emit) => {
    t.assert.ok(true);
    return '<div></div>';
  });
  app.toString('/account#security');
});

// built-in state

test('state should include events', t => {
  t.plan(2);
  const app = choo();
  app.route('/', (state, _emit) => {
    t.assert.ok(Object.hasOwn(state, 'events'), 'state has event property');
    t.assert.ok(Object.keys(state.events).length > 0, 'events object has keys');
    return '<div></div>';
  });
  app.toString('/');
});

test('state should include location on render', t => {
  t.plan(6);
  const app = choo();
  app.route('/:first/:second/*', (state, _emit) => {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' };
    t.assert.equal(state.href, '/foo/bar/file.txt', 'state has href');
    t.assert.equal(state.route, ':first/:second/*', 'state has route');
    t.assert.ok(Object.hasOwn(state, 'params'), 'state has params');
    t.assert.deepEqual(state.params, params, 'params match');
    t.assert.ok(Object.hasOwn(state, 'query'), 'state has query');
    t.assert.deepEqual(state.query, { bin: 'baz' }, 'query match');
    return '<div></div>';
  });
  app.toString('/foo/bar/file.txt?bin=baz');
});

test('state should include location on store init', t => {
  t.plan(6);
  const app = choo();
  app.use(store);
  app.route('/:first/:second/*', (_state, _emit) => '<div></div>');
  app.toString('/foo/bar/file.txt?bin=baz');

  function store(state, _emit) {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' };
    t.assert.equal(state.href, '/foo/bar/file.txt', 'state has href');
    t.assert.equal(state.route, ':first/:second/*', 'state has route');
    t.assert.ok(Object.hasOwn(state, 'params'), 'state has params');
    t.assert.deepEqual(state.params, params, 'params match');
    t.assert.ok(Object.hasOwn(state, 'query'), 'state has query');
    t.assert.deepEqual(state.query, { bin: 'baz' }, 'query match');
  }
});

test('state should not mutate on toString', t => {
  t.plan(6);

  const app = choo();
  app.use(store);

  const routes = ['foo', 'bar'];
  const states = routes.map(route => {
    const state = {};
    app.route(`/${route}`, view);
    app.toString(`/${route}`, state);
    return state;
  });

  for (let i = 0, len = routes.length; i < len; i++) {
    t.assert.equal(states[i].test, routes[i], 'store was used');
    t.assert.equal(states[i].title, routes[i], 'title was added to state');
  }

  function store(state, emitter) {
    state.test = null;
    emitter.on('test', str => {
      t.assert.equal(state.test, null, 'state has been reset');
      state.test = str;
    });
  }

  function view(state, emit) {
    emit('test', state.route);
    emit(state.events.DOMTITLECHANGE, state.route);
    return `<body>Hello ${state.route}</body>`;
  }
});
