// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package mocks

import (
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"v.io/v23/rpc"
	"v.io/x/browser/sample"
)

const (
	// Pet Feeder limits
	MIN_FILL = 0.0
	MAX_FILL = 1.0

	HUNGER_DELAY = 60000 // hunger worsens every 60s

	MOOD_DELAY_BASE    = 40000 // mood worsens every 40s to 85s
	MOOD_DELAY_SCALING = 7500

	EAT_DELAY   = 500  // dog eating progress updates every 0.5s
	EAT_SPEED   = 0.02 // eats 0.02 of the dog bowl every interval
	HUNGER_BAND = 0.2  // upon eating 0.2 of the dog bowl, hunger improves

	PLAY_MINIMUM = 3 // playtime lasts at least 3s for mood to improve

	MIN_MOOD   = 0
	START_MOOD = 2
	MAX_MOOD   = 4

	MIN_HUNGER   = 0
	START_HUNGER = 3
	MAX_HUNGER   = 6
)

var (
	// Dog mood strings
	moods = [][]string{
		{"angry", "sullen", "depressed"},
		{"bored", "tired", "unhappy"},
		{"content", "at-ease", "lazy"},
		{"happy", "friendly", "playful"},
		{"exuberant", "loving", "excited"},
	}
	responses = [][]string{
		{"*whine*", "*whimper*", "*growl*"},
		{"<ignores you>", "*bark*", "<turns away>"},
		{"<yawns>", "<pants>", "<looks at you>"},
		{"*playful bark*", "<lick>", "<wags tail>"},
		{"*<tackle hug>*", "<brushes up>", "*woof! woof!*"},
	}
	// Dog hunger strings
	hungers = []string{
		"starving", "famished", "hungry", "not hungry", "satiated", "full", "bloated",
	}
)

// PetFeeder allows clients to remotely feed their pets.
type PetFeeder struct {
	status float64
}

// NewPetFeeder creates a new PetFeeder stub.
func NewPetFeeder() *PetFeeder {
	return &PetFeeder{status: MIN_FILL}
}

// Status returns the current status of the Pet Feeder
func (p *PetFeeder) Status(rpc.ServerCall) (float64, error) {
	return p.status, nil
}

// Fill fills the pet feeder bowl with food. Errors if the bowl will overflow.
func (p *PetFeeder) Fill(_ rpc.ServerCall, amount float64) error {
	if p.status+amount > MAX_FILL {
		p.status = MAX_FILL
		return fmt.Errorf("pet feeder overflowed")
	}
	p.status += amount
	return nil
}

// Empty removes all food from the pet feeder bowl.
func (p *PetFeeder) Empty(rpc.ServerCall) error {
	p.status = MIN_FILL
	return nil
}

// RoboDog allows clients to play with a virtual robotic dog.
type RoboDog struct {
	name   string     // the dog's current name
	mood   int        // mood improves when played with and not hungry
	hunger int        // hunger worsens over time. Improves while eating.
	eating bool       // the dog is busy while eating.
	feeder *PetFeeder // The PetFeeder that this dog is linked to.
}

// NewRoboDog creates a new RoboDog stub.
func NewRoboDog(p *PetFeeder) *RoboDog {
	r := &RoboDog{
		name:   "VDog",
		mood:   START_MOOD,
		hunger: START_HUNGER,
		eating: false,
		feeder: p,
	}

	// Make the dog hungrier and hungrier.
	// Worsen the dog's mood over time. Faster when dog is hungrier.
	// If available, slowly eat from the feeder and improve hunger.
	// But I need a way to signal that these things should stop...
	// defer could catch this during cleanup, but is it even really necessary?
	// Also, I don't care about race conditions.
	go r.hungerCycle()
	go r.moodCycle()
	go r.eatCycle()

	return r
}

// Helper goroutine to emulate the dog's hunger cycle.
func (r *RoboDog) hungerCycle() {
	for {
		// Delay for a while... hunger worsens!
		time.Sleep(HUNGER_DELAY * time.Millisecond)
		r.changeHunger(-1)
	}
}

// Helper goroutine to emulate the dog's mood cycle.
func (r *RoboDog) moodCycle() {
	for {
		// Delay for a while... mood worsens!
		// Delay is longer when the dog is less hungry.
		delay := MOOD_DELAY_BASE + MOOD_DELAY_SCALING*r.hunger
		time.Sleep(time.Duration(delay) * time.Millisecond)
		r.changeMood(-1)
	}
}

// Helper goroutine to emulate the dog's eating cycle.
func (r *RoboDog) eatCycle() {
	var eaten float64
	for {
		// Check in on the dog at intervals.
		time.Sleep(EAT_DELAY * time.Millisecond)

		// If the dog is eating, empty the feeder by the same amount.
		if r.eating {
			eat := math.Min(r.feeder.status, EAT_SPEED)
			r.feeder.status -= eat
			eaten += eat
			if eaten >= HUNGER_BAND {
				eaten -= HUNGER_BAND
				r.changeHunger(1)
			}
		}

		// Eat if there's any food and hunger is not at max.
		r.eating = (r.feeder.status != MIN_FILL && r.hunger != MAX_HUNGER)
	}
}

func (r *RoboDog) Status(rpc.ServerCall) (sample.RoboDogStatus, error) {
	dogMoods := moods[r.mood]
	dogMood := dogMoods[rand.Intn(len(dogMoods))] // pick a random mood
	dogHunger := hungers[r.hunger]
	return sample.RoboDogStatus{
		r.name,
		dogMood,
		dogHunger,
		r.eating,
	}, nil
}

// Speak allows a client to speak with the robotic dog.
func (r *RoboDog) Speak(call rpc.ServerCall, words string) (string, error) {
	// If dog is eating, the dog cannot listen or respond.
	if r.eating {
		return "*munch* *munch*", nil
	}

	// Secret: If dog's name was spoken. Mood up!
	if strings.Contains(strings.ToLower(words), strings.ToLower(r.name)) {
		r.changeMood(1)
	}

	// The dog's response depends on mood.
	return r.respond(), nil
}

// Play allows a client to play with the robotic dog.
// Errors if the dog does not want to play.
func (r *RoboDog) Play(_ rpc.ServerCall, duration uint32) error {
	if r.eating {
		return fmt.Errorf("%s is busy eating now", r.name)
	} else if r.mood == MIN_MOOD {
		return fmt.Errorf("%s is in a bad mood", r.name)
	}

	// Delay for a while... mood improves!
	time.Sleep(time.Duration(duration) * time.Second)
	if duration >= PLAY_MINIMUM {
		r.changeMood(1)
	}

	return nil
}

// SetName allows a client to set the robotic dog's name.
func (r *RoboDog) SetName(_ rpc.ServerCall, name string) error {
	r.name = name
	return nil
}

// Helper to pick a random response based on the dog's mood.
func (r *RoboDog) respond() string {
	responseList := responses[r.mood]
	return responseList[rand.Intn(len(responseList))] // pick a random response
}

// Helper to change the dog's mood.
func (r *RoboDog) changeMood(amount int) {
	r.mood += amount
	// Do not overflow on mood.
	if r.mood > MAX_MOOD {
		r.mood = MAX_MOOD
	} else if r.mood < MIN_MOOD {
		r.mood = MIN_MOOD
	}
}

// Helper to change the dog's hunger.
func (r *RoboDog) changeHunger(amount int) {
	r.hunger += amount
	// Do not overflow on hunger.
	if r.hunger > MAX_HUNGER {
		r.hunger = MAX_HUNGER
	} else if r.hunger < MIN_HUNGER {
		r.hunger = MIN_HUNGER
	}
}
