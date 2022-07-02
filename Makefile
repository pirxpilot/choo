BIN = node_modules/.bin

all: check

deps:
	$(BIN)/dependency-check --no-dev index.js --ignore-module @pirxpilot/nanoassert

lint:
	$(BIN)/standard

check: lint deps test-node test-browser

test-node:
	$(BIN)/tape test/node.js

test-browser:
	$(BIN)/tape test/browser.js

.PHONY: check lint all test-node test-browser deps build
