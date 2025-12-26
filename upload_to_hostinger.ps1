param(
    [string]$FtpHost = "82.25.120.159",
    [string]$FtpUser = "u539817673.erp.gulozar.com",
    [string]$FtpPassword = "Nihal@2025$",
    [string]$LocalZip = "C:\Users\nihal\Downloads\gst-master-erp\hostinger_deploy.zip"
)

Write-Host "Uploading hostinger_deploy.zip to Hostinger FTP..."
Write-Host "Host: $FtpHost"
Write-Host "User: $FtpUser"
Write-Host ""

$wc = New-Object System.Net.WebClient
$wc.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)

$uri = "ftp://$FtpHost/public_html/hostinger_deploy.zip"

try {
    Write-Host "Uploading (this may take a minute)..."
    $wc.UploadFile($uri, $LocalZip)
    Write-Host ""
    Write-Host "===== UPLOAD SUCCESS ====="
    Write-Host ""
    Write-Host "Next steps in Hostinger hPanel:"
    Write-Host "1. Go to Files > File Manager"
    Write-Host "2. Navigate to /public_html"
    Write-Host "3. Find hostinger_deploy.zip"
    Write-Host "4. Right-click > Extract"
    Write-Host "5. Move contents of deploy/dist/* to /public_html/"
    Write-Host "6. Go to Node.js Apps"
    Write-Host "7. Create/configure app with:"
    Write-Host "   - App Root: /home/u539817673/gst-erp"
    Write-Host "   - Startup file: index.js"
    Write-Host "8. Set environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT"
    Write-Host "9. Install & Start app"
    Write-Host ""
    Write-Host "Then visit: https://erp.gulozar.com"
} catch {
    Write-Error "Upload failed: $_"
    exit 1
}
