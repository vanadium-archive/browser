#!/bin/bash

# This script exports a common::run function which builds
# and runs mounttables and other daemons needed to run and
# test the Veyron Browser.
# The ports on which to run these services should be passed
# as arguments to the function.
# This script shuts down these services on exit.

source "${VEYRON_ROOT}/scripts/lib/shell.sh"

trap 'terminate force' INT
trap 'terminate' EXIT TERM

# terminate is automatically called when receiving a signal or can be manually
# called from other functions to exit the shell
# The string 'force' can be provided as the first argument to indicate whether
# we should kill the process and exit with an non-zero error code instead of
# the default behavior which is to wait for termination and exit with exit code 0
terminate() {
  exec 2> /dev/null
  shell::at_exit
  local -r FORCE="${1-}"
  if [[ "${FORCE}" = "force" ]]; then
    kill -KILL 0 || true
  else
    kill -TERM 0 || true
    wait
  fi
}

# build is used to install binaries needed to run services.
build() {
  export GOPATH="${VEYRON_ROOT}/veyron-browser/go:${PATH}"
  export GOBIN="${VEYRON_ROOT}/veyron-browser/go/bin"

  veyron go install veyron.io/veyron/veyron/services/mounttable/mounttabled
  veyron go install veyron.io/veyron/veyron/services/proxy/proxyd
  veyron go install veyron.io/veyron/veyron/services/wsprd
  veyron go install veyron.io/veyron/veyron/services/mgmt/binary/binaryd
  veyron go install veyron.io/veyron/veyron/services/mgmt/build/buildd
  veyron go install veyron.io/veyron/veyron/tools/identity
  veyron go install sample/sampled
}

# common::fail will output a red FAILED message along with and optional message given
# as first argument and an optional LOGFILE location to output as second argument.
# This function will also exit the shell with an exit code of 1.
common::fail() {
  local -r MESSAGE="${1-}"
  local -r LOG_FILE="${2-}"

  if [[ -e "${LOG_FILE}" ]]; then
    cat "${LOG_FILE}"
  fi

  echo -e "\033[91m\033[1mFAIL\033[0m ${MESSAGE}"
  terminate force
}

# common::run is used to run the services needed to test and demon veyron browser
# run will exit the shell if a process fails to start or panics and it will display
# an error message along with the log file for the misbehaving service.
common::run() {

  build
  cd "${GOBIN}"

  local -r ROOT_MOUNTTABLE_PORT="$1"
  local -r HOUSE_MOUNTTABLE_PORT="$2"
  local -r COTTAGE_MOUNTTABLE_PORT="$3"
  local -r WSPR_PORT="$4"
  local -r PROXY_PORT="$5"
  local -r IDENTITY_PATH="$6"
  local -r SEEK_BLESSSING="$7"

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

  local -r MTLOG_MESSAGE="Mount table service at"

  # Run each server in a sub shell so we can call common::fail if process fails to start
  # or panics as it is running.

  # Run mounttables.
  local -r ROOT_MTLOG="${TMPDIR}/mt_root.log"
  touch "${ROOT_MTLOG}"
  (
    ./mounttabled --address=:"${ROOT_MOUNTTABLE_PORT}" &> "${ROOT_MTLOG}" ||
    common::fail "Failed to run root mounttable" "${ROOT_MTLOG}"
  ) &
  shell::wait_for "${ROOT_MTLOG}" "${MTLOG_MESSAGE}"

  export NAMESPACE_ROOT=/localhost:"${ROOT_MOUNTTABLE_PORT}";

  local -r HOUSE_MTLOG="${TMPDIR}/mt_house.log"
  touch "${HOUSE_MTLOG}"
  (
    ./mounttabled --address=:"${HOUSE_MOUNTTABLE_PORT}" --name="house" &> "${HOUSE_MTLOG}" ||
    common::fail "Failed to run house mounttable" "${HOUSE_MTLOG}"
  ) &
  shell::wait_for "${HOUSE_MTLOG}" "${MTLOG_MESSAGE}"

  local -r COTTAGE_MTLOG="${TMPDIR}/mt_cottage.log"
  touch "${COTTAGE_MTLOG}"
  (
    ./mounttabled --address=:"${COTTAGE_MOUNTTABLE_PORT}" --name="cottage" &> "${COTTAGE_MTLOG}" ||
    common::fail "Failed to run cottage mounttable" "${COTTAGE_MTLOG}"
  ) &
  shell::wait_for "${COTTAGE_MTLOG}" "${MTLOG_MESSAGE}"

  # Run proxies.
  local -r PROXYLOG="${TMPDIR}/proxy.log"
  touch "${PROXYLOG}"
  (
    ./proxyd --v=1 --http=":0" -address="${PROXY_ADDR}" &> "${PROXYLOG}" ||
    common::fail "Failed to run Proxy" "${PROXYLOG}"
  ) &
  shell::wait_for "${PROXYLOG}" "Proxy listening on"

  local -r WSPRLOG="${TMPDIR}/wspr.log"
  touch "${WSPRLOG}"
  (
    ./wsprd --v=1 --vproxy="${PROXY_ADDR}" --port="${WSPR_PORT}" --identd="${IDENTITY_SERVER}" &> "${WSPRLOG}" ||
    common::fail "Failed to run WSPR" "${WSPRLOG}"
  ) &
  shell::wait_for "${WSPRLOG}" "Listening on port ${WSPR_PORT}"

  # Run some veyron services for demo and integration testing.
  local -r BINARYDLOG="${TMPDIR}/binaryd.log"
  touch "${BINARYDLOG}"
  (
    ./binaryd --name="binaryd" &> "${BINARYDLOG}" ||
    common::fail "Failed to run binaryd" "${BINARYDLOG}"
  ) &

  local -r BUILDDLOG="${TMPDIR}/buildd.log"
  touch "${BUILDDLOG}"
  (
    ./buildd --name="buildd" &> "${BUILDDLOG}" ||
    common::fail "Failed to run buildd" "${BUILDDLOG}"
  ) &

  local -r SAMPLEDLOG="${TMPDIR}/sampled.log"
  touch "${SAMPLEDLOG}"
  (
    ./sampled &> "${SAMPLEDLOG}" ||
    common::fail "Failed to run sampled" "${SAMPLEDLOG}"
  ) &
}
