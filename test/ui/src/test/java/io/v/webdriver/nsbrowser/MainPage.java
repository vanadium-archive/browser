// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.webdriver.nsbrowser;

import com.google.common.base.Function;
import com.google.common.base.Predicate;

import org.junit.Assert;
import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import io.v.webdriver.Util;
import io.v.webdriver.commonpages.OAuthLoginPage;
import io.v.webdriver.commonpages.PageBase;
import io.v.webdriver.htmlreport.HTMLReportData;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The main page of the namespace browser.
 *
 * @author jingjin@google.com
 */
public class MainPage extends PageBase {
  /**
   * Checks whether the tree is loaded correctly.
   */
  private static class CheckTree implements Predicate<WebDriver> {
    /**
     * The tree root to check.
     */
    private static final String TREE_ROOT = "ns.dev.v.io:8101";

    /**
     * A set of children items to check.
     */
    private static final Map<String, Boolean> TREE_CHILDREN = new HashMap<String, Boolean>() {
      {
        put("applications", false);
        put("binaries", false);
        put("proxy", false);
      }
    };

    private boolean rootOK;

    private boolean childrenOK;

    @Override
    public boolean apply(WebDriver driver) {
      childrenOK = true;
      rootOK = false;
      List<WebElement> treeNodes = driver.findElements(By.tagName("tree-node"));
      for (WebElement treeNode : treeNodes) {
        String label = treeNode.getAttribute("label");
        if (TREE_CHILDREN.containsKey(label)) {
          TREE_CHILDREN.put(label, true);
        }
        if (TREE_ROOT.equals(label)) {
          rootOK = true;
        }
      }
      for (String label : TREE_CHILDREN.keySet()) {
        if (!TREE_CHILDREN.get(label)) {
          childrenOK = false;
        }
      }
      return rootOK && childrenOK;
    }

    public boolean getRootOK() {
      return rootOK;
    }

    public boolean getChildrenOK() {
      return childrenOK;
    }
  }

  public MainPage(WebDriver driver, String url, HTMLReportData htmlReportData) {
    super(driver, url, htmlReportData);
  }

  public OAuthLoginPage goToPage() {
    super.goWithoutTakingScreenshot();
    // The first time going to the main page, it will ask for oauth login.
    return new OAuthLoginPage(driver, htmlReportData);
  }

  public void load() {
    log("Loading the main page");

    // First, we need to click on the "Bless" button in the "select caveats" page.
    final String mainTabHandle = driver.getWindowHandle();
    // Wait until the corresponding tab is there, which means we should get two window handles.
    String selectCaveatsTabHandle = wait.until(new Function<WebDriver, String>() {
      @Override
      public String apply(WebDriver input) {
        Set<String> handles = driver.getWindowHandles();
        if (handles.size() != 2) {
          return null;
        }
        for (String handle : handles) {
          if (!handle.equals(mainTabHandle)) {
            return handle;
          }
        }
        return null;
      }
    });
    driver.switchTo().window(selectCaveatsTabHandle);
    WebElement btnBless =
        wait.until(ExpectedConditions.elementToBeClickable(By.id("submit-caveats")));
    Util.takeScreenshot("select-caveats.png", "Selecting Caveats", htmlReportData);
    btnBless.click();

    // Verify the tree has the correct root and some key children.
    driver.switchTo().window(mainTabHandle);
    CheckTree treeChecker = new CheckTree();
    try {
      new WebDriverWait(driver, 20).until(treeChecker);
    } catch (TimeoutException e) {
      boolean rootOK = treeChecker.getRootOK();
      boolean childrenOK = treeChecker.getChildrenOK();
      if (!rootOK && !childrenOK) {
        Assert.fail("Failed to load the main page.");
      } else if (rootOK && !childrenOK) {
        Assert.fail("Tree loaded with root but no children.");
      } else {
        Assert.fail("Tree loaded with children but no root.");
      }
    }
    Util.takeScreenshot("after-loading.png", "After Namespace Loading", htmlReportData);
  }
}
