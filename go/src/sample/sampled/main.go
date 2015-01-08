package main

import (
	"fmt"
	"log"

	"sample"
	"sample/mocks"

	"v.io/core/veyron/lib/signals"
	"v.io/core/veyron/profiles"
	_ "v.io/core/veyron/profiles"
	"v.io/core/veyron2/rt"
	"v.io/core/veyron2/security"
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

// openAuthorizer allows RPCs from all clients.
// TODO(aghassemi): Write a more strict authorizer with proper ACLs and
// identity setup
type openAuthorizer struct{}

func (o openAuthorizer) Authorize(_ security.Context) error {
	return nil
}

func main() {
	// Create the runtime
	r, err := rt.New()
	if err != nil {
		log.Fatal("Could not initialize runtime: ", err)
	}
	defer r.Cleanup()

	ctx := r.NewContext()

	// Create new server and publish the given server under the given name
	var listenAndServe = func(name string, server interface{}) func() {

		// Create a new server instance.
		s, err := r.NewServer()
		if err != nil {
			log.Fatal("failure creating server: ", err)
		}

		// Create an endpoint and begin listening.
		if endpoint, err := s.Listen(profiles.LocalListenSpec); err == nil {
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

	defer listenAndServe("cottage/smoke-detector", makeServerSmokeDetector())()
	defer listenAndServe("cottage/alarm", makeServerAlarm())()
	defer listenAndServe("cottage/lights", makeServerLightSwitch())()
	defer listenAndServe("cottage/pool/heater", makeServerPoolHeater())()
	defer listenAndServe("cottage/pool/speaker", makeServerSpeaker())()
	defer listenAndServe("cottage/pool/pool-lights", makeServerLightSwitch())()
	defer listenAndServe("cottage/lawn/front/sprinkler", makeServerSprinkler())()
	defer listenAndServe("cottage/lawn/back/sprinkler", makeServerSprinkler())()
	defer listenAndServe("cottage/lawn/master-sprinkler", makeServerSprinkler())()

	// Wait forever.
	<-signals.ShutdownOnSignals(ctx)
}
