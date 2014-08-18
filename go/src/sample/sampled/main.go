package main

import (
	"fmt"
	"log"

	"sample/generated/sample"
	"sample/mocks"
	"veyron/lib/signals"
	"veyron2/ipc"
	"veyron2/rt"
)

func main() {
	// Create the runtime
	r := rt.Init()

	// Create bunch of server stubs
	alarmServ := sample.NewServerAlarm(mocks.NewAlarm())
	poolHeaterServ := sample.NewServerPoolHeater(mocks.NewPoolHeater())
	smokeDetectorServ := sample.NewServerSmokeDetector(mocks.NewSmokeDetector())
	speakerServ := sample.NewServerSpeaker(mocks.NewSpeaker())
	sprinklerServ := sample.NewServerSprinkler(mocks.NewSprinkler())

	// Create new server and publish the given server under the given name
	var listenAndServe = func(name string, server interface{}) {

		// Create a new server instance.
		s, err := r.NewServer()
		if err != nil {
			log.Fatal("failure creating server: ", err)
		}

		// Create an endpoint and begin listening.
		if endpoint, err := s.Listen("tcp", "127.0.0.1:0"); err == nil {
			fmt.Printf("Listening at: %v\n", endpoint)
		} else {
			log.Fatal("error listening to service: ", err)
		}

		// Serve these services at multiple names
		if err := s.Serve(name, ipc.SoloDispatcher(server, nil)); err != nil {
			log.Fatal("error serving service: ", err)
		}

	}

	// Serve bunch of mock services under different names
	listenAndServe("house/alarm", alarmServ)
	listenAndServe("house/living-room/smoke-detector", smokeDetectorServ)
	listenAndServe("house/living-room/blast-speaker", speakerServ)
	listenAndServe("house/living-room/soundbar", speakerServ)
	listenAndServe("house/master-bedroom/smoke-detector", smokeDetectorServ)
	listenAndServe("house/master-bedroom/speaker", speakerServ)
	listenAndServe("house/kitchen/smoke-detector", smokeDetectorServ)

	listenAndServe("cottage/smoke-detector", smokeDetectorServ)
	listenAndServe("cottage/alarm", alarmServ)
	listenAndServe("cottage/pool/heater", poolHeaterServ)
	listenAndServe("cottage/pool/speaker", speakerServ)
	listenAndServe("cottage/lawn/front/sprinkler", sprinklerServ)
	listenAndServe("cottage/lawn/back/sprinkler", sprinklerServ)
	listenAndServe("cottage/lawn/master-sprinkler", sprinklerServ)

	// Wait forever.
	<-signals.ShutdownOnSignals()
}
