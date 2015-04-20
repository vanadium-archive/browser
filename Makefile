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

export GOPATH:=$(V23_ROOT)/release/projects/browser/go
export VDLPATH:=$(V23_ROOT)/release/projects/browser/go
export GOBIN:=$(V23_ROOT)/release/projects/browser/go/bin

PATH:=$(V23_ROOT)/third_party/cout/node/bin:$(PATH)
PATH:=node_modules/.bin:$(GOBIN):$(PATH)

VANADIUM_JS:=$(V23_ROOT)/release/javascript/core
SOURCE_FILES = $(shell find src -name "*")

ifndef TMPDIR
	export TMPDIR:=/tmp
endif
ORIG_TMPDIR:=$(TMPDIR)
TMPDIR:=$(TMPDIR)/nsb

# Names that should not be mangled by minification.
RESERVED_NAMES := 'context,ctx,callback,cb,$$stream'
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

.PHONY: deploy-staging
deploy-staging: build
	git rev-parse --verify HEAD >> public/version
	gcloud config set project vanadium-staging
	gsutil -m rsync -d -r public gs://browser.staging.v.io

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

# Install what we need from NPM.
node_modules: package.json
	:;npm prune
	:;npm install --quiet
	# TODO(aghassemi) Temporarily use local release/javascript/core add github/npm to package.json later
	cd "$(V23_ROOT)/release/javascript/core" && npm link
	:;npm link vanadium

	touch node_modules

# Install non-JS dependencies from bower.
bower_components: bower.json node_modules
	:;bower prune --config.interactive=false
	:;bower install --config.interactive=false --quiet
	touch bower_components

go/bin: directories
	v23 go install v.io/x/ref/services/mounttable/mounttabled
	v23 go install v.io/x/ref/cmd/principal
	v23 go install v.io/x/ref/cmd/servicerunner
	v23 go install v.io/x/browser/sample/sampled
	v23 go install v.io/x/browser/runner

# PHONY targets:

# Builds the bundle and go binaries.
all: go/bin build

# Builds the bundle.
build: directories public/bundle.js public/bundle.html

# Run unit and integration tests.
test: all
	:;jshint test # lint all test JavaScript files.
	:;./go/bin/runner -v=3 -log_dir=$(V23_ROOT)/release/projects/browser/tmp/log -runSample=true -runTests=true -alsologtostderr=false

# Continuously watch for changes to .js, .html or .css files.
# Rebundles the appropriate bundles when local files change.
watch:
	NOMINIFY=true watch -n 1 make build

# Continuously reruns the tests as they change.
watch-test: go/bin
	NOMINIFY=true ./go/bin/runner -v=3 -log_dir=$(V23_ROOT)/release/projects/browser/tmp/log -runSample=true -runTests=true -runTestsWatch=true -alsologtostderr=false

# Serves the needed daemons and starts a server at http://localhost:9000
# CTRL-C to stop
start: all go/bin
	:;./go/bin/runner -runSample=true -serveHTTP=true -portHTTP=9001 -rootHTTP=$(V23_ROOT)/release/projects/browser/public/ -alsologtostderr=false

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

.PHONY: all build start clean watch test watch-test directories
