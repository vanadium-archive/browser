package mocks

import (
	"errors"
	"sample/generated/sample"
	"veyron2/ipc"
)

type speaker struct{}

func (_ speaker) PlaySong(_ ipc.ServerContext, _ string) error {
	return errors.New("not implemented")
}

func (_ speaker) PlayStream(_ ipc.ServerContext, _ sample.SpeakerServicePlayStreamStream) error {
	return errors.New("not implemented")
}

func (_ speaker) Pause(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ speaker) Stop(_ ipc.ServerContext) error {
	return errors.New("not implemented")
}

func (_ speaker) Volume(_ ipc.ServerContext, _ uint16) error {
	return errors.New("not implemented")
}

func NewSpeaker() speaker {
	return speaker{}
}
