# Vanadium Namespace Browser
The namespace browser is a web application that lets developers and other
users view and interact with the Vanadium world.
Starting from their namespace root, a user can see where services are mounted
and browse through the mount table hierarchy. The user can select a service to
see more detailed information about it, and can also interact with the
service; by invoking methods they can examine or modify the service's state.

## Installing the Vanadium Extension

As a Vanadium web application, the namespace browser requires that users
install the Vanadium Extension from the Chrome Web Store.
If you try to run the webapp without the extension, it will
prompt you to install it.

Here is the link to the Vanadium Extension:
https://chrome.google.com/webstore/detail/vanadium-extension/jcaelnibllfoobpedofhlaobfcoknpap

## Building the Namespace Browser

You do not need to build your own copy of the namespace browser in
order to use it; just if you want to modify it or see how it works.

To build a local copy, install the Vanadium environment and be sure to
include the web profile.

Here is the link to the development instructions for Vanadium:
https://v.io/community/contributing.html

Next, to build your own copy of the namespace browser, simply run:

```sh
cd $VANADIUM_ROOT/release/projects/browser
make build
```

This compiles the relevant bundle files in the 'public' folder. The
assets inside must be served as your own instance of the web app.

### Running locally for development

You can serve a local instance with the following command:

```sh
make start
```

This command compiles and launches the web app. Additionally, demo services that
represent a virtual house and cottage are added to your local namespace.

Navigate to http://localhost:9001 to access the namespace browser.
You can quit by using `CTRL-C` on the console running `make start`

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

There are no UI tests yet.

## Contributing
Coming Soon!
Meanwhile, you can submit bugs, issues and suggestions from the namespace browser itself.
