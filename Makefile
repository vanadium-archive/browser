PATH:=$(VEYRON_ROOT)/environment/cout/node/bin:$(PATH)
PATH:=node_modules/.bin:$(PATH)

# All JS and CSS files except build.js and third party
BROWSERIFY_FILES = $(shell find src -name "*.js" -o -name "*.css")
BROWSERIFY_OPTIONS = --transform ./css-transform --debug
PROVA_OPTIONS = --browser --launch chrome --plugin proxyquireify/plugin --transform ./css-transform
PROVA_HEADLESS_OPTIONS = --headless --progress --quit
JS_ALL_TEST_FILES = $(shell find test -name "*.js")
JS_UNIT_TEST_FILES = $(shell find test/unit -name "*.js")
JS_INTEGRATION_TEST_FILES = $(shell find test/integration -name "*.js")

# All Go and VDL files
GO_FILES = $(shell find go -name "*.go")
VDL_FILES = $(shell find go -name "*.vdl")

# Builds everything
all: public/bundle.js public/bundle.html public/platform.js public/platform.js.map public/polymer.js.map

# Creating the bundle JS file
public/bundle.js: $(BROWSERIFY_FILES) node_modules
	:;jshint src # lint all src JavaScript files
	:;browserify src/app.js $(BROWSERIFY_OPTIONS) $< | exorcist $@.map > $@ # Browserify and generate map file

# Creating the bundle HTML file
public/bundle.html: web-component-dependencies.html node_modules bower_components
	:;vulcanize --output public/bundle.html web-component-dependencies.html --inline

# Copies the web components platform file
public/platform.js: bower_components
	cp bower_components/platform/platform.js public/platform.js

public/platform.js.map: bower_components
	cp bower_components/platform/platform.js.map public/platform.js.map

public/polymer.js.map: bower_components
	cp bower_components/polymer/polymer.js.map public/polymer.js.map

# Install what we need from NPM
node_modules: package.json
	:;npm prune
	:;npm install
	touch node_modules

# Install non-JS dependencies from bower
bower_components: bower.json node_modules
	:;bower prune
	:;bower install
	touch bower_components

# PHONY targets:

# Run unit and integration tests
# TODO(aghassemi) add integration tests back when running/shutting down of services is figured out
test: test-unit

# Uses prova to run unit tests in a headless chrome and then quit after all test finish
test-unit: all
	@echo -e "\e[1;35mRunning Unit Tests\e[0m"
	@:;jshint test/unit # lint unit test JavaScript files
	@:;prova $(JS_UNIT_TEST_FILES) $(PROVA_OPTIONS) $(PROVA_HEADLESS_OPTIONS)

# Uses prova to run integration tests in a headless chrome and then quit after all test finish
# TODO(aghassemi) The need to manually run run-test-services.sh is temporary. We need to reuse or
# at least take a similar approach as https://veyron-review.googlesource.com/#/c/4316 for veyron.js integration tests
test-integration: all
	@echo -e "\e[1;35mRunning Integration Tests - Ensure ./scripts/services/run-test-services.sh is running\e[0m"
	@:;jshint test/integration # lint integration test JavaScript files
	@:;prova $(JS_INTEGRATION_TEST_FILES) $(PROVA_OPTIONS) $(PROVA_HEADLESS_OPTIONS)

# Continuously watch for changes to .js, .html or .css files.
# Rebundles the appropriate bundles when local files change
watch:
	watch -n 1 make

# Continuously reruns the tests as they change
watch-test:
	@:;prova $(JS_ALL_TEST_FILES) $(PROVA_OPTIONS)

# Serves the needed daemons and starts a server at http://localhost:$(HTTP_PORT)
# CTRL-C to stop
start: all
	./scripts/services/run-webapp-services.sh

# Clean all build artifacts
clean:
	rm -f public/bundle.js
	rm -f public/bundle.html
	rm -f public/platform.*
	rm -f public/polymer.*
	rm -rf node_modules
	rm -rf go/bin
	rm -rf bower_components

.PHONY: start clean watch test watch-test test-unit test-integration
