#!/bin/bash

# This script runs mounttables, proxy daemons and a few sample servers
# needed to run the integration tests and then runs all the unit and
# integration tests using Prova in a headless browser.
# pass true as first argument to run the tests in watch mode
# script will exit with code 0 if tests pass and with 1 if tests fail.

source "${VANADIUM_ROOT}/veyron-browser/scripts/services/common.sh"

main() {

  local -r MOUNTTABLE_PORT=8881
  local -r MOUNTTABLE_PORT_HOUSE=8882
  local -r MOUNTTABLE_PORT_COTTAGE=8883
  local -r WSPR_PORT=8885
  local -r PROXY_PORT=8886
  local -r VEYRON_IDENTITY_DIR="${TMPDIR}/test_credentials_dir"
  local -r SEEK_BLESSSING=false

  PROVA_WATCH="${PROVA_WATCH-false}"

  common::run "${MOUNTTABLE_PORT}" "${MOUNTTABLE_PORT_HOUSE}" "${MOUNTTABLE_PORT_COTTAGE}" "${WSPR_PORT}" "${PROXY_PORT}" "${VEYRON_IDENTITY_DIR}" "${SEEK_BLESSSING}"

  echo -e "\033[34m-Services are running\033[0m"

  cd "${VANADIUM_ROOT}/veyron-browser"
  local PROVA_OPTIONS="--browser --includeFilenameAsPackage --launch chrome --plugin proxyquireify/plugin --transform ./main-transform"
  local -r PROVA="${VANADIUM_ROOT}/veyron-browser/node_modules/.bin/prova"
  local -r TAP_XUNIT="${VANADIUM_ROOT}/veyron-browser/node_modules/.bin/tap-xunit"
  local -r XUNIT_OUTPUT_FILE="${XUNIT_OUTPUT_FILE-${TMPDIR}/test_output.xml}"
  local -r TAP_XUNIT_OPTIONS=" --package=namespace-browser"
  if [[ "${PROVA_WATCH}" = false ]]; then
    PROVA_OPTIONS="${PROVA_OPTIONS} --headless --quit --progress --tap"
    PROVA_PORT=8891
    echo -e "\033[34m-Executing tests. See ${XUNIT_OUTPUT_FILE} for test xunit output.\033[0m"
  else
    PROVA_PORT=8892
    echo -e "\033[34m-Running tests in watch mode.\033[0m"
  fi
  echo -e "\033[34m-Go to \033[32mhttp://0.0.0.0:${PROVA_PORT}\033[34m to see tests running.\033[0m"
  PROVA_OPTIONS="${PROVA_OPTIONS} --port ${PROVA_PORT}"

  # Execute the test runner.
  set -o pipefail
  DEBUG=false "${PROVA}" test/**/*.js ${PROVA_OPTIONS} | tee >("${TAP_XUNIT}" ${TAP_XUNIT_OPTIONS} > "${XUNIT_OUTPUT_FILE}") || common::fail "Some tests failed"
  echo -e "\033[32m\033[1mPASS\033[0m"
}

main "$@"
