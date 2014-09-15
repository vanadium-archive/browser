#!/bin/bash

VEYRON_MOUNTTABLE_PORT=5167
VEYRON_MOUNTTABLE_PORT_HOUSE=5168
VEYRON_MOUNTTABLE_PORT_COTTAGE=5169
VEYRON_STORE_PORT=5166
VEYRON_WSPR_PORT=8124

VEYRON_IDENTITY_PATH="${TMPDIR-/tmp}/veyron_browser_identity"

# Get an identity if we don't have one yet.
if [ ! -f "${VEYRON_IDENTITY_PATH}" ]; then
  identity seekblessing > "${VEYRON_IDENTITY_PATH}"
fi

source "${BASH_SOURCE%/*}/run-common.sh"

serve public/. --port $HTTP_PORT --compress &

wait
