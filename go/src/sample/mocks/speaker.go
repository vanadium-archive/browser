package mocks

import (
	"errors"
	"fmt"

	"sample"
	"v.io/v23/ipc"
)

const speakerDefaultVolume = uint16(10)

// Speaker allows clients to control the music being played.
type speaker struct {
	currentSong    string
	playing        bool
	volume         uint16
	speakerLibrary map[string]bool
}

// Play starts or continues the current song.
func (s *speaker) Play(ipc.ServerCall) error {
	if s.currentSong == "" {
		return errors.New("no current song")
	}
	s.playing = true
	return nil
}

// PlaySong plays back the given song title, if possible.
func (s *speaker) PlaySong(_ ipc.ServerCall, title string) error {
	if !s.speakerLibrary[title] {
		return errors.New(fmt.Sprintf("%q does not exist", title))
	}
	s.currentSong = title
	s.playing = true
	return nil
}

// PlayStream plays the given stream of music data.
func (s *speaker) PlayStream(sample.SpeakerPlayStreamServerCall) error {
	s.currentSong = ""
	s.playing = true
	return nil
}

// GetSong retrieves the title of the Speaker's current song, if any.
func (s *speaker) GetSong(ipc.ServerCall) (string, error) {
	return s.currentSong, nil
}

// Pause playback of the Speaker's current song.
func (s *speaker) Pause(ipc.ServerCall) error {
	s.playing = false
	return nil
}

// Stop playback of the Speaker's current song.
func (s *speaker) Stop(ipc.ServerCall) error {
	s.currentSong = ""
	s.playing = false
	return nil
}

// Volume adjusts the Speaker's volume.
func (s *speaker) Volume(_ ipc.ServerCall, volume uint16) error {
	s.volume = volume
	return nil
}

// GetVolume retrieves the Speaker's volume.
func (s *speaker) GetVolume(ipc.ServerCall) (uint16, error) {
	return s.volume, nil
}

// AddSongs adds the list of given songs to the song library.
func (s *speaker) AddSongs(_ ipc.ServerCall, songs []string) error {
	for _, song := range songs {
		s.speakerLibrary[song] = true // No-op if the song is there.
	}
	return nil
}

// Delete removes the list of given songs from the song library.
func (s *speaker) Delete(_ ipc.ServerCall, songs []string) error {
	for _, song := range songs {
		delete(s.speakerLibrary, song) // No-op if the song isn't there.
		if s.currentSong == song {     // Stop playing the current song if it was removed.
			s.currentSong = ""
			s.playing = false
		}
	}
	return nil
}

// NewSpeaker creates a new speaker stub.
func NewSpeaker() *speaker {
	return &speaker{
		playing: false,
		volume:  speakerDefaultVolume,
		speakerLibrary: map[string]bool{ // Start with some default songs.
			"Happy Birthday":          true,
			"Never Gonna Give You Up": true,
		},
	}
}
