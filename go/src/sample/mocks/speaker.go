package mocks

import (
	"errors"
	"fmt"
	"sample/generated/sample"
	"veyron2/ipc"
)

const speakerDefaultVolume = uint16(10)

// Prepopulate the music library with a few songs
var speakerLibrary = map[string]bool{
	"Happy Birthday":          true,
	"Never Gonna Give You Up": true,
}

// Speaker allows clients to control the music being played.
type speaker struct {
	currentSong string
	playing     bool
	volume      uint16
}

// Play starts or continues the current song.
func (s *speaker) Play(ipc.ServerContext) error {
	if s.currentSong == "" {
		return errors.New("no current song")
	}
	s.playing = true
	return nil
}

// PlaySong plays back the given song title, if possible.
func (s *speaker) PlaySong(_ ipc.ServerContext, title string) error {
	if !speakerLibrary[title] {
		return errors.New(fmt.Sprintf("%q does not exist", title))
	}
	s.currentSong = title
	s.playing = true
	return nil
}

// PlayStream plays the given stream of music data.
func (s *speaker) PlayStream(_ ipc.ServerContext, stream sample.SpeakerServicePlayStreamStream) error {
	s.currentSong = ""
	s.playing = true
	return nil
}

// GetSong retrieves the title of the Speaker's current song, if any.
func (s *speaker) GetSong(ipc.ServerContext) (string, error) {
	return s.currentSong, nil
}

// Pause playback of the Speaker's current song.
func (s *speaker) Pause(ipc.ServerContext) error {
	s.playing = false
	return nil
}

// Stop playback of the Speaker's current song.
func (s *speaker) Stop(ipc.ServerContext) error {
	s.currentSong = ""
	s.playing = false
	return nil
}

// Volume adjusts the Speaker's volume.
func (s *speaker) Volume(_ ipc.ServerContext, volume uint16) error {
	s.volume = volume
	return nil
}

// GetVolume retrieves the Speaker's volume.
func (s *speaker) GetVolume(ipc.ServerContext) (uint16, error) {
	return s.volume, nil
}

// NewSpeaker creates a new speaker stub.
func NewSpeaker() *speaker {
	return &speaker{
		playing: false,
		volume:  speakerDefaultVolume,
	}
}
