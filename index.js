const scrollToAnchor = require('scroll-to-anchor')
const documentReady = require('document-ready')
const nanotiming = require('@pirxpilot/nanotiming')
const nanorouter = require('nanorouter')
const nanomorph = require('@pirxpilot/nanomorph')
const nanohref = require('@pirxpilot/nanohref')
const nanoraf = require('@pirxpilot/nanoraf')
const nanobus = require('nanobus')
const assert = require('assert')

module.exports = choo

const HISTORY_OBJECT = {}

// define events used by choo
const EVENTS = {
  DOMCONTENTLOADED: 'DOMContentLoaded',
  DOMTITLECHANGE: 'DOMTitleChange',
  REPLACESTATE: 'replaceState',
  PUSHSTATE: 'pushState',
  NAVIGATE: 'navigate',
  POPSTATE: 'popState',
  RENDER: 'render'
}

const hasWindow = typeof window !== 'undefined'

function choo (opts = {}) {
  const timing = nanotiming('choo.constructor')

  assert(typeof opts === 'object', 'choo: opts should be type object')

  const {
    history: historyEnabled = true,
    href: hrefEnabled = true,
    hash: hashEnabled = false
  } = opts

  let loaded = false
  const stores = [ondomtitlechange]
  let tree = null

  // state
  let state = {
    events: EVENTS,
    components: {}
  }

  let handler

  if (hasWindow && window.initialState) {
    state = { ...window.initialState, ...state }
    delete window.initialState
  }

  // properties that are part of the API
  const router = nanorouter({ curry: true })
  const emitter = nanobus('choo.emit')
  const emit = emitter.emit.bind(emitter)

  // listen for title changes; available even when calling .toString()
  if (hasWindow) state.title = document.title

  function ondomtitlechange (state) {
    emitter.prependListener(EVENTS.DOMTITLECHANGE, title => {
      assert(typeof title === 'string', 'EVENTS.DOMTitleChange: title should be type string')
      state.title = title
      if (hasWindow) document.title = title
    })
  }
  timing()

  const self = {
    start,
    mount,
    route,
    use,
    toString,
    get emit () { return emit },
    get emitter () { return emitter },
    get state () { return state },
    get router () { return router },
    get _historyEnabled () { return historyEnabled },
    get _hrefEnabled () { return hrefEnabled }
  }
  return self

  function route (route, handler) {
    const routeTiming = nanotiming(`choo.route('${route}')`)
    assert(typeof route === 'string', 'choo.route: route should be type string')
    assert(typeof handler === 'function', 'choo.handler: route should be type function')
    router.on(route, handler)
    routeTiming()
  }

  function use (cb) {
    assert(typeof cb === 'function', 'choo.use: cb should be type function')
    stores.push(state => {
      const msg = cb.storeName ? `choo.use(${cb.storeName})` : 'choo.use'
      const endTiming = nanotiming(msg)
      cb(state, emitter, self)
      endTiming()
    })
  }

  function start () {
    assert(typeof window === 'object', 'choo.start: window was not found. .start() must be called in a browser, use .toString() if running in Node')
    const startTiming = nanotiming('choo.start')

    if (historyEnabled) {
      emitter.prependListener(EVENTS.NAVIGATE, () => {
        matchRoute(state)
        if (loaded) {
          emit(EVENTS.RENDER)
          setTimeout(scrollToAnchor.bind(null, window.location.hash), 0)
        }
      })

      emitter.prependListener(EVENTS.POPSTATE, () => emit(EVENTS.NAVIGATE))

      emitter.prependListener(EVENTS.PUSHSTATE, href => {
        assert(typeof href === 'string', 'EVENTS.pushState: href should be type string')
        window.history.pushState(HISTORY_OBJECT, null, href)
        emit(EVENTS.NAVIGATE)
      })

      emitter.prependListener(EVENTS.REPLACESTATE, href => {
        assert(typeof href === 'string', 'EVENTS.replaceState: href should be type string')
        window.history.replaceState(HISTORY_OBJECT, null, href)
        emit(EVENTS.NAVIGATE)
      })

      window.onpopstate = () => {
        emit(EVENTS.POPSTATE)
      }

      if (hrefEnabled) {
        nanohref(location => {
          const { href, hash } = location
          if (href === window.location.href) {
            if (!hashEnabled && hash) scrollToAnchor(hash)
            return
          }
          emit(EVENTS.PUSHSTATE, href)
        })
      }
    }

    matchRoute(state)
    stores.forEach(initStore => initStore(state))

    tree = prerender(state)
    assert(tree, `choo.start: no valid DOM node returned for location ${state.href}`)

    emitter.prependListener(EVENTS.RENDER, nanoraf(() => {
      const renderTiming = nanotiming('choo.render')
      const newTree = prerender(state)
      assert(newTree, `choo.render: no valid DOM node returned for location ${state.href}`)

      assert(tree.nodeName === newTree.nodeName, `choo.render: The target node <${tree.nodeName.toLowerCase()}> is not the same type as the new node <${newTree.nodeName.toLowerCase()}>.`)

      const morphTiming = nanotiming('choo.morph')
      nanomorph(tree, newTree, opts.morph)
      morphTiming()

      renderTiming()
    }))

    documentReady(() => {
      emit(EVENTS.DOMCONTENTLOADED)
      loaded = true
    })

    startTiming()
    return tree
  }

  function mount (selector) {
    const mountTiming = nanotiming(`choo.mount('${selector}')`)
    if (typeof window !== 'object') {
      assert(typeof selector === 'string', 'choo.mount: selector should be type String')
      mountTiming()
      return
    }

    assert(typeof selector === 'string' || typeof selector === 'object', 'choo.mount: selector should be type String or HTMLElement')

    documentReady(() => {
      const renderTiming = nanotiming('choo.render')
      const newTree = start()
      if (typeof selector === 'string') {
        tree = document.querySelector(selector)
      } else {
        tree = selector
      }

      assert(tree, `choo.mount: could not query selector: ${selector}`)
      assert(tree.nodeName === newTree.nodeName, `choo.mount: The target node <${tree.nodeName.toLowerCase()}> is not the same type as the new node <${newTree.nodeName.toLowerCase()}>.`)

      const morphTiming = nanotiming('choo.morph')
      nanomorph(tree, newTree)
      morphTiming()

      renderTiming()
    })
    mountTiming()
  }

  function toString (location, state = {}) {
    state.components = state.components || {}
    state.events = Object.assign({}, state.events, EVENTS)

    assert(typeof window !== 'object', 'choo.mount: window was found. .toString() must be called in Node, use .start() or .mount() if running in the browser')
    assert(typeof location === 'string', 'choo.toString: location should be type string')
    assert(typeof state === 'object', 'choo.toString: state should be type object')

    matchRoute(state, location)
    emitter.removeAllListeners()
    stores.forEach(initStore => {
      initStore(state)
    })

    const html = prerender(state)
    assert(html, `choo.toString: no valid value returned for the route ${location}`)
    assert(!Array.isArray(html), `choo.toString: return value was an array for the route ${location}`)
    return typeof html.outerHTML === 'string' ? html.outerHTML : html.toString()
  }

  function matchRoute (state, locationOverride) {
    let location
    let queryString
    if (locationOverride) {
      location = locationOverride.replace(/\?.+$/, '').replace(/\/$/, '')
      if (!hashEnabled) location = location.replace(/#.+$/, '')
      queryString = locationOverride.replace(/^.+?\?/, '')
    } else {
      location = window.location.pathname.replace(/\/$/, '')
      if (hashEnabled) location += window.location.hash.replace(/^#/, '/')
      queryString = window.location.search
    }
    const matched = router.match(location)
    handler = matched.cb
    state.href = location
    state.query = Object.fromEntries(new URLSearchParams(queryString))
    state.route = matched.route
    state.params = matched.params
  }

  function prerender (state) {
    const routeTiming = nanotiming(`choo.prerender('${state.route}')`)
    const res = handler(state, emit)
    routeTiming()
    return res
  }
}
