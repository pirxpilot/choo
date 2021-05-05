BIN = node_modules/.bin

all: check

build:
	mkdir -p dist
	$(BIN)/browserify index -s Choo -p bundle-collapser/plugin > dist/bundle.js
	$(BIN)/browserify index -s Choo -p tinyify > dist/bundle.min.js
	cat dist/bundle.min.js | gzip --best --stdout | wc -c | pretty-bytes

deps:
	$(BIN)/dependency-check --entry ./html/index.js .
	$(BIN)/dependency-check . --extra --no-dev --entry ./html/index.js --entry ./component/index.js -i nanoassert

inspect:
	$(BIN)/browserify --full-paths index -p tinyify | discify --open

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
