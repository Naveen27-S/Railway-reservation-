from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from bs4 import BeautifulSoup
import pandas as pd
import time

options = Options()
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

url ="https://stats.espncricinfo.com/ci/engine/stats/index.html?class=6;filter=advanced;floodlit=1;floodlit=2;floodlit=3;ground=1981;home_or_away=1;home_or_away=2;home_or_away=3;home_or_away=4;innings_number=1;innings_number=2;orderby=runs;result=1;result=2;result=3;result=5;size=200;template=results;trophy=117;type=batting"
def get_data_from_page(soup):
    # Find the third table (with actual player stats)
    table = soup.find_all('table', {'class': 'engineTable'})[2]  # Table #3 is index 2
    
    # Extract headers from the table
    headers = [th.get_text(strip=True) for th in table.find_all('th')]
    
    # Extract rows of data from the table
    rows = []
    for tr in table.find_all('tr')[1:]:  # Skip the header row
        cells = tr.find_all('td')
        if len(cells) > 0:
            row = [cell.get_text(strip=True) for cell in cells]
            rows.append(row)
    
    return headers, rows

try:
    driver.get(url)

    # Create an empty DataFrame to hold all the data
    all_data = []

    while True:
        # Wait for the table to load
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'engineTable'))
        )

        # Get page source after it has fully loaded
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Get the data from the current page
        headers, rows = get_data_from_page(soup)
        
        if not rows:
            print("No more data found.")
            break
        
        # Append the data to the overall list
        all_data.extend(rows)

        # Try to go to the next page
        try:
            # Wait for the "Next" button to become clickable
            next_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.LINK_TEXT, 'Next'))
            )
            
            # Scroll to the "Next" button if necessary
            driver.execute_script("arguments[0].scrollIntoView();", next_button)
            time.sleep(1)  # Give some time for the scroll action to complete

            # Click the "Next" button using JavaScript (more reliable)
            driver.execute_script("arguments[0].click();", next_button)
            time.sleep(3)  # Wait for the next page to load

        except Exception as e:
            print(f"No more pages to scrape or error occurred: {e}")
            break

    # Create a DataFrame from the collected data
    df = pd.DataFrame(all_data, columns=headers)

    # Save the DataFrame to a CSV file
    df.to_csv('ipl_batting_venue hyderabad.csv', index=False)

    print("Data from all pages saved")

finally:
    driver.quit()
