// Copyright 2016 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

/*
 * Defines types to organize the HTTP response values.
 * Since json.Marshal only works on exported fields, the types here force the
 * fields to be converted to lowercase (for better JS consumption).
 */

import (
	"v.io/v23/naming"
	"v.io/v23/security/access"
	"v.io/v23/vdl"
	"v.io/v23/vdlroot/signature"
)

type accountNameReturn struct {
	AccountName string `json:"accountName"`
	Err         string `json:"err"`
}

type globReturn struct {
	GlobRes *naming.MountEntry `json:"globRes"`
	GlobErr *naming.GlobError  `json:"globErr"`
	GlobEnd bool               `json:"globEnd"`
	Err     string             `json:"err"`
}

type deleteReturn struct {
	Err string `json:"err"`
}

type addressesReturn struct {
	Addresses []string `json:"addresses"`
	Err       string   `json:"err"`
}

type permissionsReturn struct {
	Permissions access.Permissions `json:"permissions"`
	Err         string             `json:"err"`
}

type blessingsReturn struct {
	Blessings []string `json:"blessings"`
	Err       string   `json:"err"`
}

type signatureReturn struct {
	Signature []pInterface `json:"signature"`
	Err       string       `json:"err"`
}

type makeRPCReturn struct {
	Response []string `json:"response"`
	Err      string   `json:"err"`
}

// pInterface describes the signature of an interface.
// This is a parallel data structure to signature.Interface.
// The reason to do this is so that Type and Tags can be converted to strings
// before being sent along the wire.
type pInterface struct {
	Name    string    `json:"name"`
	PkgPath string    `json:"pkgPath"`
	Doc     string    `json:"doc"`
	Embeds  []pEmbed  `json:"embeds"`  // No special ordering.
	Methods []pMethod `json:"methods"` // Ordered by method name.
}

// pEmbed describes the signature of an embedded interface.
type pEmbed struct {
	Name    string `json:"name"`
	PkgPath string `json:"pkgPath"`
	Doc     string `json:"doc"`
}

// pMethod describes the signature of an interface method.
type pMethod struct {
	Name      string   `json:"name"`
	Doc       string   `json:"doc"`
	InArgs    []pArg   `json:"inArgs"`    // Input arguments
	OutArgs   []pArg   `json:"outArgs"`   // Output arguments
	InStream  *pArg    `json:"inStream"`  // Input stream (optional)
	OutStream *pArg    `json:"outStream"` // Output stream (optional)
	Tags      []string `json:"tags"`      // Method tags
}

// pArg describes the signature of a single argument.
type pArg struct {
	Name string `json:"name"`
	Doc  string `json:"doc"`
	Type string `json:"type"` // Type of the argument.
}

// Helper method to convert []signature.Interface to the parallel data
// structure, []pInterface.
func convertSignature(sig []signature.Interface) []pInterface {
	ret := []pInterface{}
	for _, ifc := range sig {
		pIfc := pInterface{
			Name:    ifc.Name,
			PkgPath: ifc.PkgPath,
			Doc:     ifc.Doc,
			Embeds:  convertEmbeds(ifc.Embeds),
			Methods: convertMethods(ifc.Methods),
		}
		ret = append(ret, pIfc)
	}
	return ret
}

func convertEmbeds(embeds []signature.Embed) []pEmbed {
	ret := []pEmbed{}
	for _, e := range embeds {
		pE := pEmbed{
			Name:    e.Name,
			PkgPath: e.PkgPath,
			Doc:     e.Doc,
		}
		ret = append(ret, pE)
	}
	return ret
}

func convertMethods(methods []signature.Method) []pMethod {
	ret := []pMethod{}
	for _, m := range methods {
		pM := pMethod{
			Name:      m.Name,
			Doc:       m.Doc,
			InArgs:    convertArgs(m.InArgs),
			OutArgs:   convertArgs(m.OutArgs),
			InStream:  convertOptArg(m.InStream),
			OutStream: convertOptArg(m.OutStream),
			Tags:      convertTags(m.Tags),
		}
		ret = append(ret, pM)
	}
	return ret
}

func convertArgs(args []signature.Arg) []pArg {
	ret := []pArg{}
	for _, a := range args {
		pA := *convertOptArg(&a)
		ret = append(ret, pA)
	}
	return ret
}

func convertOptArg(arg *signature.Arg) *pArg {
	if arg == nil {
		return nil
	}
	return &pArg{
		Name: arg.Name,
		Doc:  arg.Doc,
		Type: arg.Type.String(),
	}
}

func convertTags(tags []*vdl.Value) []string {
	ret := []string{}
	for _, t := range tags {
		ret = append(ret, t.String())
	}
	return ret
}
