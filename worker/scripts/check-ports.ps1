Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 5173,5174,5175,8787,8080 } |
  Select-Object LocalAddress,LocalPort |
  Sort-Object LocalPort -Unique |
  Format-Table -AutoSize
