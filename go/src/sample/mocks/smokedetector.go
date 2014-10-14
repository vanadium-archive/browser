package mocks

import (
	"time"
	"veyron.io/veyron/veyron2/ipc"
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
func (s *smokeDetector) Status(ipc.ServerContext) (status string, sensitivity int16, err error) {
	return s.status, s.sensitivity, nil
}

// Test the SmokeDetector to check if it is working.
func (s *smokeDetector) Test(ipc.ServerContext) (bool, error) {
	success := s.sensitivity > 0        // succeed only if sensitivity is positive
	time.Sleep(1500 * time.Millisecond) // simulate testing for 1.5 seconds
	return success, nil
}

// Sensitivity adjusts the SmokeDetector's sensitivity to smoke.
func (s *smokeDetector) Sensitivity(_ ipc.ServerContext, sensitivity int16) error {
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
