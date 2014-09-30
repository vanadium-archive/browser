#!/bin/bash

# This script runs mounttables, proxy daemons and a few sample servers
# needed to run the integration tests and then runs all the unit and
# integration tests using Prova in a headless browser.
# pass true as first argument to run the tests in watch mode
# script will exit with code 0 if tests pass and with 1 if tests fail.

source "${VEYRON_ROOT}/veyron-browser/scripts/services/common.sh"

main() {

  local -r MOUNTTABLE_PORT=8881
  local -r MOUNTTABLE_PORT_HOUSE=8882
  local -r MOUNTTABLE_PORT_COTTAGE=8883
  local -r WSPR_PORT=8885
  local -r PROXY_PORT=8886
  local -r VEYRON_IDENTITY_PATH="${TMPDIR}/test_identity"
  local -r SEEK_BLESSSING=false

  PROVA_WATCH="${PROVA_WATCH-false}"

  common::run "${MOUNTTABLE_PORT}" "${MOUNTTABLE_PORT_HOUSE}" "${MOUNTTABLE_PORT_COTTAGE}" "${WSPR_PORT}" "${PROXY_PORT}" "${VEYRON_IDENTITY_PATH}" "${SEEK_BLESSSING}"

  echo -e "\033[34m-Services are running\033[0m"

  cd "${VEYRON_ROOT}/veyron-browser"
  local PROVA_OPTIONS="--browser --launch chrome --plugin proxyquireify/plugin --transform ./css-transform"
  local -r PROVA="${VEYRON_ROOT}/veyron-browser/node_modules/.bin/prova"
  local -r PROVA_OUTPUT_FILE="${PROVA_OUTPUT_FILE-${TMPDIR}/test_output}"
  if [[ "${PROVA_WATCH}" = false ]]; then
    PROVA_OPTIONS="${PROVA_OPTIONS} --headless --quit --progress --tap"
    PROVA_PORT=8891
    echo -e "\033[34m-Executing tests. See ${PROVA_OUTPUT_FILE} for test output.\033[0m"
  else
    PROVA_PORT=8892
    echo -e "\033[34m-Running tests in watch mode.\033[0m"
  fi
  echo -e "\033[34m-Go to \033[32mhttp://0.0.0.0:${PROVA_PORT}\033[34m to see tests running.\033[0m"
  PROVA_OPTIONS="${PROVA_OPTIONS} --port ${PROVA_PORT}"

  # Execute the test runner.
  set -o pipefail
  DEBUG=false "${PROVA}" test/**/*.js ${PROVA_OPTIONS} | tee "${PROVA_OUTPUT_FILE}" || common::fail "Some tests failed"
  echo -e "\033[32m\033[1mPASS\033[0m"
}

main "$@"
