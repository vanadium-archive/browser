#!/bin/bash

# This script runs mounttables, proxy daemons and a few sample servers
# needed to run the integration tests for the Veyron Browser.

source "${VEYRON_ROOT}/veyron-browser/scripts/services/common.sh"

main() {
  local -r MOUNTTABLE_PORT=8881
  local -r MOUNTTABLE_PORT_HOUSE=8882
  local -r MOUNTTABLE_PORT_COTTAGE=8883
  local -r WSPR_PORT=8885
  local -r VEYRON_IDENTITY_PATH="${TMPDIR-/tmp}/veyron_browser_test_identity"
  local -r SEEK_BLESSSING=false

  common::run "${MOUNTTABLE_PORT}" "${MOUNTTABLE_PORT_HOUSE}" "${MOUNTTABLE_PORT_COTTAGE}" "${WSPR_PORT}" "${VEYRON_IDENTITY_PATH}" "${SEEK_BLESSSING}"
}

main "$@"
wait
