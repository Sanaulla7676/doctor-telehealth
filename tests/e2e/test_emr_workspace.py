import os
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
DOCTOR_EMAIL = os.getenv("E2E_DOCTOR_EMAIL", "")
DOCTOR_PASSWORD = os.getenv("E2E_DOCTOR_PASSWORD", "")
EVIDENCE = Path(os.getenv("E2E_EVIDENCE_DIR", "tests/evidence"))
EVIDENCE.mkdir(parents=True, exist_ok=True)


def screenshot(driver, name):
    driver.save_screenshot(str(EVIDENCE / f"{name}.png"))


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    browser = webdriver.Chrome(options=options)
    yield browser
    browser.quit()


def login(driver):
    if not DOCTOR_EMAIL or not DOCTOR_PASSWORD:
        pytest.skip("Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD for authenticated EMR E2E")
    driver.get(f"{BASE_URL}/doctor/")
    wait = WebDriverWait(driver, 15)
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="doctor-email"]'))).send_keys(DOCTOR_EMAIL)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-password"]').send_keys(DOCTOR_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="doctor-login"]').click()
    wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Doctor Workspace"))


def test_clinical_emr_workspace_and_navigation(driver):
    login(driver)
    driver.get(f"{BASE_URL}/doctor/clinical")
    wait = WebDriverWait(driver, 15)
    wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Patient care workspace"))
    assert "Clinical EMR" in driver.page_source
    assert "Clinical notes" in driver.page_source
    assert "Issue prescription" in driver.page_source
    assert "Schedule follow-up" in driver.page_source
    screenshot(driver, "06-clinical-emr-workspace")


def test_primary_dashboard_has_clinical_link(driver):
    login(driver)
    wait = WebDriverWait(driver, 15)
    clinical_link = wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Open Clinical EMR")))
    assert clinical_link.get_attribute("href").endswith("/doctor/clinical")
    screenshot(driver, "07-dashboard-clinical-entry")
