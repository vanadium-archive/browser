#!/bin/bash

# This script exports a common::run function which builds
# and runs mounttables and other daemons needed to run and
# test the Veyron Browser.
# The ports on which to run these services should be passed
# as arguments to the function.
# This script shuts down these services on exit.
# TODO(aghassemi) This script is becoming too complicated and
# big for shell scripting, switch to a JavaScript or Go implementation

source "${VEYRON_ROOT}/scripts/lib/shell.sh"

trap 'terminate force' INT TERM
trap 'terminate' EXIT

# PIDS is a file that keeps track of PIDS of spawned services (one PID per line).
PIDS=$(shell::tmp_file)

# TERMINATING is a file that keeps track of whether we are in the the middle of terminating the script.
TERMINATING=$(shell::tmp_file)
echo "false" > "${TERMINATING}"

# We use temporary files to keep track if PIDs since subshells are isolated and
# can not access variables in parent's scope and we like to run services in subshells
# so we can easily track if they have exited or not.


# terminate is automatically called when receiving a signal or can be manually
# called from other functions to exit the script
# The string 'force' can be provided as the first argument to indicate whether
# we should kill the process and exit with an non-zero error code instead of
# the default behavior which is to wait for termination and exit with exit code 0
terminate() {
  # Indicate that we are terminating, reset the trap so it won't get called again and
  # throw out further output.
  echo "true" > "${TERMINATING}"
  trap - EXIT INT TERM
  exec &> /dev/null

  # Kill all the spawned processes.
  while read ID; do
    kill -KILL "${ID}" || true
  done < "${PIDS}"

  wait
  shell::at_exit

  # Exit successfully or terminate.
  local -r FORCE="${1-}"
  if [[ "${FORCE}" = "force" ]]; then
    kill -KILL $$ || true
  else
    exit 0
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

  echo -e "\033[91m\033[1mFAIL ${MESSAGE}\033[0m"

  if [[ -e "${LOG_FILE}" ]]; then
    cat "${LOG_FILE}"
  fi

  terminate force
}

# fail_on_exit will call common::fail when the PID given as the first argument exits abruptly.
# (e.g. not being terminated by the scripts itself)
# It practically ensures if a service fails to start or crash during the run, we are notified.
fail_on_exit() {
  # Temporarily ignore stderr or we will see messages like "Killed xxx" when a service
  # is terminated by our script at the end.
  exec 6>&2 2>/dev/null

  local -r PID="$1"
  local -r NAME="$2"
  local -r LOGFILE="$3"

  # Keep the PID so we can shut down the service later on exit.
  echo "${PID}" >> "${PIDS}"

  # Ensure the service is still running.
  while [ -d "/proc/${PID}" ]
  do
    sleep 0.5
  done

  # Service no longer running.
  # Ignore if we are already terminating, this is necessary to differentiate between
  # a process exiting/not starting during the run vs. being shutdown by the script itself.
  if [[ $(cat ${TERMINATING}) = true ]] ; then
    return
  fi

  # Re-enable stderr and fail.
  exec 2>&6
  common::fail "${NAME} service did not start or crashed, see log below for details" "${LOGFILE}"
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

  # Get an identity
  if [[ "${SEEK_BLESSSING}" = true ]]; then
    if [[ ! -f "${IDENTITY_PATH}" ]] || [[ ! -s "${IDENTITY_PATH}" ]]; then
      ./identity seekblessing > "${IDENTITY_PATH}"
    fi
  else
    ./identity generate > "${IDENTITY_PATH}"
  fi

  export VEYRON_IDENTITY="${IDENTITY_PATH}";

  # Run each server in a sub shell so we can call common::fail if process fails to start
  # or panics as it is running.

  # Run mounttables.
  local -r ROOT_MTLOG="${TMPDIR}/mt_root.log"
  local -r MTLOG_MESSAGE="Mount table service at"
  cat /dev/null > "${ROOT_MTLOG}"
  (
    ./mounttabled --address=:"${ROOT_MOUNTTABLE_PORT}" &> "${ROOT_MTLOG}" &
    fail_on_exit $! "root mounttable" "${ROOT_MTLOG}"
  ) &
  shell::wait_for "${ROOT_MTLOG}" "${MTLOG_MESSAGE}"

  export NAMESPACE_ROOT=/localhost:"${ROOT_MOUNTTABLE_PORT}";

  local -r HOUSE_MTLOG="${TMPDIR}/mt_house.log"
  cat /dev/null > "${HOUSE_MTLOG}"
  (
    ./mounttabled --address=:"${HOUSE_MOUNTTABLE_PORT}" --name="house" &> "${HOUSE_MTLOG}" &
    fail_on_exit $! "house mounttable" "${HOUSE_MTLOG}"
  ) &
  shell::wait_for "${HOUSE_MTLOG}" "${MTLOG_MESSAGE}"

  local -r COTTAGE_MTLOG="${TMPDIR}/mt_cottage.log"
  cat /dev/null > "${COTTAGE_MTLOG}"
  (
    ./mounttabled --address=:"${COTTAGE_MOUNTTABLE_PORT}" --name="cottage" &> "${COTTAGE_MTLOG}" &
    fail_on_exit $! "cottage mounttable" "${COTTAGE_MTLOG}"
  ) &
  shell::wait_for "${COTTAGE_MTLOG}" "${MTLOG_MESSAGE}"

  # Run proxies.
  local -r PROXYLOG="${TMPDIR}/proxy.log"
  cat /dev/null > "${PROXYLOG}"
  (
    ./proxyd --v=1 --http=":0" -address="${PROXY_ADDR}" &> "${PROXYLOG}" &
    fail_on_exit $! "proxy" "${PROXYLOG}"
  ) &
  shell::wait_for "${PROXYLOG}" "Proxy listening on"

  local -r WSPRLOG="${TMPDIR}/wspr.log"
  cat /dev/null > "${WSPRLOG}"
  (
    ./wsprd --v=1 --vproxy="${PROXY_ADDR}" --port="${WSPR_PORT}" --identd="${IDENTITY_SERVER}" &> "${WSPRLOG}" &
    fail_on_exit $! "wspr" "${WSPRLOG}"
  ) &
  shell::wait_for "${WSPRLOG}" "Listening on port ${WSPR_PORT}"

  # Run some veyron services for demo and integration testing.
  local -r BINARYDLOG="${TMPDIR}/binaryd.log"
  cat /dev/null > "${BINARYDLOG}"
  (
    ./binaryd --name="binaryd" &> "${BINARYDLOG}" &
    fail_on_exit $! "binaryd" "${BINARYDLOG}"
  ) &

  local -r BUILDDLOG="${TMPDIR}/buildd.log"
  cat /dev/null > "${BUILDDLOG}"
  (
    ./buildd --name="buildd" &> "${BUILDDLOG}" &
    fail_on_exit $! "buildd" "${BUILDDLOG}"
  ) &

  local -r SAMPLEDLOG="${TMPDIR}/sampled.log"
  cat /dev/null > "${SAMPLEDLOG}"
  (
    ./sampled &> "${SAMPLEDLOG}" &
    fail_on_exit $! "sampled" "${SAMPLEDLOG}"
  ) &
 }
