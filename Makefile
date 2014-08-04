PATH:=$(VEYRON_ROOT)/environment/cout/node/bin:$(PATH)
PATH:=node_modules/.bin:$(PATH)

# All JS files except build.js and third party
JS_FILES = $(shell find src -name "*.js")

# Builds everything
all: public/bundle.js public/bundle.html public/platform.js

# Creating the bundle JS file
public/bundle.js: $(JS_FILES) node_modules
	jshint src # lint all src JavaScript files
	browserify src/app.js -o public/bundle.js

# Creating the bundle HTML file
public/bundle.html: web-component-dependencies.html node_modules bower_components
	vulcanize --output public/bundle.html web-component-dependencies.html --inline

# Copies the web components platform file
public/platform.js: bower_components
	cp bower_components/platform/platform.js public/platform.js

# Install what we need from NPM
node_modules: package.json
	npm prune
	npm install
	touch node_modules

# Install non-JS dependencies from bower
bower_components: bower.json node_modules
	bower prune
	bower install
	touch bower_components

# PHONY targets:

# Uses prova to run tests in a headless chrome and then quit after all test finish
test:
	jshint test # lint all test JavaScript files
	prova test/**/*.js --browser --launch chrome --headless --progress --quit

# Continuously watch for changes to .js, .html or .css files.
# Rebundles the appropriate bundles when local files change
watch:
	watch -n 1 make

# Continuously reruns the tests as they change
watch-test:
	@echo "Tests being watched at: http://0.0.0.0:7559"
	prova test/**/*.js --browser --launch chrome

# Serves the needed daemons and starts a server at http://localhost:$(HTTP_PORT)
# CTRL-C to stop
start:
	./services.sh

# Clean all build artifacts
clean:
	rm -f public/bundle.js
	rm -f public/bundle.html
	rm -f public/platform.js
	rm -rf node_modules
	rm -rf bower_components

.PHONY: start clean watch test watch-test