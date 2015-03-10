package sampleworld

import (
	"fmt"
	"log"
	"time"

	"sample"
	"sample/mocks"

	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/security"
	"v.io/v23/services/security/access"
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

// openAuthorizer allows RPCs from all clients.
// TODO(aghassemi): Write a more strict authorizer with proper ACLs and
// identity setup
type openAuthorizer struct{}

func (o openAuthorizer) Authorize(_ security.Call) error {
	return nil
}

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

		// Serve these services at the given name.
		if err := s.Serve(name, server, openAuthorizer{}); err != nil {
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

	// Add bunch of inaccessible names
	var nobody = []security.BlessingPattern{""}
	var everybody = []security.BlessingPattern{"..."}
	var nobodyCanResolve = access.TaggedACLMap{
		"Resolve": access.ACL{
			In: nobody,
		},
		"Read": access.ACL{
			In: nobody,
		},
		"Admin": access.ACL{
			In: nobody,
		},
		"Create": access.ACL{
			In: nobody,
		},
		"Mount": access.ACL{
			In: everybody,
		},
	}
	var everybodyCanList = access.TaggedACLMap{
		"Resolve": access.ACL{
			In: everybody,
		},
		"Read": access.ACL{
			In: everybody,
		},
		"Admin": access.ACL{
			In: everybody,
		},
		"Create": access.ACL{
			In: everybody,
		},
		"Mount": access.ACL{
			In: everybody,
		},
	}

	ns := v23.GetNamespace(ctx)
	// Make everyone see stuff in house/master-bedroom/personal.
	ns.SetACL(ctx, "house/master-bedroom/personal", everybodyCanList, "")

	// Toothbrush is inaccessible because of bad endpoint.
	nextYear := time.Now().AddDate(1, 0, 0)
	ttl := nextYear.Sub(time.Now())
	ns.Mount(ctx, "house/master-bedroom/personal/toothbrush", "/does.not.exist.v.io:9898", ttl)

	// Hairbrush is inaccessible because of mounttable ACLs on it do not allow anyone to resolve the name.
	ns.SetACL(ctx, "house/master-bedroom/personal/hairbrush", nobodyCanResolve, "")
	defer listenAndServe("house/master-bedroom/personal/hairbrush", makeServerSprinkler())()

	// Wait forever.
	<-signals.ShutdownOnSignals(ctx)
}
