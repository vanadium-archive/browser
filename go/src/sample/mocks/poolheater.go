package mocks

import (
	"time"

	"veyron.io/veyron/veyron2/ipc"
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
func (p *poolHeater) Status(ipc.ServerContext) (status string, temperature uint64, err error) {
	return p.status, p.currTemperature, nil
}

// Start informs the PoolHeater to heat the pool to the given temperature until the duration expires.
func (p *poolHeater) Start(_ ipc.ServerContext, temperature uint64, duration uint64) error {
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
func (p *poolHeater) Stop(ipc.ServerContext) error {
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
