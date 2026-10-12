Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 7890,7897,10808,10809,1080,8888,8889,2080,20171 } |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Sort-Object LocalPort -Unique |
  Format-Table -AutoSize
