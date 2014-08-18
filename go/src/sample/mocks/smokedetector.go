package mocks

import (
	"errors"

	"veyron2/ipc"
)

type smokeDetector struct{}

func (_ smokeDetector) Status(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ smokeDetector) Test(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ smokeDetector) Sensitivity(_ ipc.ServerContext, _ int16) error {
	return errors.New("not implemented")
}

func NewSmokeDetector() smokeDetector {
	return smokeDetector{}
}
