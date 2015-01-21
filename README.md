# Viz Vanadium Viewer
Viz is a browser-like application that lets the user view and traverse
mount tables, intermediate nodes, and services. It also lets the user invoke
services either to see the results, or to change the state of a server.

## The Extension

You must have the Vanadium Extension installed on Chrome to run this.

Get it here:
https://chrome.google.com/webstore/detail/vanadium-extension/jcaelnibllfoobpedofhlaobfcoknpap

## Building
Before you can run Viz, you need to build. Simply run:

```sh
make
```

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
