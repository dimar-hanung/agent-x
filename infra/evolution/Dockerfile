FROM evoapicloud/evolution-api:v2.3.7

WORKDIR /evolution

COPY antiban-preload.mjs /evolution/antiban-preload.mjs

RUN npm install --no-save --omit=dev --no-audit --no-fund --legacy-peer-deps \
  baileys-antiban \
  baileys-antiban-evolution

RUN node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); pkg.scripts['start:prod'] = 'node --import=/evolution/antiban-preload.mjs dist/main'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');"