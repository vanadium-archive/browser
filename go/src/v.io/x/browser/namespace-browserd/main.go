// Copyright 2016 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/namespace"
	"v.io/v23/naming"
	"v.io/v23/rpc"
	"v.io/v23/vdl"
	"v.io/v23/vdlroot/signature"

	_ "v.io/x/ref/runtime/factories/generic"
)

const (
	RPC_TIMEOUT = 15 // 15 seconds per RPC

	// TODO(alexfandrianto): Make this configurable here and on the JS end.
	// https://github.com/vanadium/issues/issues/1268
	SERVER_ADDRESS = "localhost:9002"
)

type NamespaceBrowser struct {
	// The base Vanadium context. Used for all RPCs.
	ctx       *context.T
	namespace namespace.T
	client    rpc.Client
}

// NamespaceBrowser factory
func NewNamespaceBrowser(ctx *context.T) *NamespaceBrowser {
	return &NamespaceBrowser{
		ctx:       ctx,
		namespace: v23.GetNamespace(ctx),
		client:    v23.GetClient(ctx),
	}
}

func (b *NamespaceBrowser) timed() *context.T {
	ctx, _ := context.WithTimeout(b.ctx, RPC_TIMEOUT*time.Second)
	return ctx
}

func writeAndFlush(rw http.ResponseWriter, data interface{}) {
	// Make sure that the writer supports flushing.
	flusher, ok := rw.(http.Flusher)
	if !ok {
		http.Error(rw, "The HTTP response writer cannot flush, so we cannot stream results!", http.StatusInternalServerError)
		return
	}

	// Write data and flush
	encoded, err := json.Marshal(data)
	if err != nil {
		log.Printf("Failed to encode data: %v, %v", data, err)
	}
	fmt.Fprintf(rw, "data: %s\n\n", string(encoded))
	flusher.Flush()
}

func extractJsonString(params string) (s string, err error) {
	err = json.Unmarshal([]byte(params), &s)
	return
}

func extractJsonMap(params string) (m map[string]interface{}, err error) {
	err = json.Unmarshal([]byte(params), &m)
	return
}

/* ServeHTTP must handle EventSource requests from the browser.
 * The requests have a "request" and "params" portion.
 * The format is as follows:
 *
 * accountName: <no parameters>  => { accountName: <string>, err: <err> }
 * glob: string pattern  => a stream of responses
 *   { globRes: <glob res>, globErr: <glob err>, globEnd: <bool>, err: <err> }
 * permissions: string name =>  { permissions: <permissions>, err: <err> }
 * deleteMountPoint: string name => { err: <err string> }
 * resolveToMounttable: string name => { addresses: []<string>, err: <err> }
 * objectAddresses: string name => { addresses: []<string>, err: <err> }
 * remoteBlessings: string name => { blessings: []<string>, err: <err> }
 * signature: string name => { signature: <signature>, err: <err> }
 * makeRPC: { name: <string>, methodName: <string>, args: []<string>,
 *            numOutArgs: <int> } =>
 *          { response: <undefined, output, OR []outputs>, err: <err> }
 */
func (b *NamespaceBrowser) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	// Set the headers related to event streaming.
	rw.Header().Set("Content-Type", "text/event-stream")
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Connection", "keep-alive")
	rw.Header().Set("Access-Control-Allow-Origin", "*")

	request, err := url.QueryUnescape(req.FormValue("request"))
	if err != nil {
		fmt.Println(err)
		return
	}
	params, err := url.QueryUnescape(req.FormValue("params"))
	if err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println("request", request, "params", params)

	// The response depends on the request type.
	switch request {
	case "accountName":
		// Obtain the default blessing and return that.
		blessing, _ := v23.GetPrincipal(b.ctx).BlessingStore().Default()
		writeAndFlush(rw, accountNameReturn{AccountName: blessing.String()})
	case "glob":
		pattern, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Obtain the glob stream.
		globCh, err := b.namespace.Glob(b.timed(), pattern)
		if err != nil {
			writeAndFlush(rw, globReturn{Err: fmt.Sprintf("%v", err)})
			return
		}

		// Afterwards, go through the stream and forward results and errors.
		writeAndFlush(rw, globReturn{})
		for entry := range globCh { // These GlobReply could be a reply or an error.
			switch v := entry.(type) {
			case *naming.GlobReplyEntry:
				writeAndFlush(rw, globReturn{GlobRes: &v.Value})
			case *naming.GlobReplyError:
				writeAndFlush(rw, globReturn{GlobErr: &v.Value})
			}
		}
		writeAndFlush(rw, globReturn{GlobEnd: true})
	case "deleteMountPoint":
		name, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Delete the chosen name from the namespace.
		err = b.namespace.Delete(b.timed(), name, true)
		if err != nil {
			writeAndFlush(rw, deleteReturn{Err: fmt.Sprintf("%v", err)})
			return
		}
		writeAndFlush(rw, deleteReturn{})
	case "resolveToMounttable":
		name, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Use the MountEntry for this name to find its server addresses.
		entry, err := b.namespace.ResolveToMountTable(b.timed(), name)
		if err != nil {
			writeAndFlush(rw, addressesReturn{Err: fmt.Sprintf("%v", err)})
			return
		}
		addrs := []string{}
		for _, server := range entry.Servers {
			addrs = append(addrs, server.Server)
		}
		writeAndFlush(rw, addressesReturn{Addresses: addrs})
	case "objectAddresses":
		name, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Use the MountEntry for this name to find its object addresses.
		entry, err := b.namespace.Resolve(b.timed(), name)
		if err != nil {
			writeAndFlush(rw, addressesReturn{Err: fmt.Sprintf("%v", err)})
			return
		}
		addrs := []string{}
		for _, server := range entry.Servers {
			addrs = append(addrs, server.Server)
		}
		writeAndFlush(rw, addressesReturn{Addresses: addrs})
	case "permissions":
		name, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Obtain the mount table permissions at this name.
		perms, _, err := b.namespace.GetPermissions(b.timed(), name)
		if err != nil {
			writeAndFlush(rw, permissionsReturn{Err: fmt.Sprintf("%v", err)})
			return
		}
		writeAndFlush(rw, permissionsReturn{Permissions: perms})
	case "remoteBlessings":
		name, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Obtain the remote blessings for the server running at this name.
		clientCall, err := b.client.StartCall(b.timed(), name, rpc.ReservedMethodSignature, nil)
		defer clientCall.Finish()

		if err != nil {
			writeAndFlush(rw, blessingsReturn{Err: fmt.Sprintf("%v", err)})
			return
		}
		rbs, _ := clientCall.RemoteBlessings()
		writeAndFlush(rw, blessingsReturn{Blessings: rbs})
	case "signature":
		name, err := extractJsonString(params)
		if err != nil {
			fmt.Println(err)
			return
		}

		// Obtain the signature(s) of the server running at this name.
		var sig []signature.Interface
		err = b.client.Call(b.timed(), name, rpc.ReservedSignature, nil, []interface{}{&sig})
		if err != nil {
			writeAndFlush(rw, signatureReturn{Err: fmt.Sprintf("%v", err)})
			return
		}
		convertedSig := convertSignature(sig)
		writeAndFlush(rw, signatureReturn{Signature: convertedSig})
	case "makeRPC":
		data, err := extractJsonMap(params)
		if err != nil {
			fmt.Println(err)
			return
		}
		name := data["name"].(string)
		method := data["methodName"].(string)
		params := data["args"].([]interface{})
		fmt.Printf("Make RPC: %s %s %v\n", name, method, params)
		numOutArgs := int(data["numOutArgs"].(float64))

		// Prepare outargs as *vdl.Value
		outargs := make([]*vdl.Value, numOutArgs)
		outptrs := make([]interface{}, numOutArgs)
		for i := range outargs {
			outptrs[i] = &outargs[i]
		}

		// Make the call to name's method with the given params.
		err = b.client.Call(b.timed(), name, method, params, outptrs)
		if err != nil {
			writeAndFlush(rw, makeRPCReturn{Err: fmt.Sprintf("%v", err)})
			return
		}

		// Convert the *vdl.Value outputs to readable strings
		resStrings := []string{}
		for _, outarg := range outargs {
			resStrings = append(resStrings, outarg.String())
		}
		writeAndFlush(rw, makeRPCReturn{Response: resStrings})
	default:
		writeAndFlush(rw, "Please connect from the namespace browser.")
	}

	// I think this keeps the connection open until the other side closes it?
	notify := rw.(http.CloseNotifier).CloseNotify()
	<-notify
}

func main() {
	ctx, shutdown := v23.Init()
	defer shutdown()

	browser := NewNamespaceBrowser(ctx)
	log.Fatal("HTTP server error: ", http.ListenAndServe(SERVER_ADDRESS, browser))
}
