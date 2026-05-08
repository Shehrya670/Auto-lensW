"""
Auto-Lens Selenium Test Suite  –  Assignment 3
DevOps for Cloud Computing  |  COMSATS University Islamabad  |  Spring 2026

15 test cases targeting the deployed Auto-Lens React + Express application.
Uses headless Chrome as required (AWS EC2 / Jenkins / Docker).

Selectors are derived from the actual component source code:
  - Navbar.js      : nav.navbar, .nav-logo, .nav-link, .btn-outline-nav, .btn-primary-nav
  - Login.js       : input[name="email"], input[name="password"], .alert.alert-error
  - Signup.js      : input[name="name"], input[name="email"], input[name="password"], .alert.alert-error
  - CarsPage.js    : .search-box input[type="text"], .filter-select, .sort-select
  - LandingPage.js : .hero-section, .hero-title, .hero-search, .feature-card, .footer
  - Footer.js      : footer.footer, .footer-bottom
"""

import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# ─────────────────────────────────────────────────────────────────────────────
# Configuration — override via Jenkins environment variables
# ─────────────────────────────────────────────────────────────────────────────
BASE_URL      = os.getenv("APP_URL",      "http://localhost:3000")
BACKEND_URL   = os.getenv("BACKEND_URL",  "http://localhost:5000")
WAIT          = int(os.getenv("WAIT_TIMEOUT", "20"))


# ─────────────────────────────────────────────────────────────────────────────
# Shared headless Chrome driver  (module scope = one browser for all tests)
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def driver():
    opts = Options()
    opts.add_argument("--headless=new")        # Chrome 112+  headless mode
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-infobars")
    opts.add_argument("--log-level=3")         # suppress console noise

    chromedriver = os.getenv("CHROMEDRIVER_PATH", "/usr/bin/chromedriver")
    if os.path.isfile(chromedriver):
        svc = Service(executable_path=chromedriver)
    else:
        # Fallback: webdriver-manager (local dev)
        from webdriver_manager.chrome import ChromeDriverManager
        svc = Service(ChromeDriverManager().install())

    drv = webdriver.Chrome(service=svc, options=opts)
    drv.set_page_load_timeout(30)
    yield drv
    drv.quit()


def wait_visible(driver, css, timeout=WAIT):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, css))
    )

def wait_url_contains(driver, fragment, timeout=WAIT):
    WebDriverWait(driver, timeout).until(EC.url_contains(fragment))


# ═════════════════════════════════════════════════════════════════════════════
# TC-01  Landing page loads and returns HTTP 200 (page source non-empty)
# ═════════════════════════════════════════════════════════════════════════════
def test_01_landing_page_loads(driver):
    """Landing page must load without errors."""
    driver.get(BASE_URL)
    assert len(driver.page_source) > 500, "Landing page source is too short — may have failed to load"


# ═════════════════════════════════════════════════════════════════════════════
# TC-02  Page title contains 'Auto Lens'
# ═════════════════════════════════════════════════════════════════════════════
def test_02_page_title(driver):
    """Browser tab title must identify the application."""
    driver.get(BASE_URL)
    # React sets document.title; wait up to WAIT seconds for it
    WebDriverWait(driver, WAIT).until(lambda d: len(d.title) > 0)
    assert "auto" in driver.title.lower() or "lens" in driver.title.lower(), \
        f"Unexpected title: '{driver.title}'"


# ═════════════════════════════════════════════════════════════════════════════
# TC-03  Navbar is rendered and visible
# ═════════════════════════════════════════════════════════════════════════════
def test_03_navbar_visible(driver):
    """nav.navbar element must be displayed on the landing page."""
    driver.get(BASE_URL)
    nav = wait_visible(driver, "nav.navbar")
    assert nav.is_displayed()


# ═════════════════════════════════════════════════════════════════════════════
# TC-04  Navbar contains 'Auto Lens' brand text
# ═════════════════════════════════════════════════════════════════════════════
def test_04_navbar_brand(driver):
    """The .nav-logo element must contain the brand name."""
    driver.get(BASE_URL)
    logo = wait_visible(driver, ".nav-logo")
    assert "auto lens" in logo.text.lower(), \
        f"Brand text not found. Got: '{logo.text}'"


# ═════════════════════════════════════════════════════════════════════════════
# TC-05  Hero section is rendered on the guest landing page
# ═════════════════════════════════════════════════════════════════════════════
def test_05_hero_section_present(driver):
    """Unauthenticated landing must show the hero section."""
    # Clear auth so we're definitely on the guest view
    driver.get(BASE_URL)
    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.get(BASE_URL)
    hero = wait_visible(driver, ".hero-section")
    assert hero.is_displayed()


# ═════════════════════════════════════════════════════════════════════════════
# TC-06  Hero search input is functional
# ═════════════════════════════════════════════════════════════════════════════
def test_06_hero_search_input(driver):
    """The hero search box must accept keyboard input."""
    driver.get(BASE_URL)
    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.get(BASE_URL)
    inp = wait_visible(driver, ".hero-search-box input[type='text']")
    inp.clear()
    inp.send_keys("Toyota")
    assert inp.get_attribute("value") == "Toyota", \
        "Hero search input did not retain typed value"


# ═════════════════════════════════════════════════════════════════════════════
# TC-07  Footer is present and contains copyright text
# ═════════════════════════════════════════════════════════════════════════════
def test_07_footer_present(driver):
    """footer.footer must be present and show the copyright notice."""
    driver.get(BASE_URL)
    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.get(BASE_URL)
    footer = wait_visible(driver, "footer.footer")
    footer_text = footer.text.lower()
    assert "auto lens" in footer_text or "©" in footer_text or "copyright" in footer_text, \
        f"Footer does not contain expected text. Got: '{footer.text[:100]}'"


# ═════════════════════════════════════════════════════════════════════════════
# TC-08  Navbar 'Browse Cars' link navigates to /cars
# ═════════════════════════════════════════════════════════════════════════════
def test_08_navbar_browse_cars_link(driver):
    """Clicking 'Browse Cars' in the navbar must navigate to /cars."""
    driver.get(BASE_URL)
    link = wait_visible(driver, "a.nav-link[href='/cars']")
    link.click()
    wait_url_contains(driver, "/cars")
    assert "/cars" in driver.current_url


# ═════════════════════════════════════════════════════════════════════════════
# TC-09  Cars page renders the search toolbar
# ═════════════════════════════════════════════════════════════════════════════
def test_09_cars_page_search_toolbar(driver):
    """The .search-box input on /cars must be visible."""
    driver.get(f"{BASE_URL}/cars")
    search = wait_visible(driver, ".search-box input[type='text']")
    assert search.is_displayed()


# ═════════════════════════════════════════════════════════════════════════════
# TC-10  Cars page Make filter (select) is present
# ═════════════════════════════════════════════════════════════════════════════
def test_10_cars_page_make_filter(driver):
    """The Make <select> filter on /cars sidebar must be present."""
    driver.get(f"{BASE_URL}/cars")
    sel = wait_visible(driver, "select.filter-select[name='make']")
    assert sel.is_displayed()
    # Verify it has options beyond the default
    opts = sel.find_elements(By.TAG_NAME, "option")
    assert len(opts) > 5, f"Expected >5 make options, got {len(opts)}"


# ═════════════════════════════════════════════════════════════════════════════
# TC-11  Login page has email and password inputs with correct name attributes
# ═════════════════════════════════════════════════════════════════════════════
def test_11_login_form_fields(driver):
    """Login form must have email and password inputs."""
    driver.get(f"{BASE_URL}/login")
    email_input = wait_visible(driver, "input[name='email'][type='email']")
    pwd_input   = wait_visible(driver, "input[name='password']")
    assert email_input.is_displayed()
    assert pwd_input.is_displayed()


# ═════════════════════════════════════════════════════════════════════════════
# TC-12  Login with wrong credentials shows .alert.alert-error
# ═════════════════════════════════════════════════════════════════════════════
def test_12_login_invalid_credentials(driver):
    """Submitting wrong credentials must render .alert.alert-error."""
    driver.get(f"{BASE_URL}/login")
    driver.find_element(By.CSS_SELECTOR, "input[name='email']").send_keys("wrong@test.com")
    driver.find_element(By.CSS_SELECTOR, "input[name='password']").send_keys("WrongPass99")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    # Wait for the error alert to appear
    err = WebDriverWait(driver, WAIT).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".alert.alert-error"))
    )
    assert err.is_displayed(), "Error alert not shown after invalid login"
    assert len(err.text.strip()) > 0, "Error alert is empty"


# ═════════════════════════════════════════════════════════════════════════════
# TC-13  Signup page has all required fields (name, email, password)
# ═════════════════════════════════════════════════════════════════════════════
def test_13_signup_form_fields(driver):
    """Signup form must have name, email, and password inputs."""
    driver.get(f"{BASE_URL}/signup")
    name_input  = wait_visible(driver, "input[name='name'][type='text']")
    email_input = wait_visible(driver, "input[name='email'][type='email']")
    pwd_input   = wait_visible(driver, "input[name='password']")
    assert name_input.is_displayed()
    assert email_input.is_displayed()
    assert pwd_input.is_displayed()


# ═════════════════════════════════════════════════════════════════════════════
# TC-14  Accessing /sell while logged out redirects to /login
# ═════════════════════════════════════════════════════════════════════════════
def test_14_protected_sell_route_redirect(driver):
    """/sell must redirect unauthenticated users to /login."""
    # Ensure no session exists
    driver.get(BASE_URL)
    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.delete_all_cookies()

    driver.get(f"{BASE_URL}/sell")
    time.sleep(3)   # allow React Router to process redirect

    is_on_login = "/login" in driver.current_url
    has_login_form = len(driver.find_elements(By.CSS_SELECTOR, "input[name='email']")) > 0
    assert is_on_login or has_login_form, \
        f"Expected redirect to /login, but URL is: {driver.current_url}"


# ═════════════════════════════════════════════════════════════════════════════
# TC-15  Backend /healthz endpoint returns { status: 'ok' }
# ═════════════════════════════════════════════════════════════════════════════
def test_15_backend_health_endpoint(driver):
    """GET /healthz must return a response containing 'ok'."""
    driver.get(f"{BACKEND_URL}/healthz")
    src = driver.page_source.lower()
    assert "ok" in src, \
        f"/healthz did not return expected 'ok'. Got: {driver.page_source[:300]}"
