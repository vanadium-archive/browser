// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package sampleworld

import (
	"flag"
	"fmt"
	"log"

	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/naming"
	"v.io/v23/security"
	"v.io/v23/security/access"
	"v.io/x/browser/sample"
	"v.io/x/browser/sample/mocks"
	"v.io/x/ref/lib/signals"
)

func makeServerAlarm() interface{} {
	return sample.AlarmServer(mocks.NewAlarm())
}
func makeServerLightSwitch() interface{} {
	return sample.LightSwitchServer(mocks.NewLightSwitch())
}
func makeServerPoolHeater() interface{} {
	return sample.PoolHeaterServer(mocks.NewPoolHeater())
}
func makeServerSmokeDetector() interface{} {
	return sample.SmokeDetectorServer(mocks.NewSmokeDetector())
}
func makeServerSpeaker() interface{} {
	return sample.SpeakerServer(mocks.NewSpeaker())
}
func makeServerSprinkler() interface{} {
	return sample.SprinklerServer(mocks.NewSprinkler())
}
func makePetFeederAndRoboDog() (interface{}, interface{}) {
	p := mocks.NewPetFeeder()
	r := mocks.NewRoboDog(p)
	return sample.PetFeederServer(p), sample.RoboDogServer(r)
}

var (
	authorizedBlessingPattern = flag.String("authorize", string(security.AllPrincipals), "Blessing pattern that matches authorized users. By default all principals are authorized.")
	namePrefix                = flag.String("name", "", "Name prefix used to publish the sample world under.")
)

func RunSampleWorld(ctx *context.T) {

	// Create new server and publish the given server under the given name
	var listenAndServe = func(name string, server interface{}) func() {

		// Create a new server instance.
		s, err := v23.NewServer(ctx)
		if err != nil {
			log.Fatal("failure creating server: ", err)
		}

		// Create an endpoint and begin listening.
		if endpoint, err := s.Listen(v23.GetListenSpec(ctx)); err == nil {
			fmt.Printf("Listening at: %v\n", endpoint)
		} else {
			log.Fatal("error listening to service: ", err)
		}

		acl := access.AccessList{
			In: []security.BlessingPattern{
				security.BlessingPattern(*authorizedBlessingPattern),
			},
		}

		fullName := naming.Join(*namePrefix, name)

		// Serve these services at the given name.
		if err := s.Serve(fullName, server, acl); err != nil {
			log.Fatal("error serving service: ", err)
		}

		return func() {
			s.Stop()
		}
	}

	// Serve bunch of mock services under different names
	defer listenAndServe("house/alarm", makeServerAlarm())()
	defer listenAndServe("house/living-room/lights", makeServerLightSwitch())()
	defer listenAndServe("house/living-room/smoke-detector", makeServerSmokeDetector())()
	defer listenAndServe("house/living-room/blast-speaker", makeServerSpeaker())()
	defer listenAndServe("house/living-room/soundbar", makeServerSpeaker())()
	defer listenAndServe("house/master-bedroom/desk-lamp", makeServerLightSwitch())()
	defer listenAndServe("house/master-bedroom/lights", makeServerLightSwitch())()
	defer listenAndServe("house/master-bedroom/smoke-detector", makeServerSmokeDetector())()
	defer listenAndServe("house/master-bedroom/speaker", makeServerSpeaker())()
	defer listenAndServe("house/kitchen/lights", makeServerLightSwitch())()
	defer listenAndServe("house/kitchen/smoke-detector", makeServerSmokeDetector())()

	petfeeder, robodog := makePetFeederAndRoboDog()
	defer listenAndServe("house/pet-feeder", petfeeder)()
	defer listenAndServe("house/robo-dog", robodog)()

	defer listenAndServe("cottage/smoke-detector", makeServerSmokeDetector())()
	defer listenAndServe("cottage/alarm", makeServerAlarm())()
	defer listenAndServe("cottage/lights", makeServerLightSwitch())()
	defer listenAndServe("cottage/pool/heater", makeServerPoolHeater())()
	defer listenAndServe("cottage/pool/speaker", makeServerSpeaker())()
	defer listenAndServe("cottage/pool/pool-lights", makeServerLightSwitch())()
	defer listenAndServe("cottage/lawn/front/sprinkler", makeServerSprinkler())()
	defer listenAndServe("cottage/lawn/back/sprinkler", makeServerSprinkler())()
	defer listenAndServe("cottage/lawn/master-sprinkler", makeServerSprinkler())()

	var onlyMe = []security.BlessingPattern{"dev.v.io/root/users/me@example.com"}
	var everybody = []security.BlessingPattern{"..."}
	var nobodyCanList = access.Permissions{
		"Resolve": access.AccessList{
			In: onlyMe,
		},
		"Read": access.AccessList{
			In: everybody,
		},
		"Admin": access.AccessList{
			In: onlyMe,
		},
		"Create": access.AccessList{
			In: onlyMe,
		},
		"Mount": access.AccessList{
			In: onlyMe,
		},
	}
	ns := v23.GetNamespace(ctx)
	ns.SetPermissions(ctx, "house/kitchen/secret-pantry", nobodyCanList, "")
	// Wait forever.
	<-signals.ShutdownOnSignals(ctx)
}
