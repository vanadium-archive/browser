##
# Provides targets to build, test and run the Namespace Browser application.
#
# make  # Builds the project.
# make test  # Runs unit and integration tests.
# make start  # Starts the services and http server needed to run the application at http://localhost:9001
# make clean  # Deleted all build, testing and other artifacts.
#
# Note: :; at the beginning of commands is a work-around for an issue in MacOS version of GNU `make` where
# `make` may not invoke shell to run a command if command is deemed simple enough causing environment variables
# like PATH that are modified here not to be used.
# :; tricks make to assume command is not simple and needs to invoke shell.
# see http://stackoverflow.com/questions/21708839/problems-setting-path-in-makefile for details.
##

export GOPATH:=$(JIRI_ROOT)/release/projects/browser/go
export GOBIN:=$(JIRI_ROOT)/release/projects/browser/go/bin
export V23_CREDENTIALS=$(JIRI_ROOT)/release/projects/browser/credentials

NODE_DIR := $(shell jiri profile list --info Target.InstallationDir v23:nodejs)
export PATH := node_modules/.bin:$(NODE_DIR)/bin:$(GOBIN):$(PATH)

# NOTE: we run npm using 'node npm' to avoid relying on the shebang line in the
# npm script, which can exceed the Linux shebang length limit on Jenkins.
NPM := $(NODE_DIR)/bin/npm

VANADIUM_JS:=$(JIRI_ROOT)/release/javascript/core
SOURCE_FILES = $(shell find src -name "*")
GO_FILES = $(shell find src -name "*.go")

ifndef TMPDIR
	export TMPDIR:=/tmp
endif
ORIG_TMPDIR:=$(TMPDIR)
TMPDIR:=$(TMPDIR)/nsb

# Names that should not be mangled by minification.
RESERVED_NAMES := 'context,ctx,callback,cb,$$stream,serverCall'
# Don't mangle RESERVED_NAMES, and screw ie8.
MANGLE_OPTS := --mangle [--except $(RESERVED_NAMES) --screw_ie8 ]
# Don't remove unused variables from function arguments, which could mess up signatures.
# Also don't evaulate constant expressions, since we rely on them to conditionally require modules only in node.
COMPRESS_OPTS := --compress [ --no-unused --no-evaluate ]

BROWSERIFY_OPTIONS = --transform ./main-transform --debug

# Work-around for Browserify opening too many files by increasing the limit on file descriptors.
# https://github.com/substack/node-browserify/issues/431
INCREASE_FILE_DESC = ulimit -S -n 2560

# Browserify and extract sourcemap, but do not minify.
define BROWSERIFY
	$(INCREASE_FILE_DESC); \
	browserify $1 $(BROWSERIFY_OPTIONS) | exorcist $2.map > $2
endef

# Browserify, minify, and extract sourcemap.
define BROWSERIFY-MIN
	$(INCREASE_FILE_DESC); \
	browserify $1 $(BROWSERIFY_OPTIONS) --g [ uglifyify $(MANGLE_OPTS) $(COMPRESS_OPTS) ] | exorcist $2.map > $2
endef

# All Go and VDL files.
GO_FILES = $(shell find go -name "*.go")
VDL_FILES = $(shell find go -name "*.vdl")

.DEFAULT_GOAL := default
default: build

.PHONY: deploy-production
deploy-production: build
	make -C $(JIRI_ROOT)/infrastructure/deploy browser-production

.PHONY: deploy-staging
deploy-staging: build
	make -C $(JIRI_ROOT)/infrastructure/deploy browser-staging

# Creating the bundle JS file.
public/bundle.js: $(SOURCE_FILES) node_modules
	:;jshint src # lint all src JavaScript files.
ifdef NOMINIFY
	$(call BROWSERIFY,src/app.js,$@)
else
	$(call BROWSERIFY-MIN,src/app.js,$@)
endif

# Creating the bundle HTML file.
public/bundle.html: $(SOURCE_FILES) node_modules bower_components
	:;vulcanize --output public/bundle.html web-component-dependencies.html --inline

# Generate VDL for JavaScript
# TODO(alexfandrianto): The JS Sample World is unused, so we can remove this.
src/services/sample-world/ifc/index.js:
	VDLPATH=$(JIRI_ROOT)/release/projects/browser/src \
		vdl generate -lang=javascript \
		-js-out-dir=$(JIRI_ROOT)/release/projects/browser/src \
		services/sample-world/ifc

# Install what we need from NPM.
node_modules: package.json
	:;node $(NPM) prune
	:;node $(NPM) install --quiet

	touch node_modules

# Install non-JS dependencies from bower.
bower_components: bower.json node_modules
	:;bower prune --config.interactive=false
	:;bower install --config.interactive=false --quiet
	touch bower_components

go/bin: $(GO_FILES)
	jiri go install v.io/x/ref/cmd/principal
	jiri go install v.io/x/browser/runner
	jiri go install v.io/x/browser/namespace-browserd

credentials: go/bin
	./go/bin/principal seekblessings

.PHONY: start-browserd
# Runs namespace browser with the credentials from V23_CREDENTIALS
start-browserd: credentials go/bin/namespace-browserd
	./go/bin/namespace-browserd


# PHONY targets:

# Builds the bundle and go binaries.
all: go/bin build

# Builds the bundle.
build: directories public/bundle.js public/bundle.html

# Run unit and integration tests.
test: all
	:;jshint test # lint all test JavaScript files.
	:;./go/bin/runner -v=3 -log_dir=$(JIRI_ROOT)/release/projects/browser/tmp/log -alsologtostderr=true

# Run UI tests for the namespace browser.
# These tests do not normally need to be run locally, but they can be if you
# want to verify that the a specific, running version of the namespace browser
# is compatible with the live version of the Vanadium extension.
#
# This test takes additional environment variables (typically temporary)
# - GOOGLE_BOT_USERNAME and GOOGLE_BOT_PASSWORD (To sign into Google/Chrome)
# - CHROME_WEBDRIVER (The path to the chrome web driver)
# - WORKSPACE (optional, defaults to $JIRI_ROOT/release/projects/browser)
# - TEST_URL (optional, defaults to http://localhost:9001)
# - NO_XVFB (optional, defaults to using Xvfb. Set to true to watch the test.)
# - BUILD_EXTENSION (optional, defaults to using the live one. Set to true to
#                    use a local build of the Vanadium extension.)
#
# In addition, this test requires that maven, Xvfb, and xvfb-run be installed.
# The HTML report will be in $JIRI_ROOT/release/projects/browser/htmlReports
WORKSPACE ?= $(JIRI_ROOT)/release/projects/browser
TEST_URL ?= http://localhost:9001
ifndef NO_XVFB
	XVFB := TMPDIR=/tmp xvfb-run -s '-ac -screen 0 1024x768x24'
endif

ifdef BUILD_EXTENSION
	BUILD_EXTENSION_PROPERTY := "-DvanadiumExtensionPath=$(VANADIUM_JS)/extension/build"
endif

test-ui:
ifdef BUILD_EXTENSION
	make -B -C $(VANADIUM_JS)/extension build-dev
endif
	WORKSPACE=$(WORKSPACE) $(XVFB) \
	  mvn test \
	  -f=$(JIRI_ROOT)/release/projects/browser/test/ui/pom.xml \
	  -Dtest=NamespaceBrowserUITest \
	  -DchromeDriverBin=$(CHROME_WEBDRIVER) \
	  -DhtmlReportsRelativePath=htmlReports \
	  -DgoogleBotUsername=$(GOOGLE_BOT_USERNAME) \
	  -DgoogleBotPassword=$(GOOGLE_BOT_PASSWORD) \
	  $(BUILD_EXTENSION_PROPERTY) \
	  -DtestUrl=$(TEST_URL)

# Continuously watch for changes to .js, .html or .css files.
# Rebundles the appropriate bundles when local files change.
watch:
	NOMINIFY=true watch -n 1 make build

# Continuously reruns the tests as they change.
watch-test: go/bin
	NOMINIFY=true ./go/bin/runner -v=3 -log_dir=$(JIRI_ROOT)/release/projects/browser/tmp/log -runTestsWatch=true -alsologtostderr=false

# Serves the needed daemons and starts a server at http://localhost:9000
# CTRL-C to stop
start: build
	echo "Serving at http://localhost:9001"
	@static "./public" -p 9001 -H '{"Cache-Control": "max-age=0, no-cache, no-store"}' > /dev/null

# Create needed directories like TMPDIR.
directories:
	mkdir -p $(TMPDIR)

# Clean all build artifacts.
clean:
	rm -f public/bundle.*
	rm -rf node_modules
	rm -rf go/bin
	rm -rf bower_components
	rm -rf $(TMPDIR)
	rm -rf public/version
	rm -rf htmlReports
	rm -rf test/ui/target
	rm -rf credentials

.PHONY: all build start clean watch test watch-test directories
