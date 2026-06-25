#!/usr/bin/env bash
# Regenerates api/_impl (the Vercel-native, self-contained copy) from the
# netlify/functions source of truth. Vercel runs native ESM and won't bundle
# cross-directory imports, so the handlers + shared code must live inside api/
# with explicit .js import extensions. Run this after editing netlify/functions.
set -euo pipefail
cd "$(dirname "$0")/.."

HANDLERS="create-checkout mock-payment connect-onboard connect-status \
expert-decision complete-session worker-confirm reschedule-response \
cancel-appointment raise-dispute admin-disputes admin-resolve-dispute stripe-webhook"

rm -rf api/_impl
mkdir -p api/_impl/_shared

cp netlify/functions/_shared/*.ts api/_impl/_shared/
cp lib/vercel-adapter.ts api/_impl/_shared/
for f in $HANDLERS; do cp "netlify/functions/$f.ts" api/_impl/; done

# 1) explicit .js on every relative import (native ESM requires it)
find api/_impl -name '*.ts' -exec sed -i -E "s/from '(\.\.?\/[^']*)'/from '\1.js'/g" {} \;
# 2) drop the @netlify/functions type import (not needed at runtime)
find api/_impl -name '*.ts' -exec sed -i -E "/@netlify\/functions/d" {} \;
# 3) Handler type -> any, and give the event param an explicit type
find api/_impl -name '*.ts' -exec sed -i -E "s/: Handler =/: any =/g" {} \;
sed -i 's/async (event) =>/async (event: any) =>/' api/_impl/*.ts

echo "✓ api/_impl regenerated from netlify/functions"
