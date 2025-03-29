from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
import time
import threading

from scraper.scraper_core import (
    create_driver, navigate_to, close_popup, input_address,
    select_risk_and_soil, select_all, view_results,
    wait_and_open_summary, scrape_summary_data
)

app = FastAPI()

# Create driver once at startup
driver = create_driver(headless=True)

# Lock for thread safety (FastAPI is multithreaded by default)
driver_lock = threading.Lock()


@app.get("/scrape")
def scrape(address: str = Query(...)):
    start_time = time.time()

    with driver_lock:
        try:
            navigate_to(driver, "https://ascehazardtool.org")
            close_popup(driver, "details-popup-close-icon")
            input_address(driver, address)
            time.sleep(2)
            select_risk_and_soil(driver)
            select_all(driver)
            view_results(driver)
            wait_and_open_summary(driver)
            data = scrape_summary_data(driver)
            data["execution_time"] = round(time.time() - start_time, 2)
            return JSONResponse(content=data)

        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
