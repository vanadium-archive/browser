package main

import (
	"fmt"
	"log"

	"sample"
	"sample/mocks"

	"veyron.io/veyron/veyron/lib/signals"
	"veyron.io/veyron/veyron/profiles"
	_ "veyron.io/veyron/veyron/profiles"
	"veyron.io/veyron/veyron2/ipc"
	"veyron.io/veyron/veyron2/rt"
)

func makeServerAlarm() interface{} {
	return sample.NewServerAlarm(mocks.NewAlarm())
}
func makeServerLightSwitch() interface{} {
	return sample.NewServerLightSwitch(mocks.NewLightSwitch())
}
func makeServerPoolHeater() interface{} {
	return sample.NewServerPoolHeater(mocks.NewPoolHeater())
}
func makeServerSmokeDetector() interface{} {
	return sample.NewServerSmokeDetector(mocks.NewSmokeDetector())
}
func makeServerSpeaker() interface{} {
	return sample.NewServerSpeaker(mocks.NewSpeaker())
}
func makeServerSprinkler() interface{} {
	return sample.NewServerSprinkler(mocks.NewSprinkler())
}

func main() {
	// Create the runtime
	r := rt.Init()

	defer r.Cleanup()

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
		if err := s.ServeDispatcher(name, ipc.LeafDispatcher(server, nil)); err != nil {
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
	<-signals.ShutdownOnSignals()
}
