// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"

	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/options"
	"v.io/v23/rpc"
	"v.io/v23/security"
	"v.io/v23/security/access"
	"v.io/x/lib/gosh"
	"v.io/x/lib/set"
	"v.io/x/ref"
	"v.io/x/ref/lib/signals"
	_ "v.io/x/ref/runtime/factories/generic"
	"v.io/x/ref/services/identity/identitylib"
	"v.io/x/ref/services/mounttable/mounttablelib"
	"v.io/x/ref/services/xproxy/xproxy"
	"v.io/x/ref/test/expect"
	"v.io/x/ref/test/v23test"
)

// NOTE(sadovsky): It appears that a lot of this code has been copied from
// v.io/x/ref/cmd/servicerunner/main.go.

var (
	runTestsWatch bool
)

func init() {
	flag.BoolVar(&runTestsWatch, "runTestsWatch", false, "if true runs the tests in watch mode")
}

// TODO(sadovsky): Switch to using v23test.Shell.StartRootMountTable.
var runMT = gosh.Register("runMT", func(mp string) error {
	ctx, shutdown := v23.Init()
	defer shutdown()

	mt, err := mounttablelib.NewMountTableDispatcher(ctx, "", "", "mounttable")
	if err != nil {
		return fmt.Errorf("mounttablelib.NewMountTableDispatcher failed: %s", err)
	}

	_, server, err := v23.WithNewDispatchingServer(ctx, mp, mt, options.ServesMountTable(true))
	if err != nil {
		return fmt.Errorf("root failed: %v", err)
	}
	fmt.Printf("PID=%d\n", os.Getpid())
	for _, ep := range server.Status().Endpoints {
		fmt.Printf("MT_NAME=%s\n", ep.Name())
	}
	<-signals.ShutdownOnSignals(ctx)
	return nil
})

// Helper function to simply print an error and then exit.
func exitOnError(err error, desc string) {
	if err != nil {
		fmt.Fprintln(os.Stderr, desc, err)
		os.Exit(1)
	}
}

// updateVars captures the vars from the given session and adds them to the
// given vars map, overwriting existing entries.
// TODO(sadovsky): Switch to gosh.SendVars/AwaitVars.
func updateVars(s *expect.Session, vars map[string]string, varNames ...string) error {
	varsToAdd := set.StringBool.FromSlice(varNames)
	numLeft := len(varsToAdd)

	for {
		l := s.ReadLine()
		if err := s.OriginalError(); err != nil {
			return err // EOF or otherwise
		}
		parts := strings.Split(l, "=")
		if len(parts) != 2 {
			return fmt.Errorf("Unexpected line: %s", l)
		}
		if varsToAdd[parts[0]] {
			numLeft--
			vars[parts[0]] = parts[1]
			if numLeft == 0 {
				break
			}
		}
	}
	return nil
}

func main() {
	gosh.InitMain()

	// If we ever get a SIGHUP (terminal closes), then end the program.
	signalChannel := make(chan os.Signal)
	signal.Notify(signalChannel, syscall.SIGHUP)
	go func() {
		sig := <-signalChannel
		switch sig {
		case syscall.SIGHUP:
			os.Exit(1)
		}
	}()

	// Try running the program; on failure, exit with error status code.
	if !run() {
		os.Exit(1)
	}
}

// Runs the services and cleans up afterwards.
// Returns true if the run was successful.
func run() bool {
	// In order to prevent conflicts, tests and webapp use different mounttable
	// ports.
	port := 8884
	cottagePort := 8885
	housePort := 8886
	host := "localhost"

	err := os.MkdirAll("tmp/runner", 0750)
	exitOnError(err, "Could not make temp directory")

	vars := map[string]string{}
	sh := v23test.NewShell(nil, v23test.Opts{ChildOutputDir: "tmp/runner"})
	defer sh.Cleanup()
	ctx := sh.Ctx

	// Run a mounttable for tests
	cRoot := sh.Fn(runMT, "root")
	cRoot.Args = append(cRoot.Args, "--v23.tcp.protocol=wsh", fmt.Sprintf("--v23.tcp.address=%s:%d", host, port))
	cRoot.Start()
	exitOnError(err, "Failed to start root mount table")
	exitOnError(updateVars(cRoot.S, vars, "MT_NAME"), "Failed to get MT_NAME")

	// Set ref.EnvNamespacePrefix env var, consumed downstream.
	sh.Vars[ref.EnvNamespacePrefix] = vars["MT_NAME"]
	v23.GetNamespace(ctx).SetRoots(vars["MT_NAME"])

	// Run the cottage mounttable at host/cottage.
	cCottage := sh.Fn(runMT, "cottage")
	cCottage.Args = append(cCottage.Args, "--v23.tcp.protocol=wsh", fmt.Sprintf("--v23.tcp.address=%s:%d", host, cottagePort))
	cCottage.Start()
	exitOnError(err, "Failed to start cottage mount table")

	// run the house mounttable at host/house.
	cHouse := sh.Fn(runMT, "house")
	cHouse.Args = append(cHouse.Args, "--v23.tcp.protocol=wsh", fmt.Sprintf("--v23.tcp.address=%s:%d", host, housePort))
	cHouse.Start()
	exitOnError(err, "Failed to start house mount table")

	// Just print out the collected variables. This is for debugging purposes.
	bytes, err := json.Marshal(vars)
	exitOnError(err, "Failed to marshal the collected variables")
	fmt.Println(string(bytes))

	// Also set HOUSE_MOUNTTABLE (used in the tests)
	os.Setenv("HOUSE_MOUNTTABLE", fmt.Sprintf("/%s:%d", host, housePort))

	lspec := v23.GetListenSpec(ctx)
	lspec.Addrs = rpc.ListenAddrs{{"wsh", ":0"}}
	ctx = v23.WithListenSpec(ctx, lspec)
	ctx, cancel := context.WithCancel(ctx)
	proxyACL := access.AccessList{In: security.DefaultBlessingPatterns(v23.GetPrincipal(ctx))}
	proxy, err := xproxy.New(ctx, "test/proxy", proxyACL)
	exitOnError(err, "Failed to start proxy")
	vars["PROXY_NAME"] = proxy.ListeningEndpoints()[0].Name()
	defer func() {
		cancel()
		<-proxy.Closed()
	}()

	cIdentityd := sh.Fn(identitylib.TestIdentityd)
	cIdentityd.Args = append(cIdentityd.Args, "--v23.tcp.protocol=wsh", "--v23.tcp.address=:0", "--http-addr=localhost:0")
	cIdentityd.Start()
	exitOnError(err, "Failed to start identityd")
	exitOnError(updateVars(cIdentityd.S, vars, "TEST_IDENTITYD_NAME", "TEST_IDENTITYD_HTTP_ADDR"), "Failed to obtain identityd address")

	// Setup a lot of environment variables; these are used for the tests and building the test extension.
	os.Setenv(ref.EnvNamespacePrefix, vars["MT_NAME"])
	os.Setenv("PROXY_ADDR", vars["PROXY_NAME"])
	os.Setenv("IDENTITYD", fmt.Sprintf("%s/google", vars["TEST_IDENTITYD_NAME"]))
	os.Setenv("IDENTITYD_BLESSING_URL", fmt.Sprintf("%s/auth/blessing-root", vars["TEST_IDENTITYD_HTTP_ADDR"]))
	os.Setenv("DEBUG", "false")

	testsOk := runProva()

	fmt.Println("Cleaning up launched services...")
	return testsOk
}

// Run the prova tests and convert its tap output to xunit.
func runProva() bool {
	// This is also useful information for routing the test output.
	JIRI_ROOT := os.Getenv("JIRI_ROOT")
	VANADIUM_JS := fmt.Sprintf("%s/release/javascript/core", JIRI_ROOT)
	VANADIUM_BROWSER := fmt.Sprintf("%s/release/projects/browser", JIRI_ROOT)

	TAP_XUNIT := fmt.Sprintf("%s/node_modules/.bin/tap-xunit", VANADIUM_BROWSER)
	XUNIT_OUTPUT_FILE := os.Getenv("XUNIT_OUTPUT_FILE")
	if XUNIT_OUTPUT_FILE == "" {
		XUNIT_OUTPUT_FILE = fmt.Sprintf("%s/test_output.xml", os.Getenv("TMPDIR"))
	}
	TAP_XUNIT_OPTIONS := " --package=namespace-browser"

	// Make sure we're in the right folder when we run make test-extension.
	vbroot, err := os.Open(VANADIUM_BROWSER)
	exitOnError(err, "Failed to open vanadium browser dir")
	err = vbroot.Chdir()
	exitOnError(err, "Failed to change to vanadium browser dir")

	// Make the test-extension, this should also remove the old one.
	fmt.Println("Rebuilding test extension...")
	cmdExtensionClean := exec.Command("rm", "-fr", fmt.Sprintf("%s/extension/build-test", VANADIUM_JS))
	err = cmdExtensionClean.Run()
	exitOnError(err, "Failed to clean test extension")
	cmdExtensionBuild := exec.Command("make", "-C", fmt.Sprintf("%s/extension", VANADIUM_JS), "build-test")
	out, err := cmdExtensionBuild.CombinedOutput()
	exitOnError(err, fmt.Sprintf("Failed to build test extension: make -C %s/extension build-test [[\n%s\n]]", VANADIUM_JS, out))

	// These are the basic prova options.
	options := []string{
		"test/**/*.js",
		"--browser",
		"--includeFilenameAsPackage",
		"--launch",
		"chrome",
		"--plugin",
		"proxyquireify/plugin",
		"--transform",
		"envify,./main-transform",
		"--log",
		"tmp/chrome.log",
		fmt.Sprintf("--options=--load-extension=%s/extension/build-test/,--ignore-certificate-errors,--enable-logging=stderr", VANADIUM_JS),
	}

	// Normal tests have a few more options and a different port from the watch tests.
	var PROVA_PORT int
	if !runTestsWatch {
		PROVA_PORT = 8893
		options = append(options, "--headless", "--quit", "--progress", "--tap")
		fmt.Printf("\033[34m-Executing tests. See %s for test xunit output.\033[0m\n", XUNIT_OUTPUT_FILE)
	} else {
		PROVA_PORT = 8894
		fmt.Println("\033[34m-Running tests in watch mode.\033[0m")
	}
	options = append(options, "--port", fmt.Sprintf("%d", PROVA_PORT))

	// This is the prova command.
	cmdProva := exec.Command(
		fmt.Sprintf("%s/node_modules/.bin/prova", VANADIUM_BROWSER),
		options...,
	)
	fmt.Printf("\033[34m-Go to \033[32mhttp://0.0.0.0:%d\033[34m to see tests running.\033[0m\n", PROVA_PORT)
	fmt.Println(cmdProva)

	// Collect the prova stdout. This information needs to be sent to xunit.
	provaOut, err := cmdProva.StdoutPipe()
	exitOnError(err, "Failed to get prova stdout pipe")

	// Setup the tap to xunit command. It uses Prova's stdout as input.
	// The output will got the xunit output file.
	cmdTap := exec.Command(TAP_XUNIT, TAP_XUNIT_OPTIONS)
	cmdTap.Stdin = io.TeeReader(provaOut, os.Stdout) // Tee the prova output to see it on the console too.
	outfile, err := os.Create(XUNIT_OUTPUT_FILE)
	exitOnError(err, "Failed to create xunit output file")
	defer outfile.Close()
	bufferedWriter := bufio.NewWriter(outfile)
	cmdTap.Stdout = bufferedWriter
	defer bufferedWriter.Flush() // Ensure that the full xunit output is written.

	// We start the tap command...
	err = cmdTap.Start()
	exitOnError(err, "Failed to start tap to xunit command")

	// Meanwhile, run Prova to completion. If there was an error, print ERROR, otherwise PASS.
	err = cmdProva.Run()
	testsOk := true
	if err != nil {
		fmt.Println(err)
		fmt.Println("\033[31m\033[1mERROR\033[0m")
		testsOk = false
	} else {
		fmt.Println("\033[32m\033[1mPASS\033[0m")
	}

	// Wait for tap to xunit to finish itself off. This file will be ready for reading by Jenkins.
	fmt.Println("Converting Tap output to XUnit")
	err = cmdTap.Wait()
	exitOnError(err, "Failed tap to xunit conversion")

	return testsOk
}
