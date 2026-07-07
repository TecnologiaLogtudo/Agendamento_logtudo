import urllib.request
from pathlib import Path
url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzU2MDI0MDk1ZjVkNzRiN2Y5ODBlYTJhN2QyZDRlOTBmEgoSBhD5nu_WQxgBkgEjCgpwcm9qZWN0X2lkEhVCEzU4NTA4NjY2NDE3OTg1ODc3MDU&filename=&opi=89354086'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as r:
    data = r.read()
Path('screen_download.html').write_bytes(data)
print('Wrote', len(data), 'bytes to screen_download.html')
