#!/bin/bash

# This script exports a common::run function which builds
# and runs mounttables and other daemons needed to run and
# test the Veyron Browser.
# The ports on which to run these services should be passed
# as arguments to the function.
# This script shuts down these services on exit.

source "${VEYRON_ROOT}/environment/scripts/lib/shell.sh"

trap at_exit INT TERM EXIT

at_exit() {
  shell::at_exit
  kill -KILL 0
}

build() {
  export GOPATH="${VEYRON_ROOT}/veyron-browser/go:${PATH}"
  export GOBIN="${VEYRON_ROOT}/veyron-browser/go/bin"
  local -r GO="${VEYRON_ROOT}/scripts/build/go"

  "${GO}" install veyron.io/veyron/veyron/services/mounttable/mounttabled
  "${GO}" install veyron.io/veyron/veyron/services/proxy/proxyd
  "${GO}" install veyron.io/veyron/veyron/services/wsprd
  "${GO}" install veyron.io/veyron/veyron/services/mgmt/binary/binaryd
  "${GO}" install veyron.io/veyron/veyron/services/mgmt/build/buildd
  "${GO}" install veyron.io/veyron/veyron/tools/identity
  "${GO}" install sample/sampled
}

common::run() {
  build
  cd "${GOBIN}"

  local -r ROOT_MOUNTTABLE_PORT="$1"
  local -r HOUSE_MOUNTTABLE_PORT="$2"
  local -r COTTAGE_MOUNTTABLE_PORT="$3"
  local -r WSPR_PORT="$4"
  local -r IDENTITY_PATH="$5"
  local -r SEEK_BLESSSING="$6"

  local -r PROXY_PORT=5164
  local -r PROXY_ADDR=127.0.0.1:"${PROXY_PORT}"
  local -r IDENTITY_SERVER=/proxy.envyor.com:8101/identity/veyron-test/google

  # Get an identity if we don't have one yet.
  if [[ ! -f "${IDENTITY_PATH}" ]] || [[ ! -s "${IDENTITY_PATH}" ]]; then
    if [[ "${SEEK_BLESSSING}" = true ]]; then
      ./identity seekblessing > "${IDENTITY_PATH}"
    else
      ./identity generate > "${IDENTITY_PATH}"
    fi
  fi
  export VEYRON_IDENTITY="${IDENTITY_PATH}";

  # Run mounttables
  local -r MTLOG_MESSAGE="Mount table service at"

  local -r ROOT_MTLOG="${TMPDIR}/mt_root.log"
  touch "${ROOT_MTLOG}"
  ./mounttabled --address=:"${ROOT_MOUNTTABLE_PORT}" 2>&1 | tee "${ROOT_MTLOG}" &
  shell::wait_for "${ROOT_MTLOG}" "${MTLOG_MESSAGE}"

  export NAMESPACE_ROOT=/localhost:"${ROOT_MOUNTTABLE_PORT}";

  local -r HOUSE_MTLOG="${TMPDIR}/mt_house.log"
  touch "${HOUSE_MTLOG}"
  ./mounttabled --address=:"${HOUSE_MOUNTTABLE_PORT}" --name="house" 2>&1 | tee "${HOUSE_MTLOG}" &
  shell::wait_for "${HOUSE_MTLOG}" "${MTLOG_MESSAGE}"

  local -r COTTAGE_MTLOG="${TMPDIR}/mt_cottage.log"
  touch "${COTTAGE_MTLOG}"
  ./mounttabled --address=:"${COTTAGE_MOUNTTABLE_PORT}" --name="cottage" 2>&1 | tee "${COTTAGE_MTLOG}" &
  shell::wait_for "${COTTAGE_MTLOG}" "${MTLOG_MESSAGE}"

  # Run proxies
  local -r PROXYLOG="${TMPDIR}/proxy.log"
  touch "${PROXYLOG}"
  ./proxyd --v=1 -address="${PROXY_ADDR}" 2>&1 | tee "${PROXYLOG}" &
  shell::wait_for "${PROXYLOG}" "Proxy listening on"

  local -r WSPRLOG="${TMPDIR}/wspr.log"
  touch "${WSPRLOG}"
  ./wsprd --v=3 --vproxy="${PROXY_ADDR}" --port="${WSPR_PORT}" --identd="${IDENTITY_SERVER}" "${WSPRLOG}" 2>&1 | tee "${WSPRLOG}" &
  shell::wait_for "${WSPRLOG}" "Listening on port ${WSPR_PORT}"

  # Run some veyron services for demo and integration testing
  ./binaryd --name="binaryd" &
  ./buildd --name="buildd" &
  ./sampled &
}
