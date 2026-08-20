import os
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOM = os.getenv("E2E_JITSI_ROOM", "drvarsha-staging-room")
EVIDENCE = Path(os.getenv("E2E_EVIDENCE_DIR", "tests/evidence"))
EVIDENCE.mkdir(parents=True, exist_ok=True)


def browser():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1000")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--use-fake-ui-for-media-stream")
    options.add_argument("--use-fake-device-for-media-stream")
    return webdriver.Chrome(options=options)


def test_two_browsers_open_same_jitsi_room():
    first = browser()
    second = browser()
    url = f"https://meet.jit.si/{ROOM}"
    try:
        first.get(url)
        second.get(url)
        WebDriverWait(first, 30).until(lambda d: d.find_element(By.TAG_NAME, "body"))
        WebDriverWait(second, 30).until(lambda d: d.find_element(By.TAG_NAME, "body"))
        assert ROOM in first.current_url
        assert ROOM in second.current_url
        first.save_screenshot(str(EVIDENCE / "08-jitsi-browser-1.png"))
        second.save_screenshot(str(EVIDENCE / "09-jitsi-browser-2.png"))
    finally:
        first.quit()
        second.quit()
