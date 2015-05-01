// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = RoboDog;

// List of RoboDog constants
var HUNGER_DELAY = 60000; // hunger worsens every 60s

var MOOD_DELAY_BASE = 40000; // mood worsens every 40s to 85s
var MOOD_DELAY_SCALING = 7500;

var EAT_DELAY = 500; // dog's eating progress updates every 0.5s
var EAT_SPEED = 0.02; // dog eats 0.02 of the dog bowl every interval
var HUNGER_BAND = 0.2; // hunger improves in increments of 0.2

var PLAY_MINIMUM = 3; // playtime must last at least 3s for mood to improve

// The dog's initial name.
var START_NAME = 'VDog';

// A low mood score is worse than high one.
var MIN_MOOD = 0;
var START_MOOD = 2;
var MAX_MOOD = 4;

// A low hunger score is worse than a high one.
var MIN_HUNGER = 0;
var START_HUNGER = 3;
var MAX_HUNGER = 6;

var moods = [
  ['angry', 'sullen', 'depressed'],
  ['bored', 'tired', 'unhappy'],
  ['content', 'at-ease', 'lazy'],
  ['happy', 'friendly', 'playful'],
  ['exuberant', 'loving', 'excited']
];

var responses = [
  ['*whine*', '*whimper*', '*growl*'],
  ['<ignores you>', '*bark*', '<turns away>'],
  ['<yawns>', '<pants>', '<looks at you>'],
  ['*playful bark*', '<lick>', '<wags tail>'],
  ['*<tackle hug>*', '<brushes up>', '*woof! woof!*']
];

var hungers = [
  'starving', 'famished', 'hungry', 'not hungry', 'satiated', 'full', 'bloated'
];

// RoboDog allows clients to play with a virtual robotic dog.
function RoboDog(feeder) {
  this.name = START_NAME;
  this.mood = START_MOOD;
  this.hunger = START_HUNGER;
  this.eating = false;
  this.feeder = feeder;

  hungerCycle(this);
  moodCycle(this);
  eatCycle(this);
}

RoboDog.prototype = new vdl.RoboDog();

// Status returns the state of the robotic dog.
RoboDog.prototype.status = function(context, serverCall) {
  var dogMoods = moods[this.mood];
  var dogMood = dogMoods[Math.floor(Math.random() * dogMoods.length)];
  return new vdl.RoboDogStatus({
    name: this.name,
    mood: dogMood,
    hunger: hungers[this.hunger],
    eating: this.eating
  });
};

// Speak allows a client to speak with the robotic dog.
RoboDog.prototype.speak = function(context, serverCall, words) {
  // If dog is eating, the dog cannot listen or respond.
  if (this.eating) {
    return '*munch* *munch*';
  }

  // Secret: If the dog's name was spoken, mood improves!
  if (words.indexOf(this.name) !== -1) {
    changeMood(this, 1);
  }

  // The dog's respondse depends on mood.
  return respond(this);
};

// Play allows a client to play with the robotic dog.
// Errors if the dog does not want to play.
RoboDog.prototype.play = function(context, serverCall, duration, cb) {
  if (this.eating) {
    cb(new Error(this.name + ' is busy eating right now.'));
  } else if (this.mood === MIN_MOOD) {
    cb(new Error(this.name + ' is in a bad mood; try speaking its name.'));
  }

  // Delay for a while... and mood improves!
  var self = this;
  setTimeout(function() {
    if (duration > PLAY_MINIMUM) {
      changeMood(self, 1);
    }
    cb(null);
  }, duration * 1000);
};

// SetName allows a client to set the robotic dog's name.
RoboDog.prototype.setName = function(context, serverCall, name) {
  this.name = name;
};

// Helper to emulate the dog's hunger cycle.
function hungerCycle(r) {
  setInterval(function() {
    changeHunger(r, -1);
  }, HUNGER_DELAY);
}

// Helper to emulate the dog's mood cycle.
function moodCycle(r) {
  var delay = MOOD_DELAY_BASE + MOOD_DELAY_SCALING * r.hunger;
  setTimeout(function() {
    changeMood(r, -1);
    moodCycle(r);
  }, delay);
}

// Helper to emulate the dog's eating cycle.
function eatCycle(r) {
  var eaten = 0;

  // Check in on the dog at intervals to update the amount eaten.
  setInterval(function() {
    // If the dog is eating, empty the feeder by the same amount.
    if (r.eating) {
      var eat = Math.min(r.feeder.state, EAT_SPEED);
      r.feeder.state -= eat;
      eaten += eat;

      if (eaten >= HUNGER_BAND) {
        eaten -= HUNGER_BAND;
        changeHunger(r, 1);
      }
    }

    // Eat if there's any food and hunger is not at max.
    r.eating = (r.feeder.state > 0 && r.hunger !== MAX_HUNGER);
  }, EAT_DELAY);
}

// Helper to pick a random response based on the dog's mood.
function respond(r) {
  var responseList = responses[r.mood];
  return responseList[Math.floor(Math.random() * responseList.length)];
}

// Helper to change the dog's mood.
function changeMood(r, amount) {
  r.mood += amount;
  if (r.mood > MAX_MOOD) {
    r.mood = MAX_MOOD;
  } else if (r.mood < MIN_MOOD) {
    r.mood = MIN_MOOD;
  }
}

// Helper to change the dog's hunger.
function changeHunger(r, amount) {
  r.hunger += amount;
  if (r.hunger > MAX_HUNGER) {
    r.hunger = MAX_HUNGER;
  } else if (r.hunger < MIN_HUNGER) {
    r.hunger = MIN_HUNGER;
  }
}