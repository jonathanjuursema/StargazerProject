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

  # Always get the latest ISS TLE data from:
  # http://spaceflight.nasa.gov/realdata/sightings/SSapplications/Post/JavaSSOP/orbit/ISS/SVPOST.html
  iss = ephem.readtle(
    'ISS',
    '1 25544U 98067A   15303.55507763  .00016717  00000-0  10270-3 0  9007',
    '2 25544  51.6383 128.4698 0006236  89.1591 271.0276 15.54697518  9102'
  )

  home.date = datetime.utcnow()
  iss.compute(home)

  if r == "alt":
    print(iss.alt * degrees_per_radian)
  
  if r == "az":
    print(iss.az * degrees_per_radian)
    
if __name__ == "__main__":
   main(sys.argv[1:])
