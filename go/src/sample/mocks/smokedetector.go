package mocks

import (
	"veyron2/ipc"
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

// Status retrieves the current status of the SmokeDetector (i.e., detecting, not detecting)
func (s *smokeDetector) Status(ipc.ServerContext) (string, error) {
	return s.status, nil
}

// Test the SmokeDetector to check if it is working.
func (s *smokeDetector) Test(ipc.ServerContext) (bool, error) {
	return true, nil
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
