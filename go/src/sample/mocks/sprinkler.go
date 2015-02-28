package mocks

import (
	"time"

	"v.io/v23/ipc"
)

const (
	// Sprinkler status constants
	sprinklerActive = "active"
	sprinklerIdle   = "idle"
)

// Sprinkler allows clients to control the virtual sprinkler.
type sprinkler struct {
	status string
}

// Status retrieves the Sprinkler's status (i.e., active, idle)
func (s *sprinkler) Status(ipc.ServerCall) (string, error) {
	return s.status, nil
}

// Start causes the Sprinkler to emit water for the given duration (in seconds).
func (s *sprinkler) Start(_ ipc.ServerCall, duration uint16) error {
	s.status = sprinklerActive
	time.AfterFunc(
		time.Duration(duration)*time.Second,
		func() { s.status = sprinklerIdle },
	)
	return nil
}

// Stop causes the Sprinkler to cease watering.
func (s *sprinkler) Stop(ipc.ServerCall) error {
	s.status = sprinklerIdle
	return nil
}

// NewSprinkler creates a new sprinkler stub.
func NewSprinkler() *sprinkler {
	return &sprinkler{
		status: sprinklerIdle,
	}
}
