BIN = node_modules/.bin

all: check

lint:
	$(BIN)/standard

check: lint test-node test-browser

test-node:
	$(BIN)/tape test/node.js

test-browser:
	$(BIN)/tape test/browser.js

.PHONY: check lint all test-node test-browser deps build
