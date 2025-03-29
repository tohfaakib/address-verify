import random
import time

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.select import Select
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys


def create_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.binary_location = "/usr/bin/chromium"  # system-installed Chromium

    # Use preinstalled chromedriver
    service = Service("/usr/local/uc/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    return driver


def navigate_to(driver, url):
    driver.get(url)


def close_driver(driver):
    driver.quit()


def close_popup(driver, class_name):
    try:
        popups = driver.find_elements(By.CLASS_NAME, class_name)
        for popup in popups:
            driver.execute_script("arguments[0].click();", popup)
    except Exception:
        pass


def input_address(driver, address):
    search_box = driver.find_element(By.ID, 'geocoder_input')
    search_box.clear()
    search_box.send_keys(address)
    search_box.send_keys(Keys.ENTER)


def select_risk_and_soil(driver):
    risk_select = Select(driver.find_element(By.ID, "risk-level-selector"))
    risk_select.select_by_value("2")

    soil_select = Select(driver.find_element(By.ID, "site-soil-class-selector"))
    soil_select.select_by_value("6")


def select_all(driver):
    driver.find_element(By.CLASS_NAME, "select-all-include").click()


def view_results(driver):
    driver.find_element(By.ID, "resultsButton").click()


def is_summary_enabled(driver):
    summary_btn = driver.find_element(By.XPATH, "//a[contains(text(),'Summary')]")
    return "disabled" not in summary_btn.get_attribute("class")


def wait_and_open_summary(driver):
    while True:
        if is_summary_enabled(driver):
            break
        time.sleep(1)

    close_popup(driver, "details-popup-close-icon")
    time.sleep(0.1)
    driver.execute_script(
        "arguments[0].scrollIntoView();",
        driver.find_element(By.XPATH, "//a[contains(text(),'Summary')]")
    )
    driver.find_element(By.XPATH, "//a[contains(text(),'Summary')]").click()


def get_summary_value_by_label(driver, label_text):
    rows = driver.find_elements(By.CSS_SELECTOR, ".summary-item-row")
    for row in rows:
        cells = row.find_elements(By.TAG_NAME, "td")
        if len(cells) == 2 and label_text in cells[0].text:
            return cells[1].text.strip()
    return ""


def categorize_seismic_design(sds):
    sds_val = float(sds)
    if sds_val <= 0.17:
        return "A"
    elif sds_val <= 0.33:
        return "B"
    elif sds_val <= 0.50:
        return "C"
    elif sds_val <= 0.67:
        return "D0"
    elif sds_val <= 0.83:
        return "D1"
    elif sds_val <= 1.25:
        return "D2"
    else:
        return "E"


def scrape_summary_data(driver):
    wind_speed = get_summary_value_by_label(driver, "Wind Speed")
    snow_load = get_summary_value_by_label(driver, "Ground Snow Load")
    flood_zone = get_summary_value_by_label(driver, "Flood")
    sds_text = get_summary_value_by_label(driver, "SDS") or get_summary_value_by_label(driver, "S<sub>DS</sub>")

    seismic_category = None
    if sds_text:
        try:
            sds_numeric = sds_text.replace("g", "").strip()
            seismic_category = categorize_seismic_design(sds_numeric)
        except Exception as e:
            seismic_category = f"Error parsing SDS: {e}"

    return {
        "wind_speed": wind_speed,
        "ground_snow_load": snow_load,
        "flood_zone": flood_zone,
        "sds": sds_text,
        "seismic_design_category": seismic_category
    }
