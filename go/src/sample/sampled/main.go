package main

import (
	"sample/sampleworld"

	"v.io/v23"
	_ "v.io/x/ref/profiles/static"
)

func main() {
	ctx, shutdown := v23.Init()
	defer shutdown()

	sampleworld.RunSampleWorld(ctx)
}
