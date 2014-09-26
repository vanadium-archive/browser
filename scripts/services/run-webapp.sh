#!/bin/bash

# This script runs mounttables, proxy daemons, a http server and
# a few sample servers to run and demo the Veyron Browser.

source "${VEYRON_ROOT}/veyron-browser/scripts/services/common.sh"

main() {
  local -r MOUNTTABLE_PORT=5167
  local -r MOUNTTABLE_PORT_HOUSE=5168
  local -r MOUNTTABLE_PORT_COTTAGE=5169
  local -r WSPR_PORT=8124
  local -r PROXY_PORT=5164
  local -r VEYRON_IDENTITY_PATH="${TMPDIR}/app_identity"
  local -r SEEK_BLESSSING=true
  local -r HTTP_PORT=9000

  common::run "${MOUNTTABLE_PORT}" "${MOUNTTABLE_PORT_HOUSE}" "${MOUNTTABLE_PORT_COTTAGE}" "${WSPR_PORT}" "${PROXY_PORT}" "${VEYRON_IDENTITY_PATH}" "${SEEK_BLESSSING}"

  local -r SERVE="${VEYRON_ROOT}/veyron-browser/node_modules/.bin/serve"
  "${SERVE}" "${VEYRON_ROOT}"/veyron-browser/public/. --port "${HTTP_PORT}" --compress &
}

main "$@"
wait