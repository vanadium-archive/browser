package mocks

import (
	"errors"

	"veyron2/ipc"
)

type poolHeater struct{}

func (_ poolHeater) Start(_ ipc.ServerContext, _ uint64, _ uint64) error {
	return errors.New("not implemented")
}

func (_ poolHeater) Stop(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func NewPoolHeater() poolHeater {
	return poolHeater{}
}
