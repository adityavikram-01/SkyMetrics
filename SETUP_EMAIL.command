#!/bin/zsh
set -e
ROOT="${0:A:h}"
echo 'SkyMetrics Gmail email setup'
echo 'Use a Google App Password for devwithujjwal@gmail.com, not your regular Google password.'
echo 'The password will not appear as you type.'
printf 'Paste your App Password and press Enter: '
stty -echo
trap 'stty echo' EXIT
IFS= read -r APP_PASSWORD
stty echo
trap - EXIT
echo
if [[ -z "${APP_PASSWORD// /}" ]]; then
  echo 'No password entered. Nothing changed.'
  read '?Press Enter to close.'
  exit 1
fi
SKYMETRICS_NEW_MAIL_PASSWORD="$APP_PASSWORD" SKYMETRICS_PROJECT_ROOT="$ROOT" python3 - <<'PY'
from pathlib import Path
import os

root = Path(os.environ['SKYMETRICS_PROJECT_ROOT'])
password = os.environ['SKYMETRICS_NEW_MAIL_PASSWORD'].replace(' ', '').strip()
values = {
    'SKYMETRICS_OWNER_EMAIL': 'devwithujjwal@gmail.com',
    'SKYMETRICS_MAIL_FROM': 'devwithujjwal@gmail.com',
    'SKYMETRICS_SMTP_HOST': 'smtp.gmail.com',
    'SKYMETRICS_SMTP_PORT': '587',
    'SKYMETRICS_SMTP_USERNAME': 'devwithujjwal@gmail.com',
    'SKYMETRICS_SMTP_PASSWORD': password,
}
for filename in ('.env', 'apix-backend/.env'):
    path = root / filename
    lines = path.read_text().splitlines()
    found = set()
    output = []
    for line in lines:
        key = line.split('=', 1)[0]
        if key in values:
            output.append(key + '=' + values[key])
            found.add(key)
        else:
            output.append(line)
    output.extend(key + '=' + value for key, value in values.items() if key not in found)
    path.write_text('\n'.join(output) + '\n')
    path.chmod(0o600)
PY
unset APP_PASSWORD
echo 'Email settings saved privately. Restart SkyMetrics to activate them.'
echo 'In Operations, Account email should then show Configured.'
read '?Press Enter to close.'
