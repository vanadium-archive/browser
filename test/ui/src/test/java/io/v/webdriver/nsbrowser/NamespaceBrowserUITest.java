// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.nsbrowser;

import org.junit.Test;

import io.v.webdriver.VanadiumUITestBase;
import io.v.webdriver.commonpages.OAuthLoginPage;
import io.v.webdriver.htmlreport.HTMLReportData;
import io.v.webdriver.htmlreport.HTMLReporter;

/**
 * UI tests for Vanadium Namespace Browser.
 *
 * @author jingjin@google.com
 */
public class NamespaceBrowserUITest extends VanadiumUITestBase {
  /**
   * System property name for the test url. This will be set from the mvn command line.
   */
  private static final String PROPERTY_TEST_URL = "testUrl";

  private static final String TEST_NAME_INIT_PROCESS = "Namespace Browser Initialization Process";

  /**
   * Tests initialization process.
   * <p>
   * The process includes signing into Chrome, installing Vanadium plugin, authenticating OAuth, and
   * visiting Namespace Browser's landing page.
   */
  @Test
  public void testInitProcess() throws Exception {
    HTMLReportData reportData = new HTMLReportData(TEST_NAME_INIT_PROCESS, htmlReportsDir);
    curHTMLReportData = reportData;

    super.signInAndInstallExtension(reportData);

    // Namespace browser.
    String url = System.getProperty(PROPERTY_TEST_URL);
    System.out.printf("Url: %s\n", url);
    MainPage mainPage = new MainPage(driver, url, reportData);
    if (url.equals("https://browser.staging.v.io") || url.equals("https://browser.v.io")) {
      // These are OAuth protected pages.
      OAuthLoginPage oauthLoginPage = mainPage.goToPage();
      oauthLoginPage.login();
    } else {
      mainPage.goWithoutTakingScreenshot();
    }
    mainPage.load();

    // Write html report.
    HTMLReporter reporter = new HTMLReporter(reportData);
    reporter.generateReport();
  }
}
