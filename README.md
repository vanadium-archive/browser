# Vanadium Namespace Browser

The namespace browser is a web application that lets developers and other
users view and interact with the Vanadium world.
Starting from their namespace root or other mount table,
users can browse through the mount table hierarchy
and see where services are mounted. The user can select a service to
see more detailed information about it, and can also interact with the
service, invoking methods to examine or modify the state of the service.

## Installing the Vanadium Extension

As a Vanadium web application, the Namespace Browser requires that users
install the Vanadium Extension from the Chrome Web Store.
If you try to run the web app without the extension,
it will prompt you to install it.

Here is the link to the Vanadium Extension:
https://chrome.google.com/webstore/detail/vanadium-extension/jcaelnibllfoobpedofhlaobfcoknpap

## Hosted Namespace Browser

The Vanadium Namespace Browser lives online at
https://browser.v.io/

## Building the Namespace Browser

You do not need to build your own copy of the namespace browser in
order to use it, unless you want to modify it or see how it works.

To build a local copy, install the Vanadium environment and be sure to
include the web profile.

Here is the link to the development instructions for Vanadium:
https://github.com/vanadium/docs/blob/master/community/contributing.md

Next, to build your own copy of the namespace browser, run:

```sh
cd $V23_ROOT/release/projects/browser
make build
```

This compiles the relevant bundle files in the 'public' folder. The
assets inside must be served as your own instance of the web app.

### Running locally for development

You can serve a local instance of the Namespace Browser by executing the following command:

```sh
make start
```

Navigate to http://localhost:9001 to launch the namespace browser.
You can quit by using `CTRL-C` on the console running `make start`.

If you have any problems after updating the code, try cleaning the build.

```sh
make clean
make start
```

## Testing

The namespace browser has some unit and integration tests that verify basic functionality.
Run these tests with the following command:

```sh
make test
```

## Contributing

The code repository for the Namespace Browser is on [GitHub](https://github.com/vanadium/browser).

Bugs and other issues can be submitted to the
[Namespace Browser Issue Tracker](https://github.com/vanadium/browser/issues).
