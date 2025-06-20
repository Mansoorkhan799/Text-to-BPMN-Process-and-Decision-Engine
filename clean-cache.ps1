Write-Host "Cleaning Next.js cache..."

# Stop any running Next.js processes
Write-Host "Stopping any running Next.js processes..."
taskkill /F /IM node.exe 2>$null

# Remove .next directory
Write-Host "Removing .next directory..."
if (Test-Path -Path ".next") {
    Remove-Item -Recurse -Force .next
}

# Clear node_modules/.cache
Write-Host "Clearing node_modules/.cache..."
if (Test-Path -Path "node_modules/.cache") {
    Remove-Item -Recurse -Force node_modules/.cache
}

Write-Host "Cache cleaned successfully!"
Write-Host "You can now restart your Next.js application with 'npm run dev'" 