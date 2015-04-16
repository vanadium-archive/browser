// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package mocks

import (
	"time"

	"v.io/v23/context"
	"v.io/v23/rpc"
)

const (
	// Pool heater status constants
	poolHeaterActive = "active"
	poolHeaterIdle   = "idle"

	poolHeaterDefaultTemperature = 60
)

// PoolHeater allows clients to control when the pool is being heated.
type poolHeater struct {
	status          string
	currTemperature uint64
}

// Status retrieves the PoolHeater's status (i.e., active, idle) and temperature.
func (p *poolHeater) Status(*context.T, rpc.ServerCall) (status string, temperature uint64, err error) {
	return p.status, p.currTemperature, nil
}

// Start informs the PoolHeater to heat the pool to the given temperature until the duration expires.
func (p *poolHeater) Start(_ *context.T, _ rpc.ServerCall, temperature uint64, duration uint64) error {
	// Begin heating.
	p.status = poolHeaterActive
	p.currTemperature = temperature

	// After duration, stop heating.
	time.AfterFunc(
		time.Duration(duration)*time.Second,
		func() {
			p.status = poolHeaterIdle
			p.currTemperature = poolHeaterDefaultTemperature
		},
	)
	return nil
}

// Stop informs the PoolHeater to cease heating the pool.
func (p *poolHeater) Stop(*context.T, rpc.ServerCall) error {
	p.status = poolHeaterIdle
	p.currTemperature = poolHeaterDefaultTemperature
	return nil
}

// NewPoolHeater creates a new poolHeater stub.
func NewPoolHeater() *poolHeater {
	return &poolHeater{
		status:          poolHeaterIdle,
		currTemperature: poolHeaterDefaultTemperature,
	}
}
