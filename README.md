# Namespace Browser
Namespace browser is a browser application that lets the user view and traverse
mount tables, intermediate nodes, and services. It also lets the user invoke
services either to see the results, or to change the state of a server.

## Building
Before you can run Namespace Browser, you need to build. Simply run:

```sh
make
```

## The Extension

You must have the Veyron Extension installed to run this.

Get it here:
https://github.com/veyron/release/javascript/core/raw/master/extension/veyron.crx

## Running

```sh
make start
```
and navigate to http://localhost:9000

to stop simply CTRL-C the console running the make start

If you have any problems after updating the code, try

```sh
make clean
make start
```
