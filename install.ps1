<#
Builds the theme and copies it into Equicord's themes folder as Tahoe.theme.css, with the bundle
inlined, so it needs no network and shows local changes. Equicord picks it up live.

    powershell -ExecutionPolicy Bypass -File install.ps1
#>
$ErrorActionPreference = "Stop"

node "$PSScriptRoot\build.mjs"
if ($LASTEXITCODE) { exit $LASTEXITCODE }

$themes = Join-Path $env:APPDATA "Equicord\themes"
New-Item -ItemType Directory -Force $themes | Out-Null
Copy-Item "$PSScriptRoot\build\Tahoe.local.theme.css" (Join-Path $themes "Tahoe.theme.css") -Force
"installed Tahoe.theme.css in $themes"
"In Discord: Settings > Equicord > Themes, enable Tahoe."
