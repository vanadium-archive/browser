// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
// Source: lightswitch.vdl

package sample

import (
	// VDL system imports
	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/rpc"
)

// LightSwitchClientMethods is the client interface
// containing LightSwitch methods.
//
// LightSwitch allows clients to manipulate a virtual light switch.
type LightSwitchClientMethods interface {
	// Status indicates whether the light is on or off.
	Status(*context.T, ...rpc.CallOpt) (string, error)
	// FlipSwitch sets the light to on or off, depending on the input.
	FlipSwitch(ctx *context.T, toOn bool, opts ...rpc.CallOpt) error
}

// LightSwitchClientStub adds universal methods to LightSwitchClientMethods.
type LightSwitchClientStub interface {
	LightSwitchClientMethods
	rpc.UniversalServiceMethods
}

// LightSwitchClient returns a client stub for LightSwitch.
func LightSwitchClient(name string) LightSwitchClientStub {
	return implLightSwitchClientStub{name}
}

type implLightSwitchClientStub struct {
	name string
}

func (c implLightSwitchClientStub) Status(ctx *context.T, opts ...rpc.CallOpt) (o0 string, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "Status", nil, []interface{}{&o0}, opts...)
	return
}

func (c implLightSwitchClientStub) FlipSwitch(ctx *context.T, i0 bool, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "FlipSwitch", []interface{}{i0}, nil, opts...)
	return
}

// LightSwitchServerMethods is the interface a server writer
// implements for LightSwitch.
//
// LightSwitch allows clients to manipulate a virtual light switch.
type LightSwitchServerMethods interface {
	// Status indicates whether the light is on or off.
	Status(*context.T, rpc.ServerCall) (string, error)
	// FlipSwitch sets the light to on or off, depending on the input.
	FlipSwitch(ctx *context.T, call rpc.ServerCall, toOn bool) error
}

// LightSwitchServerStubMethods is the server interface containing
// LightSwitch methods, as expected by rpc.Server.
// There is no difference between this interface and LightSwitchServerMethods
// since there are no streaming methods.
type LightSwitchServerStubMethods LightSwitchServerMethods

// LightSwitchServerStub adds universal methods to LightSwitchServerStubMethods.
type LightSwitchServerStub interface {
	LightSwitchServerStubMethods
	// Describe the LightSwitch interfaces.
	Describe__() []rpc.InterfaceDesc
}

// LightSwitchServer returns a server stub for LightSwitch.
// It converts an implementation of LightSwitchServerMethods into
// an object that may be used by rpc.Server.
func LightSwitchServer(impl LightSwitchServerMethods) LightSwitchServerStub {
	stub := implLightSwitchServerStub{
		impl: impl,
	}
	// Initialize GlobState; always check the stub itself first, to handle the
	// case where the user has the Glob method defined in their VDL source.
	if gs := rpc.NewGlobState(stub); gs != nil {
		stub.gs = gs
	} else if gs := rpc.NewGlobState(impl); gs != nil {
		stub.gs = gs
	}
	return stub
}

type implLightSwitchServerStub struct {
	impl LightSwitchServerMethods
	gs   *rpc.GlobState
}

func (s implLightSwitchServerStub) Status(ctx *context.T, call rpc.ServerCall) (string, error) {
	return s.impl.Status(ctx, call)
}

func (s implLightSwitchServerStub) FlipSwitch(ctx *context.T, call rpc.ServerCall, i0 bool) error {
	return s.impl.FlipSwitch(ctx, call, i0)
}

func (s implLightSwitchServerStub) Globber() *rpc.GlobState {
	return s.gs
}

func (s implLightSwitchServerStub) Describe__() []rpc.InterfaceDesc {
	return []rpc.InterfaceDesc{LightSwitchDesc}
}

// LightSwitchDesc describes the LightSwitch interface.
var LightSwitchDesc rpc.InterfaceDesc = descLightSwitch

// descLightSwitch hides the desc to keep godoc clean.
var descLightSwitch = rpc.InterfaceDesc{
	Name:    "LightSwitch",
	PkgPath: "v.io/x/browser/sample",
	Doc:     "// LightSwitch allows clients to manipulate a virtual light switch.",
	Methods: []rpc.MethodDesc{
		{
			Name: "Status",
			Doc:  "// Status indicates whether the light is on or off.",
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // string
			},
		},
		{
			Name: "FlipSwitch",
			Doc:  "// FlipSwitch sets the light to on or off, depending on the input.",
			InArgs: []rpc.ArgDesc{
				{"toOn", ``}, // bool
			},
		},
	},
}
