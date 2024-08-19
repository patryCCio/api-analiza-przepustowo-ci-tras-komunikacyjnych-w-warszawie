@echo off

echo Extracting OSM data...
docker run -t -v "D:\Work\inzynierka\warsaw-traffic-analysis-for-ztm\api\osrm:/data" osrm/osrm-backend osrm-extract -p /data/profiles/tram.lua /data/mazowieckie-latest-tram.osm.pbf

echo Partitioning OSM data...
docker run -t -v "D:\Work\inzynierka\warsaw-traffic-analysis-for-ztm\api\osrm:/data" osrm/osrm-backend osrm-partition /data/mazowieckie-latest-tram.osrm

echo Customizing OSM data...
docker run -t -v "D:\Work\inzynierka\warsaw-traffic-analysis-for-ztm\api\osrm:/data" osrm/osrm-backend osrm-customize /data/mazowieckie-latest-tram.osrm

pause
