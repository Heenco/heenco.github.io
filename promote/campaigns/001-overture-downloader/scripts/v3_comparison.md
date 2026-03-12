# COMPARISON — v3
> Hook: DuckDB vs. Overture Downloader — same data, very different experience.
> Platform: youtube-16x9 | Duration: 90s | Audience: gis-analyst

[SECTION 1 — SETUP 0:00–0:08]
There are a few ways to get Overture Maps data. I'm going to show you two of them side by side so you can decide which fits your workflow.

[SECTION 2 — THE HARD WAY 0:08–0:40]
Method one: the official Python CLI. Install overturemaps via pip, look up your bounding box coordinates from a separate tool, format them as west-south-east-north, run the download command, specify your output format, wait. It works — but if your pip environment is broken or you haven't touched the terminal in a while, that 'quick' data pull turns into a debugging session.

Method two: DuckDB. Write a SQL query against S3, make sure your region is set correctly, understand GeoParquet enough to export it properly. Again — totally valid if that's your world. But it's a lot of setup for 'I just need the roads for this district.'

[SECTION 3 — THE FAST WAY 0:40–1:10]
Method three: the Overture Downloader at heenco.com/tools/overture-downloader. Open browser. Draw a rectangle on the map over your area. Pick your dataset. Download. GeoJSON is in your folder in under a minute. Same Overture data, zero setup.

[SECTION 4 — VERDICT 1:10–1:30]
If you work with Overture regularly and live in the terminal, the CLI is great. If you need data quickly, you're on a shared computer, or you're handing this off to a non-developer — the browser tool is just faster. Both are free. Link to both in the description.