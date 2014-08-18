package mocks

import (
	"errors"

	"veyron2/ipc"
)

type sprinkler struct{}

func (_ sprinkler) Start(_ ipc.ServerContext, _ uint16) error {
	return errors.New("not implemented")
}

func (_ sprinkler) Schedule(_ ipc.ServerContext, _ string, _ uint16) error {
	return errors.New("not implemented")
}

func (_ sprinkler) Stop(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func NewSprinkler() sprinkler {
	return sprinkler{}
}
