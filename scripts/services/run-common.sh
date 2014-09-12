#!/bin/bash

export PATH=$VEYRON_ROOT/veyron/go/bin:$PATH
export PATH=node_modules/.bin:$PATH

HTTP_PORT=9000
VEYRON_PROXY_PORT=5164
VEYRON_PROXY_ADDR=127.0.0.1:$VEYRON_PROXY_PORT
VEYRON_IDENTITY_SERVER=/proxy.envyor.com:8101/identity/veyron-test/google

trap 'kill -KILL 0' SIGINT SIGTERM EXIT

export VEYRON_IDENTITY=$VEYRON_IDENTITY_PATH;
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT &
sleep 1 ;
export NAMESPACE_ROOT=/localhost:$VEYRON_MOUNTTABLE_PORT ;
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT_HOUSE --name="house" &
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT_COTTAGE --name="cottage" &
proxyd -address=$VEYRON_PROXY_ADDR &
wsprd --v=3 -logtostderr=true -vproxy=$VEYRON_PROXY_ADDR --port $VEYRON_WSPR_PORT --identd=$VEYRON_IDENTITY_SERVER &
sleep 1 ;
# Run some veyron services for demo and integration testing
binaryd --name="binaryd" &
buildd --name="buildd" &
./go/bin/sampled &
