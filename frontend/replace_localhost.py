import os
import glob

src_dir = '/Users/eldyear/Timesheet/frontend/src'

for filepath in glob.glob(os.path.join(src_dir, '**', '*.ts*'), recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace absolute localhost paths with environment variable backstops or relative paths
    # Assuming Vite proxies /api to backend in dev, and NGINX does it in prod.
    # So we can just use `/api/...` directly!
    if 'http://localhost:8000' in content:
        new_content = content.replace('http://localhost:8000', '')
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
