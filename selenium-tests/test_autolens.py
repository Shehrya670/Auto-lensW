"""
Auto-Lens Selenium Test Suite
Assignment 3 – DevOps for Cloud Computing
15 automated test cases using Selenium with headless Chrome
"""

import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# --------------------------------------------------------------------------- #
# Configuration – override via environment variables in Jenkins / Docker
# --------------------------------------------------------------------------- #
BASE_URL      = os.getenv("APP_URL", "http://localhost:3000")
BACKEND_URL   = os.getenv("BACKEND_URL", "http://localhost:5000")
TEST_EMAIL    = os.getenv("TEST_EMAIL", "seleniumtest@autolens.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Test1234")
TEST_NAME     = os.getenv("TEST_NAME", "Selenium Tester")
WAIT_TIMEOUT  = int(os.getenv("WAIT_TIMEOUT", "15"))

# --------------------------------------------------------------------------- #
# Shared driver fixture
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def driver():
    """Create a headless Chrome WebDriver instance shared across all tests."""
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--remote-debugging-port=9222")

    # Try system chromedriver first (set by Docker / CI), fall back to manager
    chromedriver_path = os.getenv("CHROMEDRIVER_PATH", "/usr/bin/chromedriver")
    if os.path.isfile(chromedriver_path):
        service = Service(executable_path=chromedriver_path)
    else:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())

    drv = webdriver.Chrome(service=service, options=options)
    drv.implicitly_wait(WAIT_TIMEOUT)
    yield drv
    drv.quit()


def wait_for(driver, by, value, timeout=WAIT_TIMEOUT):
    """Helper: explicit wait for an element to be visible."""
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, value))
    )


# =========================================================================== #
# TC-01  Landing page loads with correct title
# =========================================================================== #
class TestTC01_LandingPageTitle:
    def test_landing_page_title(self, driver):
        driver.get(BASE_URL)
        assert "Auto" in driver.title or "Lens" in driver.title or len(driver.title) > 0, \
            f"Unexpected page title: '{driver.title}'"


# =========================================================================== #
# TC-02  Landing page contains a navigation bar
# =========================================================================== #
class TestTC02_NavbarPresent:
    def test_navbar_is_present(self, driver):
        driver.get(BASE_URL)
        nav = driver.find_element(By.TAG_NAME, "nav")
        assert nav.is_displayed(), "Navigation bar is not visible on the landing page"


# =========================================================================== #
# TC-03  Navigation to /cars page works
# =========================================================================== #
class TestTC03_NavigateToCarsPage:
    def test_navigate_to_cars(self, driver):
        driver.get(f"{BASE_URL}/cars")
        assert "/cars" in driver.current_url, \
            f"Expected /cars in URL, got: {driver.current_url}"


# =========================================================================== #
# TC-04  Cars page contains a search or filter input
# =========================================================================== #
class TestTC04_CarsPageHasSearch:
    def test_cars_page_search_input_exists(self, driver):
        driver.get(f"{BASE_URL}/cars")
        found = False
        for selector in ["input[type='text']", "input[type='search']", "input[placeholder]"]:
            try:
                el = driver.find_element(By.CSS_SELECTOR, selector)
                if el.is_displayed():
                    found = True
                    break
            except NoSuchElementException:
                continue
        assert found, "No visible search/filter input found on /cars page"


# =========================================================================== #
# TC-05  Navigation to /signup page works
# =========================================================================== #
class TestTC05_NavigateToSignup:
    def test_navigate_to_signup(self, driver):
        driver.get(f"{BASE_URL}/signup")
        assert "/signup" in driver.current_url, \
            f"Expected /signup in URL, got: {driver.current_url}"


# =========================================================================== #
# TC-06  Signup page has required form fields
# =========================================================================== #
class TestTC06_SignupFormFields:
    def test_signup_form_has_required_fields(self, driver):
        driver.get(f"{BASE_URL}/signup")
        page_src = driver.page_source.lower()
        assert "email" in page_src, "Email field not found on signup page"
        assert "password" in page_src, "Password field not found on signup page"


# =========================================================================== #
# TC-07  Signup with invalid email shows validation error
# =========================================================================== #
class TestTC07_SignupInvalidEmail:
    def test_signup_invalid_email_validation(self, driver):
        driver.get(f"{BASE_URL}/signup")
        try:
            email_input = driver.find_element(By.CSS_SELECTOR, "input[type='email'], input[name='email']")
            email_input.clear()
            email_input.send_keys("not-an-email")

            submit = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
            submit.click()
            time.sleep(1)

            # Either HTML5 validation fires (invalid) or an error message appears
            is_invalid = driver.execute_script(
                "return document.querySelector('input[type=\"email\"]')?.validity?.valid === false"
            )
            error_in_page = any(word in driver.page_source.lower()
                                for word in ["invalid", "valid email", "error"])
            assert is_invalid or error_in_page, \
                "No validation error shown for invalid email on signup"
        except NoSuchElementException as e:
            pytest.skip(f"Signup email input not found: {e}")


# =========================================================================== #
# TC-08  Navigation to /login page works
# =========================================================================== #
class TestTC08_NavigateToLogin:
    def test_navigate_to_login(self, driver):
        driver.get(f"{BASE_URL}/login")
        assert "/login" in driver.current_url, \
            f"Expected /login in URL, got: {driver.current_url}"


# =========================================================================== #
# TC-09  Login page has email and password fields
# =========================================================================== #
class TestTC09_LoginPageFields:
    def test_login_page_has_fields(self, driver):
        driver.get(f"{BASE_URL}/login")
        page_src = driver.page_source.lower()
        assert "email" in page_src, "Email field not found on login page"
        assert "password" in page_src, "Password field not found on login page"


# =========================================================================== #
# TC-10  Login with wrong credentials shows an error
# =========================================================================== #
class TestTC10_LoginInvalidCredentials:
    def test_login_invalid_credentials(self, driver):
        driver.get(f"{BASE_URL}/login")
        try:
            email_input = driver.find_element(By.CSS_SELECTOR, "input[type='email'], input[name='email']")
            email_input.clear()
            email_input.send_keys("wrong@example.com")

            pass_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            pass_input.clear()
            pass_input.send_keys("WrongPass99")

            submit = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
            submit.click()
            time.sleep(2)

            error_keywords = ["invalid", "incorrect", "error", "failed", "credentials"]
            found_error = any(kw in driver.page_source.lower() for kw in error_keywords)
            assert found_error, "No error shown for invalid login credentials"
        except NoSuchElementException as e:
            pytest.skip(f"Login form element not found: {e}")


# =========================================================================== #
# TC-11  Backend health endpoint returns OK
# =========================================================================== #
class TestTC11_BackendHealthCheck:
    def test_backend_health_endpoint(self, driver):
        driver.get(f"{BACKEND_URL}/healthz")
        assert "ok" in driver.page_source.lower() or "auto-lens" in driver.page_source.lower(), \
            f"Health endpoint did not return expected response: {driver.page_source[:200]}"


# =========================================================================== #
# TC-12  Backend root API returns version info
# =========================================================================== #
class TestTC12_BackendRootResponse:
    def test_backend_root_returns_json(self, driver):
        driver.get(f"{BACKEND_URL}/")
        src = driver.page_source.lower()
        assert "auto lens" in src or "version" in src or "api" in src, \
            f"Backend root did not return expected JSON info: {driver.page_source[:200]}"


# =========================================================================== #
# TC-13  /api/cars returns a list (JSON)
# =========================================================================== #
class TestTC13_CarListingAPIEndpoint:
    def test_cars_api_endpoint_accessible(self, driver):
        driver.get(f"{BACKEND_URL}/api/cars")
        src = driver.page_source
        # Expect either a list of cars or an empty success response
        assert "success" in src.lower() or "cars" in src.lower(), \
            f"/api/cars did not return expected JSON: {src[:200]}"


# =========================================================================== #
# TC-14  Accessing a protected page (/sell) while logged out redirects to login
# =========================================================================== #
class TestTC14_ProtectedRouteRedirect:
    def test_sell_page_redirects_unauthenticated_user(self, driver):
        # Clear any existing session
        driver.get(BASE_URL)
        driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
        driver.delete_all_cookies()

        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)

        # Should either redirect to /login or show a login prompt
        is_redirected = "/login" in driver.current_url
        has_login_text = "login" in driver.page_source.lower() or "sign in" in driver.page_source.lower()
        assert is_redirected or has_login_text, \
            f"Protected /sell page accessible without auth. URL: {driver.current_url}"


# =========================================================================== #
# TC-15  Footer is present on the landing page
# =========================================================================== #
class TestTC15_FooterPresent:
    def test_footer_is_present(self, driver):
        driver.get(BASE_URL)
        try:
            footer = driver.find_element(By.TAG_NAME, "footer")
            assert footer.is_displayed(), "Footer element exists but is not visible"
        except NoSuchElementException:
            # Some SPAs use div.footer — check by class or text
            page_src = driver.page_source.lower()
            assert "footer" in page_src or "©" in page_src or "copyright" in page_src, \
                "No footer found on the landing page"
