# Viz Vanadium Viewer
Viz is a browser-like application that lets the user view the Vanadium world.
Starting from their namespace root, users can see where services are mounted and
browse through the mount table hierarchy. The user can also select a service to
see more detailed information about it. Users may also interact with the
service; by invoking methods, they can examine or modify the service's state.

## Installing the Vanadium Extension

Viz requires that user's install the Vanadium Extension from the Chrome Web Store.
Without this extension, Viz will not load properly.

Link to the Vanadium Extension:
https://chrome.google.com/webstore/detail/vanadium-extension/jcaelnibllfoobpedofhlaobfcoknpap

## Building Viz (for deployment)
In order to build your own copy of Viz, simply run:

```sh
make build
```

Note: You will need to install the Vanadium environment and setup the web
profile for this command to succeed.

The command compiles the relevant bundle files in the 'public' folder. The
assets inside can be served as your own instance of Viz.

## Running Viz (for development)

You can serve a local instance of Viz with the following command:

```sh
make start
```

Note: You will need to install the Vanadium environment and setup the web
profile for this command to succeed.

This command compiles and launches Viz. Additionally, demo services that
represent a virtual house and cottage are added to your local namespace.

Navigate to http://localhost:9000 to access Viz.
You can quit by using `CTRL-C` on the console running `make start`

If you have any problems after updating the code, try cleaning the build.

```sh
make clean
make start
```

## Testing Viz (for development)

Viz has some unit and integration tests that verify basic functionality.

Run these tests with the following command:

```sh
make test
```

There are no UI tests yet.

## Contributing to Viz
Coming Soon!