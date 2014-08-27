export PATH=$VEYRON_ROOT/veyron/go/bin:$PATH
export PATH=node_modules/.bin:$PATH

HTTP_PORT=9000
VEYRON_MOUNTTABLE_PORT=5167
VEYRON_MOUNTTABLE_PORT_HOUSE=5168
VEYRON_MOUNTTABLE_PORT_COTTAGE=5169
VEYRON_PROXY_PORT=5164
VEYRON_PROXY_ADDR=127.0.0.1:$VEYRON_PROXY_PORT
VEYRON_WSPR_PORT=8124
VEYRON_STORE_PORT=5166
VEYRON_IDENTITY_PATH=/tmp/veyron_browser_identity
VEYRON_IDENTITY_SERVER=/proxy.envyor.com:8101/identity/veyron-test/google

trap 'kill -TERM 0' SIGINT SIGTERM EXIT

# Get an identity if we don't have one yet.
if [ ! -f "${VEYRON_IDENTITY_PATH}" ]; then
  identity seekblessing > "${VEYRON_IDENTITY_PATH}"
fi


export VEYRON_IDENTITY=$VEYRON_IDENTITY_PATH; \
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT & \
sleep 1 ; \
export NAMESPACE_ROOT=/localhost:$VEYRON_MOUNTTABLE_PORT ; \
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT_HOUSE --name="house" & \
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT_COTTAGE --name="cottage" & \
proxyd -address=$VEYRON_PROXY_ADDR & \
wsprd --v=3 -logtostderr=true -vproxy=$VEYRON_PROXY_ADDR --port $VEYRON_WSPR_PORT --identd=$VEYRON_IDENTITY_SERVER & \
sleep 1 ; \
# Run bunch of random veyron servers like store, rockpaperscissors, sampled
stored --address=:$VEYRON_STORE_PORT --name=global/$USER/store & \
binaryd --name="binaryd" & \
buildd --name="buildd" & \
./go/bin/sampled & \

serve public/. --port $HTTP_PORT --compress &

wait
