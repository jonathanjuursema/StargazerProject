import math
import time
from datetime import datetime
import ephem
import sys, getopt

def main(argv):

  degrees_per_radian = 180.0 / math.pi
  
  r = "";

  home = ephem.Observer()
  home.lat = '0'
  home.lon = '0'
  home.elevation = 0
  
  try:
    opts, args = getopt.getopt(argv,"",["lat=","lon=","alt","az"])
    
  except getopt.GetoptError:
    print 'iss.py --lat=0.0 --lon=0.0 [ --alt | --az ]'
    sys.exit(2)
    
  for opt, arg in opts:
    if opt == "--lat":
      home.lat = arg
    elif opt == "--lon":
      home.lon = arg
    elif opt == "--alt":
      r = "alt"
    elif opt == "--az":
      r = "az"
  
  with open('./satellites.dat') as f:
    teldata = f.read().splitlines()

  iss = ephem.readtle(
    teldata[0],
    teldata[1],
    teldata[2]
  )

  home.date = datetime.utcnow()
  iss.compute(home)

  if r == "alt":
    print(iss.alt * degrees_per_radian)
  
  if r == "az":
    print(iss.az * degrees_per_radian)
    
if __name__ == "__main__":
   main(sys.argv[1:])
