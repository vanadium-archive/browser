// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package mocks

import (
	"v.io/v23/context"
	"v.io/v23/rpc"
)

const (
	// Light Switch status constants
	lightSwitchOn  = "on"
	lightSwitchOff = "off"
)

// LightSwitch allows clients to manipulate a virtual light switch.
type lightSwitch struct {
	status string
}

// Status indicates whether the light is on or off.
func (l *lightSwitch) Status(*context.T, rpc.ServerCall) (string, error) {
	return l.status, nil
}

// FlipSwitch sets the light to on or off, depending on the input.
func (l *lightSwitch) FlipSwitch(_ *context.T, _ rpc.ServerCall, toOn bool) error {
	if toOn {
		l.status = lightSwitchOn
	} else {
		l.status = lightSwitchOff
	}
	return nil
}

// NewLightSwitch creates a new light switch stub.
func NewLightSwitch() *lightSwitch {
	return &lightSwitch{
		status: lightSwitchOff,
	}
}
