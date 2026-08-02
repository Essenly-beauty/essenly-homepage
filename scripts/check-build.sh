#!/usr/bin/env bash
# Build-output assertions. Run after `npm run build`.
set -uo pipefail

FAILED=0
WHOLESALE="dist/wholesale/index.html"

assert_contains() {
  local file="$1" needle="$2" label="$3"
  if grep -qF -- "$needle" "$file"; then
    echo "  PASS  $label"
  else
    echo "  FAIL  $label — expected to find: $needle"
    FAILED=1
  fi
}

assert_absent() {
  local file="$1" needle="$2" label="$3"
  if [ ! -f "$file" ]; then
    echo "  FAIL  $label — file missing: $file"
    FAILED=1
  elif grep -qF -- "$needle" "$file"; then
    echo "  FAIL  $label — should not appear: $needle"
    FAILED=1
  else
    echo "  PASS  $label"
  fi
}

echo "Task 1 — wholesale data"
assert_contains "$WHOLESALE" "190ml" "net weight renders"
assert_contains "$WHOLESALE" "\$39.00" "MSRP renders"
assert_contains "$WHOLESALE" "Essenly RenewShell" "product name renders"
assert_contains "$WHOLESALE" "100% prepayment on all orders" "payment terms render"
assert_contains "$WHOLESALE" "6-10 business days" "lead time renders"
assert_contains "$WHOLESALE" "Ships from Seoul, Korea" "fulfillment origin renders"
assert_contains "$WHOLESALE" "Damaged or defective units only" "return terms render"
assert_contains "$WHOLESALE" "Ships DDP" "DDP shipping row renders"
assert_contains "$WHOLESALE" "Opening order" "glance opening-order row renders"
assert_contains "$WHOLESALE" "Minimum order" "terms minimum-order row renders"
assert_contains "$WHOLESALE" "30 units (one case)" "opening quantity renders"
assert_contains "$WHOLESALE" "credited against your first order" "sample terms render"
assert_contains "$WHOLESALE" "Key account" "fourth tier renders"
assert_contains "$WHOLESALE" "10 cases" "largest tier renders"
assert_absent "$WHOLESALE" "\$21.00" "opening tier price stays private"
assert_absent "$WHOLESALE" "\$15.60" "key account price stays private"
assert_absent "$WHOLESALE" "200ml" "wrong net weight absent"

echo "Task 2 — thank-you page"
THANKYOU="dist/thank-you/index.html"
if [ -f "$THANKYOU" ]; then
  echo "  PASS  /thank-you is built"
  assert_contains "$THANKYOU" "Thank you" "thank-you heading renders"
  assert_contains "$THANKYOU" "wholesale@essenly.beauty" "fallback email renders"
else
  echo "  FAIL  /thank-you is built — dist/thank-you/index.html missing"
  FAILED=1
fi
assert_absent "dist/sitemap-0.xml" "/thank-you" "thank-you excluded from sitemap"

echo "Task 3 — wholesale form"
assert_contains "$WHOLESALE" "https://api.web3forms.com/submit" "form posts to Web3Forms"
assert_contains "$WHOLESALE" 'name="access_key"' "access key field present"
assert_contains "$WHOLESALE" 'name="redirect"' "redirect field present"
assert_contains "$WHOLESALE" "https://essenly.beauty/thank-you" "redirect points at thank-you"
assert_contains "$WHOLESALE" 'name="botcheck"' "Web3Forms honeypot present"
assert_contains "$WHOLESALE" 'name="inquiry_type"' "inquiry type radio present"
assert_contains "$WHOLESALE" 'data-inquiry-type="Sample"' "sample button tagged for preselect"
assert_absent "$WHOLESALE" 'name="company_website"' "old honeypot removed"
assert_absent "$WHOLESALE" 'name="sample_request"' "old sample checkbox removed"

echo "Task 4 — contact form"
CONTACT="dist/contact/index.html"
assert_contains "$CONTACT" "https://api.web3forms.com/submit" "contact form posts to Web3Forms"
assert_contains "$CONTACT" 'name="access_key"' "contact access key field present"
assert_contains "$CONTACT" "https://essenly.beauty/thank-you" "contact redirect points at thank-you"
assert_contains "$CONTACT" 'name="botcheck"' "contact honeypot present"
assert_absent "$CONTACT" 'name="company_website"' "old contact honeypot removed"

echo "Task 5 — hero image"
assert_contains "$WHOLESALE" "/images/essenly/essenly-wholesale-hero.jpg" "hero src points at the jpg"
assert_contains "$WHOLESALE" "hero-portrait" "portrait class applied"
assert_absent "$WHOLESALE" "placeholder-stage" "hero renders an img, not a placeholder"
if [ -f "dist/images/essenly/essenly-wholesale-hero.jpg" ]; then
  echo "  PASS  hero asset copied to dist"
else
  echo "  FAIL  hero asset copied to dist"
  FAILED=1
fi
grep -qE "hero-portrait\{[^}]*aspect-ratio:[ ]*1200[ ]*/[ ]*1373" dist/_astro/*.css 2>/dev/null \
  && echo "  PASS  hero-portrait aspect-ratio shipped in CSS" \
  || { echo "  FAIL  hero-portrait aspect-ratio shipped in CSS"; FAILED=1; }

echo "Task 6 — product name consistency"
for page in dist/index.html dist/product/index.html dist/wholesale/index.html dist/contact/index.html; do
  assert_absent "$page" "Keratin Hair Mask" "old product name absent from $page"
done
assert_contains "dist/product/index.html" "Essenly RenewShell" "product page carries the canonical name"
assert_contains "dist/product/index.html" "Essenly Hair Mask" "product page uses the short name in prose"
assert_contains "dist/index.html" "Essenly Hair Mask" "home page uses the short name in prose"

exit $FAILED
