// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package mocks

import (
	"time"

	"v.io/v23/context"
	"v.io/v23/rpc"
)

const (
	// Alarm status constants
	alarmPanicking = "panicking"
	alarmArmed     = "armed"
	alarmUnarmed   = "unarmed"
)

// Alarm allows clients to manipulate an alarm and query its status.
type alarm struct {
	status string
}

// Status returns the current status of the Alarm (i.e., armed, unarmed, panicking).
func (a *alarm) Status(*context.T, rpc.ServerCall) (string, error) {
	return a.status, nil
}

// Arm sets the Alarm to the armed state
func (a *alarm) Arm(*context.T, rpc.ServerCall) error {
	a.status = alarmArmed
	return nil
}

// DelayArm sets the Alarm to the armed state after the given delay in seconds.
func (a *alarm) DelayArm(_ *context.T, _ rpc.ServerCall, delay float32) error {
	time.AfterFunc(
		time.Duration(delay)*time.Second,
		func() {
			a.status = alarmArmed
		},
	)
	return nil
}

// Unarm sets the Alarm to the unarmed state.
func (a *alarm) Unarm(*context.T, rpc.ServerCall) error {
	a.status = alarmUnarmed
	return nil
}

// Panic sets the Alarm to the panicking state.
func (a *alarm) Panic(*context.T, rpc.ServerCall) error {
	a.status = alarmPanicking
	return nil
}

// NewAlarm creates a new alarm stub.
func NewAlarm() *alarm {
	return &alarm{status: alarmUnarmed}
}
