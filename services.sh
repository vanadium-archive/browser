export PATH=$VEYRON_ROOT/veyron/go/bin:$PATH
export PATH=node_modules/.bin:$PATH

HTTP_PORT=9000
VEYRON_MOUNTTABLE_PORT=5167
VEYRON_MOUNTTABLE_PORT2=5168
VEYRON_PROXY_PORT=5164
VEYRON_PROXY_ADDR=127.0.0.1:$VEYRON_PROXY_PORT
VEYRON_WSPR_PORT=5165
VEYRON_IDENTITY_PORT=5163
VEYRON_STORE_PORT=5166
VEYRON_IDENTITY_PATH=/tmp/veyron_browser_identity

trap 'kill -TERM 0' SIGINT SIGTERM EXIT

identity generate veyron_browser_identity > "${VEYRON_IDENTITY_PATH}"

export VEYRON_IDENTITY=$VEYRON_IDENTITY_PATH; \
identityd --httpaddr=:$VEYRON_IDENTITY_PORT & \
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT & \
export NAMESPACE_ROOT=/localhost:$VEYRON_MOUNTTABLE_PORT ; \
proxyd -address=$VEYRON_PROXY_ADDR & \
wsprd --v=3 -logtostderr=true -vproxy=$VEYRON_PROXY_ADDR --port $VEYRON_WSPR_PORT & \
mounttabled --address=:$VEYRON_MOUNTTABLE_PORT2 --name=global & \
sleep 1 ; \
stored --address=:$VEYRON_STORE_PORT --name=global/$USER/store &
serve public/. --port $HTTP_PORT --compress &

wait