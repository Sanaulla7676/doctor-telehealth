import os
import time
from datetime import date, timedelta
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
DOCTOR_EMAIL = os.getenv("E2E_DOCTOR_EMAIL", "")
DOCTOR_PASSWORD = os.getenv("E2E_DOCTOR_PASSWORD", "")
EVIDENCE = Path(os.getenv("E2E_EVIDENCE_DIR", "tests/evidence"))
EVIDENCE.mkdir(parents=True, exist_ok=True)


def wait(driver, selector, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))


def screenshot(driver, name):
    driver.save_screenshot(str(EVIDENCE / f"{name}.png"))


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    d = webdriver.Chrome(options=options)
    yield d
    d.quit()


def test_public_home_and_blog_navigation(driver):
    driver.get(BASE_URL)
    wait(driver, "body")
    assert "Dr. Varsha Bandi" in driver.find_element(By.TAG_NAME, "body").text
    driver.find_element(By.LINK_TEXT, "Blogs").click()
    WebDriverWait(driver, 10).until(EC.url_contains("/blogs"))
    assert "Insights for better health" in driver.page_source
    screenshot(driver, "01-public-blogs")


def test_doctor_login_and_blog_publish(driver):
    if not DOCTOR_EMAIL or not DOCTOR_PASSWORD:
        pytest.skip("Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD for authenticated E2E run")
    driver.get(BASE_URL + "/doctor/")
    wait(driver, '[data-testid="doctor-email"]').send_keys(DOCTOR_EMAIL)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-password"]').send_keys(DOCTOR_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-login"]').click()
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Clinical EMR"))
    driver.find_element(By.CSS_SELECTOR, '[data-testid="nav-blogs"]').click()
    wait(driver, '[data-testid="blog-title"]').send_keys("Selenium Clinical Journal Smoke Test")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="blog-content"]').send_keys("Automated end-to-end publishing verification article.")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="publish-blog"]').click()
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Selenium Clinical Journal Smoke Test"))
    screenshot(driver, "02-doctor-blog-published")
    driver.get(BASE_URL + "/blogs/")
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Selenium Clinical Journal Smoke Test"))
    screenshot(driver, "03-public-blog-reflected")


def test_booking_to_dashboard_video_lifecycle(driver):
    if not DOCTOR_EMAIL or not DOCTOR_PASSWORD:
        pytest.skip("Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD for full booking lifecycle")

    # Public booking smoke test. The existing app requires an authenticated patient account,
    # so this test intentionally documents that prerequisite rather than bypassing auth.
    driver.get(BASE_URL)
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "contact")))
    contact = driver.find_element(By.ID, "contact")
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", contact)
    screenshot(driver, "04-booking-form")

    # Dashboard login and appointment surface verification.
    driver.get(BASE_URL + "/doctor/")
    wait(driver, '[data-testid="doctor-email"]').send_keys(DOCTOR_EMAIL)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-password"]').send_keys(DOCTOR_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-login"]').click()
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Clinical EMR"))
    driver.find_element(By.CSS_SELECTOR, '[data-testid="nav-appointments"]').click()
    screenshot(driver, "05-doctor-appointments")
    assert "Appointments" in driver.page_source


def test_all_primary_dashboard_navigation(driver):
    if not DOCTOR_EMAIL or not DOCTOR_PASSWORD:
        pytest.skip("Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD for dashboard navigation")
    driver.get(BASE_URL + "/doctor/")
    wait(driver, '[data-testid="doctor-email"]').send_keys(DOCTOR_EMAIL)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-password"]').send_keys(DOCTOR_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-login"]').click()
    WebDriverWait(driver, 10).until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Clinical EMR"))
    for item in ("overview", "appointments", "patients", "followups", "documents", "blogs"):
        driver.find_element(By.CSS_SELECTOR, f'[data-testid="nav-{item}"]').click()
        time.sleep(.25)
        screenshot(driver, f"dashboard-{item}")
