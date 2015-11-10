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
  
  target = "";
  
  try:
    opts, args = getopt.getopt(argv,"",["lat=","lon=","alt","az","ra","dec","list","sat="])
    
  except getopt.GetoptError:
    print 'sat.py --lat=0.0 --lon=0.0 --sat=name [ --alt | --az | --ra | --dec ]'
    print 'sat.py --list'
    sys.exit(2)
    
  for opt, arg in opts:
    if opt == "--list":
      with open('./satellites.dat') as f:
        teldata = f.read().splitlines()
        
      lineid = 0;
      while lineid < len(teldata):
        print(teldata[lineid].rstrip())
        lineid += 3;
        
      sys.exit(2)
        
    if opt == "--sat":
      target = arg
    if opt == "--lat":
      home.lat = arg
    elif opt == "--lon":
      home.lon = arg
    elif opt == "--alt":
      r = "alt"
    elif opt == "--az":
      r = "az"
    elif opt == "--ra":
      r = "ra"
    elif opt == "--dec":
      r = "dec"
  
  with open('./satellites.dat') as f:
    teldata = f.read().splitlines()
    
  sat = ephem.readtle(
    teldata[0],
    teldata[1],
    teldata[2]
  )
    
  lineid = 0;
  while lineid < len(teldata):
    if(teldata[lineid].rstrip() == target):
      sat = ephem.readtle(
        teldata[lineid],
        teldata[lineid+1],
        teldata[lineid+2]
      )
    lineid += 3

  home.date = datetime.utcnow()
  sat.compute(home)

  if r == "alt":
    print(sat.alt * degrees_per_radian)
  
  if r == "az":
    print(sat.az * degrees_per_radian)
    
  if r == "ra":
    print(sat.a_ra * degrees_per_radian)
  
  if r == "dec":
    print(sat.a_dec * degrees_per_radian)
    
if __name__ == "__main__":
   main(sys.argv[1:])
