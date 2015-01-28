#!/bin/bash

# This script runs mounttables, proxy daemons, a http server and
# a few sample servers to run and demo the Veyron Browser.

source "${VANADIUM_ROOT}/release/projects/namespace_browser/scripts/services/common.sh"

main() {
  local -r MOUNTTABLE_ADDRESS=':5167'
  local -r MOUNTTABLE_ADDRESS_HOUSE=':5168'
  local -r MOUNTTABLE_ADDRESS_COTTAGE=':5169'
  local -r SAMPLED_ADDRESS=':0'
  local -r HTTP_PORT=9000
  local -r THISHOST=$(hostname -s)
  local -r MOUNTTABLE_ROOT_NAME="${THISHOST}-home"

  common::run_mounttable "${MOUNTTABLE_ROOT_NAME}" "${MOUNTTABLE_ADDRESS}"
  export NAMESPACE_ROOT=/localhost"${MOUNTTABLE_ADDRESS}"

  common::run "${MOUNTTABLE_ADDRESS_HOUSE}" "${MOUNTTABLE_ADDRESS_COTTAGE}" "${SAMPLED_ADDRESS}"

  local -r SERVE="${VANADIUM_ROOT}/release/projects/namespace_browser/node_modules/.bin/serve"
  "${SERVE}" "${VANADIUM_ROOT}"/release/projects/namespace_browser/public/. --port "${HTTP_PORT}" --compress &
}

main "$@"
wait
