package mocks

import (
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
func (l *lightSwitch) Status(rpc.ServerCall) (string, error) {
	return l.status, nil
}

// FlipSwitch sets the light to on or off, depending on the input.
func (l *lightSwitch) FlipSwitch(_ rpc.ServerCall, toOn bool) error {
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
