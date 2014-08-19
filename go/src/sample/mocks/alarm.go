package mocks

import (
	"fmt"
	"time"

	"veyron2/ipc"
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
func (a *alarm) Status(ipc.ServerContext) (string, error) {
	return a.status, nil
}

// Arm sets the Alarm to the armed state
func (a *alarm) Arm(ipc.ServerContext) error {
	a.status = alarmArmed
	return nil
}

// DelayArm sets the Alarm to the armed state after the given delay in seconds.
func (a *alarm) DelayArm(_ ipc.ServerContext, delay uint16) error {
	d, err := time.ParseDuration(fmt.Sprintf("%ds", delay))
	if err != nil {
		return fmt.Errorf("%s could not parse delay %d", err, delay)
	}
	time.AfterFunc(d, func() {
		a.status = alarmArmed
	})
	return nil
}

// Unarm sets the Alarm to the unarmed state.
func (a *alarm) Unarm(ipc.ServerContext) error {
	a.status = alarmUnarmed
	return nil
}

// Panic sets the Alarm to the panicking state.
func (a *alarm) Panic(ipc.ServerContext) error {
	a.status = alarmPanicking
	return nil
}

// NewAlarm creates a new alarm stub.
func NewAlarm() *alarm {
	return &alarm{status: alarmUnarmed}
}
