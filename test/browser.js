const be = require('browser-env');
be(['window', 'document'], {
  url: 'http://example.com',
  pretendToBeVisual: true
});

const test = require('node:test');

const choo = require('..');

globalThis.DEBUG = true;

test('should mount in the DOM', (t, done) => {
  t.plan(1);
  const app = choo();
  const container = init('/', 'p');
  app.route('/', () => {
    const strong = '<strong>Hello filthy planet</strong>';
    window.requestAnimationFrame(() => {
      const exp = '<p><strong>Hello filthy planet</strong></p>';
      t.assert.equal(container.outerHTML, exp, 'result was OK');
      done();
    });
    const p = document.createElement('p');
    p.innerHTML = strong;
    return p;
  });
  app.mount(container);
});

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

test('should enable history and href by defaut', t => {
  const app = choo();
  t.assert.ok(app._historyEnabled, 'history enabled');
  t.assert.ok(app._hrefEnabled, 'href enabled');
});

test('router should pass state and emit to view', (t, done) => {
  t.plan(2);
  const app = choo();
  const container = init();
  app.route('/', (state, emit) => {
    t.assert.equal(typeof state, 'object', 'state is an object');
    t.assert.equal(typeof emit, 'function', 'emit is a function');
    done();
    return document.createElement('div');
  });
  app.mount(container);
});

test('router should support a default route', (t, done) => {
  t.plan(1);
  const app = choo();
  const container = init('/random');
  app.route('*', () => {
    t.assert.ok(true);
    done();
    return document.createElement('div');
  });
  app.mount(container);
});

test('enabling hash routing should treat hashes as slashes', (t, done) => {
  t.plan(1);
  const app = choo({ hash: true });
  const container = init('/account#security');
  app.route('/account/security', () => {
    t.assert.ok(true);
    done();
    return document.createElement('div');
  });
  app.mount(container);
});

test('router should ignore hashes by default', (t, done) => {
  t.plan(1);
  const app = choo();
  const container = init('/account#security');
  app.route('/account', () => {
    t.assert.ok(true);
    done();
    return document.createElement('div');
  });
  app.mount(container);
});

// built-in state

test('state should include events', (t, done) => {
  t.plan(2);
  const app = choo();
  const container = init();
  app.route('/', state => {
    t.assert.ok(Object.hasOwn(state, 'events'), 'state has event property');
    t.assert.ok(Object.keys(state.events).length > 0, 'events object has keys');
    done();
    return document.createElement('div');
  });
  app.mount(container);
});

test('state should include location on render', (t, done) => {
  t.plan(6);
  const app = choo();
  const container = init('/foo/bar/file.txt?bin=baz');
  app.route('/:first/:second/*', state => {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' };
    t.assert.equal(state.href, '/foo/bar/file.txt', 'state has href');
    t.assert.equal(state.route, ':first/:second/*', 'state has route');
    t.assert.ok(Object.hasOwn(state, 'params'), 'state has params');
    t.assert.deepEqual(state.params, params, 'params match');
    t.assert.ok(Object.hasOwn(state, 'query'), 'state has query');
    t.assert.deepEqual(state.query, { bin: 'baz' }, 'query match');
    done();
    return document.createElement('div');
  });
  app.mount(container);
});

test('state should include location on store init', (t, done) => {
  t.plan(6);
  const app = choo();
  const container = init('/foo/bar/file.txt?bin=baz');
  app.use(store);
  app.route('/:first/:second/*', () => document.createElement('div'));
  app.mount(container);

  function store(state, _emit) {
    const params = { first: 'foo', second: 'bar', wildcard: 'file.txt' };
    t.assert.equal(state.href, '/foo/bar/file.txt', 'state has href');
    t.assert.equal(state.route, ':first/:second/*', 'state has route');
    t.assert.ok(Object.hasOwn(state, 'params'), 'state has params');
    t.assert.deepEqual(state.params, params, 'params match');
    t.assert.ok(Object.hasOwn(state, 'query'), 'state has query');
    t.assert.deepEqual(state.query, { bin: 'baz' }, 'query match');
    done();
  }
});

test('state should include title', (t, done) => {
  t.plan(3);
  document.title = 'foo';
  const app = choo();
  const container = init();
  t.assert.equal(app.state.title, 'foo', 'title is match');
  app.use((state, emitter) => {
    emitter.on(state.events.DOMTITLECHANGE, () => {
      t.assert.equal(state.title, 'bar', 'title is changed in state');
      t.assert.equal(document.title, 'bar', 'title is changed in document');
      done();
    });
  });
  app.route('/', (state, emit) => {
    emit(state.events.DOMTITLECHANGE, 'bar');
    return document.createElement('div');
  });
  app.mount(container);
});

// create application container and set location
// (str?, str?) -> Element
function init(location = '/', type = 'div') {
  window.history.replaceState({}, document.title, location);
  const container = document.createElement(type);
  document.body.appendChild(container);
  return container;
}
