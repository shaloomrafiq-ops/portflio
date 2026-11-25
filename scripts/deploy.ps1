# Uploads the built site (dist) to Netlify using a personal access token.
# The token is read from %USERPROFILE%\.netlify-token and never printed.
# Usage: npm run build; powershell -File scripts\deploy.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$tokenFile = Join-Path $env:USERPROFILE '.netlify-token'
if (-not (Test-Path $tokenFile)) { throw "Token file not found: $tokenFile" }
$token = (Get-Content $tokenFile -Raw).Trim()
$headers = @{ Authorization = "Bearer $token" }
$api = 'https://api.netlify.com/api/v1'

# Reuse the same site on later deploys.
$siteFile = Join-Path $root '.netlify-site.json'
if (Test-Path $siteFile) {
  $site = Get-Content $siteFile -Raw | ConvertFrom-Json
} else {
  $site = $null
  foreach ($name in @('shaloom-rafiq', 'shaloomrafiq', 'shaloom-rafiq-portfolio', 'shaloom-rafiq-films')) {
    try {
      $site = Invoke-RestMethod -Method Post -Uri "$api/sites" -Headers $headers -ContentType 'application/json' -Body (@{ name = $name } | ConvertTo-Json)
      break
    } catch {
      Write-Host "Name '$name' is not available, trying the next one."
    }
  }
  if (-not $site) { throw 'Could not create a Netlify site.' }
  @{ id = $site.id; name = $site.name } | ConvertTo-Json | Set-Content -Path $siteFile -Encoding utf8
}

$zip = Join-Path $root 'site.zip'
if (Test-Path $zip) { Remove-Item $zip -Confirm:$false }
Compress-Archive -Path (Join-Path $root 'dist\*') -DestinationPath $zip

$deploy = Invoke-RestMethod -Method Post -Uri "$api/sites/$($site.id)/deploys" -Headers $headers -ContentType 'application/zip' -InFile $zip
Write-Host "Deploy state: $($deploy.state)"
Write-Host "Live at: https://$($site.name).netlify.app"
