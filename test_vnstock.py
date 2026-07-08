import logging
import requests
import sys

# Enable HTTP connection logging
import http.client as http_client
http_client.HTTPConnection.debuglevel = 1

logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
requests_log = logging.getLogger("requests.packages.urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True

from vnstock3 import Vnstock
try:
    stock = Vnstock().stock(symbol='VCB', source='TCBS')
    df = stock.finance.ratio(period='year', lang='vi')
    print("TCBS Finance Ratio:")
    print(df.head())
except Exception as e:
    print(e)
