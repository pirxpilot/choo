BIN = node_modules/.bin

all: check

deps:
	$(BIN)/dependency-check --no-dev index.js --ignore-module nanoassert

lint:
	$(BIN)/standard

check: lint deps test-node test-browser

test-node:
	$(BIN)/tape test/node.js

test-browser:
	$(BIN)/browserify test/browser.js | $(BIN)/tape-run

.PHONY: check lint all inspect start test-type test-node test-browser deps build
