#!/bin/bash

# This script exports a common::run function which builds
# and runs mounttables and other daemons needed to run and
# test the Veyron Browser.
# The addresses on which to run these services should be passed
# as arguments to the function.
# This script shuts down these services on exit.
# TODO(aghassemi) This script is becoming too complicated and
# big for shell scripting, switch to a JavaScript or Go implementation

source "./shell.sh"

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
  while sleep 0.5; do
    ps -p "${PID}" &> /dev/null || break
  done

  # Service no longer running.
  # Ignore if we are already terminating, this is necessary to differentiate between
  # a process exiting/not starting during the run vs. being shutdown by the script itself.
  if [[ ! -e "${TERMINATING}" ]] || [[ $(cat ${TERMINATING}) = true ]]; then
    return
  fi

  # Re-enable stderr and fail.
  exec 2>&6
  common::fail "${NAME} service did not start or crashed, see log below for details" "${LOGFILE}"
}

common::run_mounttable() {
  local -r NAME="$1"
  local -r ADDRESS="$2"

  echo "Running ${NAME} mounttable on ${ADDRESS}"

  # Allowed seconds for each service to start
  local -r SRV_TIMEOUT=10
  local -r TIMEDOUT_MSG="Timed out waiting for:"

  # Run mounttable and wait for its startup signal.
  local -r MTLOG_MESSAGE="Mount table service at"
  local -r MTLOG="${TMPDIR}/mt_${NAME}.log"
  cat /dev/null > "${MTLOG}"
  (
    mounttabled --veyron.tcp.protocol=wsh --veyron.tcp.address="${ADDRESS}" --name="${NAME}" &> "${MTLOG}" &
    fail_on_exit $! "${NAME} mounttable" "${MTLOG}"
  ) &
  shell::timed_wait_for "${SRV_TIMEOUT}" "${MTLOG}" "${MTLOG_MESSAGE}" || common::fail "${TIMEDOUT_MSG} ${NAME} mounttable"
}

# common::run is used to run the services needed to test and demon veyron browser
# run will exit the shell if a process fails to start or panics and it will display
# an error message along with the log file for the misbehaving service.
common::run() {
  local -r HOUSE_MOUNTTABLE_ADDRESS="$1"
  local -r COTTAGE_MOUNTTABLE_ADDRESS="$2"
  local -r SAMPLED_ADDRESS="$3"

  # Run each server in a sub shell so we can call common::fail if process fails to start
  # or panics as it is running.

  common::run_mounttable "house" ${HOUSE_MOUNTTABLE_ADDRESS}
  common::run_mounttable "cottage" ${COTTAGE_MOUNTTABLE_ADDRESS}

  # Run sampled on a free port for demo and integration testing.
  local -r SAMPLEDLOG="${TMPDIR}/sampled.log"
  cat /dev/null > "${SAMPLEDLOG}"
  (
    sampled --veyron.tcp.protocol=wsh --veyron.tcp.address="${SAMPLED_ADDRESS}" &> "${SAMPLEDLOG}" &
    fail_on_exit $! "sampled" "${SAMPLEDLOG}"
  ) &
 }
