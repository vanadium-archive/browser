package mocks

import (
	"time"
	"v.io/v23/rpc"
)

const (
	// Smoke detector status constants
	smokeDetectorDetecting    = "smoky"
	smokeDetectorNotDetecting = "normal"

	smokeDetectorDefaultSensitivity = int16(10)
)

// SmokeDetector allows clients to monitor and adjust a smoke detector.
type smokeDetector struct {
	status      string
	sensitivity int16
}

// Status retrieves the current status and sensitivity of the SmokeDetector.
func (s *smokeDetector) Status(rpc.ServerCall) (status string, sensitivity int16, err error) {
	return s.status, s.sensitivity, nil
}

// Test the SmokeDetector to check if it is working.
func (s *smokeDetector) Test(rpc.ServerCall) (bool, error) {
	time.Sleep(1500 * time.Millisecond) // simulate testing for 1.5 seconds
	success := s.sensitivity > 0        // succeed only if sensitivity is positive
	return success, nil
}

// Sensitivity adjusts the SmokeDetector's sensitivity to smoke.
func (s *smokeDetector) Sensitivity(_ rpc.ServerCall, sensitivity int16) error {
	s.sensitivity = sensitivity
	return nil
}

// NewSmokeDetector creates a new smoke detector stub.
func NewSmokeDetector() *smokeDetector {
	return &smokeDetector{
		status:      smokeDetectorNotDetecting,
		sensitivity: smokeDetectorDefaultSensitivity,
	}
}
