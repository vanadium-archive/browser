// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"v.io/v23"
	"v.io/x/browser/sample/sampleworld"
	_ "v.io/x/ref/profiles/static"
)

func main() {
	ctx, shutdown := v23.Init()
	defer shutdown()

	sampleworld.RunSampleWorld(ctx)
}
