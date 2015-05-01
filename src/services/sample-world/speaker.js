// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = Speaker;

var DEFAULT_VOLUME = 10;
var DEFAULT_SONGS = new Set(['Happy Birthday', 'Never Gonna Give You Up']);

// Speaker allows clients to control the music being played.
function Speaker() {
  this.playing = false;
  this.volume = DEFAULT_VOLUME;
  this.speakerLibrary = DEFAULT_SONGS;
  this.currentSong = null;
}

Speaker.prototype = new vdl.Speaker();

// Play starts or continues the current song.
Speaker.prototype.play = function(context, serverCall) {
  if (this.currentSong === null) {
    throw new Error('no current song');
  }
  this.playing = true;
};

// PlaySong plays back the given song title, if possible.
Speaker.prototype.playSong = function(context, serverCall, title) {
  if (!this.speakerLibrary.has(title)) {
    throw new Error(title + ' does not exist');
  }
  this.currentSong = title;
  this.playing = true;
};

// PlayStream plays the given stream of music data.
Speaker.prototype.playStream = function(context, serverCall) {
  // Note: Not truly implemented, since this should open a stream.
  this.currentSong = null;
  this.playing = true;
};

// GetSong retrieves the title of the Speaker's current song, if any.
Speaker.prototype.getSong = function(context, serverCall) {
  return this.currentSong;
};

// Pause playback of the Speaker's current song.
Speaker.prototype.pause = function(context, serverCall) {
  this.playing = false;
};

// Stop playback of the Speaker's current song.
Speaker.prototype.stop = function(context, serverCall) {
  this.currentSong = null;
  this.playing = false;
};

// Volume adjusts the Speaker's volume.
Speaker.prototype.volume = function(context, serverCall, volume) {
  this.volume = volume;
};

// GetVolume retrieves the Speaker's volume.
Speaker.prototype.getVolume = function(context, serverCall) {
  return this.volume;
};

// AddSongs adds the list of given songs to the song library.
Speaker.prototype.addSongs = function(context, serverCall, songs) {
  songs.forEach(function(song) {
    this.speakerLibrary.add(song); // No-op if the song is already there.
  });
};

// Delete removes the list of given songs from the song library.
Speaker.prototype.delete = function(context, serverCall, songs) {
  songs.forEach(function(song) {
    this.speakerLibrary.delete(song);
    if (this.currentSong === song) {
      this.currentSong = null;
      this.playing = false;
    }
  });
};