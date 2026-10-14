@echo off
rem Germanio — starts brain (4317), speech lab (4318) and the web app (3000), then opens the browser.
cd /d "%~dp0"
start "" http://localhost:3000
pnpm start
