# DEMO — v1
> Hook: You can get free Overture Maps building data in 30 seconds — no Python, no terminal.
> Platform: youtube-16x9 | Duration: 75s | Audience: gis-analyst

[SECTION 1 — HOOK 0:00–0:05]
You already know Overture Maps data is free. The problem is actually getting it out.

[SECTION 2 — PROBLEM 0:05–0:20]
The official workflow? Install Python, set up a virtual env, figure out your bounding box coordinates, run a CLI command, hope it works. Or write a DuckDB SQL query against an S3 bucket. For a lot of us, that's half a day gone before we even open QGIS.

[SECTION 3 — SOLUTION 0:20–0:40]
I built something that skips all of that. Go to heenco.com/tools/overture-downloader. You get a map — just draw a rectangle around your area of interest. Pick your dataset: buildings, places, roads, addresses. Hit download. That's it. GeoJSON lands straight in your downloads folder, ready to drag into QGIS or ArcGIS.

[SECTION 4 — PROOF 0:40–1:00]
Watch — I'm grabbing building footprints for the Melbourne CBD right now. Bounding box drawn, buildings selected, downloading. Done. No installs, no credits burned, no terminal.

[SECTION 5 — CTA 1:00–1:15]
It's completely free to use. Link's in the description. If this saved you time, subscribe — I'm building more tools like this.