@echo off
docker run -t -i -p 5000:5000 -v D:\osrm-data:/data osrm/osrm-backend osrm-routed --algorithm mld /data/mazowieckie-latest.osrm