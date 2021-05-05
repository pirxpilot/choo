BIN = node_modules/.bin

all: check

deps:
	$(BIN)/dependency-check --no-dev index.js --ignore-module nanoassert

lint:
	$(BIN)/standard

check: lint deps test-types test-node test-browser

test-types:
	$(BIN)/tsd

test-node:
	$(BIN)/tape test/node.js | tap-format-spec

test-browser:
	$(BIN)/browserify test/browser.js | tape-run | tap-format-spec

.PHONY: check lint all inspect start test-type test-node test-browser deps build
