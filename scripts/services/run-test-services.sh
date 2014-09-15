#!/bin/bash

# TODO(aghassemi) The need have a run-test-services.sh is temporary. We need to reuse or
# at least take a similar approach as https://veyron-review.googlesource.com/#/c/4316 for veyron.js
# when that CL is finalized
VEYRON_MOUNTTABLE_PORT=8881
VEYRON_MOUNTTABLE_PORT_HOUSE=8882
VEYRON_MOUNTTABLE_PORT_COTTAGE=8883
VEYRON_STORE_PORT=8884
VEYRON_WSPR_PORT=8885

VEYRON_IDENTITY_PATH="{$TMPDIR-/tmp}/veyron_browser_test_identity"

# Get an identity if we don't have one yet.
if [ ! -f "${VEYRON_IDENTITY_PATH}" ]; then
  identity generate > "${VEYRON_IDENTITY_PATH}"
fi

source "${BASH_SOURCE%/*}/run-common.sh"

wait
