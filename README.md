# Vanadium Namespace Browser

The namespace browser is a web application that lets developers and other
users view and interact with the Vanadium world.
Starting from their namespace root or other mount table,
users can browse through the mount table hierarchy
and see where services are mounted. The user can select a service to
see more detailed information about it, and can also interact with the
service, invoking methods to examine or modify the state of the service.

### Running Namespace Browser

You can serve a local instance of the Namespace Browser by executing the following command:

```sh
$JIRI_ROOT/release/projects/browser/run.sh
```

Navigate to http://localhost:9001 to launch the namespace browser.
You can quit by using `CTRL-C` on the console.

## Contributing

The code repository for the Namespace Browser is on [GitHub](https://github.com/vanadium/browser).

Bugs and other issues can be submitted to the
[Namespace Browser Issue Tracker](https://github.com/vanadium/browser/issues).
