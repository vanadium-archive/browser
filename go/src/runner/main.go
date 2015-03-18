package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"sample/sampleworld"

	"v.io/v23"

	"v.io/x/ref/lib/flags/consts"
	"v.io/x/ref/lib/signals"
	"v.io/x/ref/profiles"
	"v.io/x/ref/test/expect"
	"v.io/x/ref/test/modules"
	"v.io/x/ref/test/modules/core"
)

const (
	SampleWorldCommand = "sampleWorld"           // The modules library command.
	stdoutLog          = "tmp/runner.stdout.log" // Used as stdout drain when shutting down.
	stderrLog          = "tmp/runner.stderr.log" // Used as stderr drain when shutting down.
)

var (
	// Flags used as input to this program.
	runSample     bool
	serveHTTP     bool
	portHTTP      string
	rootHTTP      string
	runTests      bool
	runTestsWatch bool
)

func init() {
	modules.RegisterChild(SampleWorldCommand, "desc", sampleWorld)
	flag.BoolVar(&runSample, "runSample", false, "if true, runs sample services")
	flag.BoolVar(&serveHTTP, "serveHTTP", false, "if true, serves HTTP")
	flag.StringVar(&portHTTP, "portHTTP", "9001", "default 9001, the port to serve HTTP on")
	flag.StringVar(&rootHTTP, "rootHTTP", ".", "default '.', the root HTTP folder path")
	flag.BoolVar(&runTests, "runTests", false, "if true, runs the namespace browser tests")
	flag.BoolVar(&runTestsWatch, "runTestsWatch", false, "if true && runTests, runs the tests in watch mode")
}

// Helper function to simply print an error and then exit.
func exitOnError(err error, desc string) {
	if err != nil {
		fmt.Fprintln(os.Stderr, desc, err)
		os.Exit(1)
	}
}

// updateVars captures the vars from the given Handle's stdout and adds them to
// the given vars map, overwriting existing entries.
func updateVars(h modules.Handle, vars map[string]string, varNames ...string) error {
	varsToAdd := map[string]bool{}
	for _, v := range varNames {
		varsToAdd[v] = true
	}
	numLeft := len(varsToAdd)

	s := expect.NewSession(nil, h.Stdout(), 30*time.Second)
	for {
		l := s.ReadLine()
		if err := s.OriginalError(); err != nil {
			return err // EOF or otherwise
		}
		parts := strings.Split(l, "=")
		if len(parts) != 2 {
			return fmt.Errorf("Unexpected line: %s", l)
		}
		if _, ok := varsToAdd[parts[0]]; ok {
			numLeft--
			vars[parts[0]] = parts[1]
			if numLeft == 0 {
				break
			}
		}
	}
	return nil
}

// The module command for running the sample world.
func sampleWorld(stdin io.Reader, stdout, stderr io.Writer, env map[string]string, args ...string) error {
	ctx, shutdown := v23.Init()
	defer shutdown()

	sampleworld.RunSampleWorld(ctx)

	modules.WaitForEOF(stdin)
	return nil
}

func main() {
	if modules.IsModulesChildProcess() {
		exitOnError(modules.Dispatch(), "Failed to dispatch module")
		return
	}

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

// Returns the first ipv4 address found or an error
func getFirstIPv4Address() (string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "", fmt.Errorf("No net interfaces found")
	}
	for _, i := range ifaces {
		addrs, err := i.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			if v, ok := addr.(*net.IPNet); ok {
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue // not an ipv4 address
			}
			return ip.String(), nil
		}
	}
	return "", fmt.Errorf("no ipv4 addresses were found")
}

// Runs the services and cleans up afterwards.
// Returns true if the run was successful.
func run() bool {
	ctx, shutdown := v23.Init()
	defer shutdown()

	// In order to prevent conflicts, tests and webapp use different mounttable ports.
	port := 8884
	cottagePort := 8885
	housePort := 8886
	host := "localhost"
	if !runTests {
		port = 5180
		cottagePort = 5181
		housePort = 5182

		// Get the IP address to serve at, since this is external-facing.
		sampleHost, err := getFirstIPv4Address()
		exitOnError(err, "Could not get host IP address")
		fmt.Printf("Using host %s\n", sampleHost)
		host = sampleHost
	}

	// Start a new shell module.
	vars := map[string]string{}
	sh, err := modules.NewShell(ctx, nil, false, nil)
	if err != nil {
		panic(fmt.Sprintf("modules.NewShell: %s", err))
	}

	// Collect the output of this shell on termination.
	err = os.MkdirAll("tmp", 0750)
	exitOnError(err, "Could not make temp directory")
	outFile, err := os.Create(stdoutLog)
	exitOnError(err, "Could not open stdout log file")
	defer outFile.Close()
	errFile, err := os.Create(stderrLog)
	exitOnError(err, "Could not open stderr log file")
	defer errFile.Close()
	defer sh.Cleanup(outFile, errFile)

	// Determine the hostname; this name will be used for mounting.
	hostName, err := exec.Command("hostname", "-s").Output()
	exitOnError(err, "Failed to obtain hostname")

	// Run the host mounttable.
	rootName := fmt.Sprintf("%s-home", strings.TrimSpace(string(hostName))) // Must trim; hostname has \n at the end.
	hRoot, err := sh.Start(core.MTCommand, nil, "--veyron.tcp.protocol=wsh", fmt.Sprintf("--veyron.tcp.address=%s:%d", host, port), rootName)
	exitOnError(err, "Failed to start root mount table")
	exitOnError(updateVars(hRoot, vars, "MT_NAME"), "Failed to get MT_NAME")
	defer hRoot.Shutdown(outFile, errFile)

	// Set consts.NamespaceRootPrefix env var, consumed downstream.
	sh.SetVar(consts.NamespaceRootPrefix, vars["MT_NAME"])
	v23.GetNamespace(ctx).SetRoots(vars["MT_NAME"])

	// Run the cottage mounttable at host/cottage.
	hCottage, err := sh.Start(core.MTCommand, nil, "--veyron.tcp.protocol=wsh", fmt.Sprintf("--veyron.tcp.address=%s:%d", host, cottagePort), "cottage")
	exitOnError(err, "Failed to start cottage mount table")
	expect.NewSession(nil, hCottage.Stdout(), 30*time.Second)
	defer hCottage.Shutdown(outFile, errFile)

	// run the house mounttable at host/house.
	hHouse, err := sh.Start(core.MTCommand, nil, "--veyron.tcp.protocol=wsh", fmt.Sprintf("--veyron.tcp.address=%s:%d", host, housePort), "house")
	exitOnError(err, "Failed to start house mount table")
	expect.NewSession(nil, hHouse.Stdout(), 30*time.Second)
	defer hHouse.Shutdown(outFile, errFile)

	// Possibly run the sample world.
	if runSample {
		fmt.Println("Running Sample World")
		hSample, err := sh.Start(SampleWorldCommand, nil, "--veyron.tcp.protocol=wsh", fmt.Sprintf("--veyron.tcp.address=%s:0", host))
		exitOnError(err, "Failed to start sample world")
		expect.NewSession(nil, hSample.Stdout(), 30*time.Second)
		defer hSample.Shutdown(outFile, errFile)
	}

	// Possibly serve the public bundle at the portHTTP.
	if serveHTTP {
		fmt.Printf("Also serving HTTP at %s for %s\n", portHTTP, rootHTTP)
		http.ListenAndServe(":"+portHTTP, http.FileServer(http.Dir(rootHTTP)))
	}

	// Just print out the collected variables. This is for debugging purposes.
	bytes, err := json.Marshal(vars)
	exitOnError(err, "Failed to marshal the collected variables")
	fmt.Println(string(bytes))

	// Possibly run the tests in Prova.
	if runTests {
		// Also set HOUSE_MOUNTTABLE (used in the tests)
		os.Setenv("HOUSE_MOUNTTABLE", fmt.Sprintf("/%s:%d", host, housePort))

		proxyShutdown, proxyEndpoint, err := profiles.NewProxy(ctx, "wsh", ":0", "", "test/proxy")
		exitOnError(err, "Failed to start proxy")
		defer proxyShutdown()
		vars["PROXY_NAME"] = proxyEndpoint.Name()

		hIdentityd, err := sh.Start(core.TestIdentitydCommand, nil, "--veyron.tcp.protocol=wsh", "--veyron.tcp.address=:0", "--veyron.proxy=test/proxy", "--host=localhost", "--httpaddr=localhost:0")
		exitOnError(err, "Failed to start identityd")
		exitOnError(updateVars(hIdentityd, vars, "TEST_IDENTITYD_NAME", "TEST_IDENTITYD_HTTP_ADDR"), "Failed to obtain identityd address")
		defer hIdentityd.Shutdown(outFile, errFile)

		// Setup a lot of environment variables; these are used for the tests and building the test extension.
		os.Setenv("NAMESPACE_ROOT", vars["MT_NAME"])
		os.Setenv("PROXY_ADDR", vars["PROXY_NAME"])
		os.Setenv("IDENTITYD", fmt.Sprintf("%s/google", vars["TEST_IDENTITYD_NAME"]))
		os.Setenv("IDENTITYD_BLESSING_URL", fmt.Sprintf("%s/blessing-root", vars["TEST_IDENTITYD_HTTP_ADDR"]))
		os.Setenv("DEBUG", "false")

		testsOk := runProva()

		fmt.Println("Cleaning up launched services...")
		return testsOk
	}

	// Not in a test, so run until the program is killed.
	<-signals.ShutdownOnSignals(ctx)
	return true
}

// Run the prova tests and convert its tap output to xunit.
func runProva() bool {
	// This is also useful information for routing the test output.
	VANADIUM_ROOT := os.Getenv("VANADIUM_ROOT")
	VANADIUM_JS := fmt.Sprintf("%s/release/javascript/core", VANADIUM_ROOT)
	VANADIUM_BROWSER := fmt.Sprintf("%s/release/projects/namespace_browser", VANADIUM_ROOT)

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
	err = cmdExtensionBuild.Run()
	exitOnError(err, "Failed to build test extension")

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
