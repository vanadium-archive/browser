package mocks

import (
	"errors"

	"veyron2/ipc"
)

type alarm struct{}

func (_ alarm) Status(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ alarm) Arm(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ alarm) DelayArm(_ ipc.ServerContext, _ uint16) error {
	return errors.New("not implemented")
}

func (_ alarm) Unarm(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ alarm) Panic(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func NewAlarm() alarm {
	return alarm{}
}
