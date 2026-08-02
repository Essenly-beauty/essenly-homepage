#!/usr/bin/env bash
# Build-output assertions. Run after `npm run build`.
set -uo pipefail

# Always run relative to the repo root, regardless of the caller's cwd.
cd "$(dirname "$0")/.."

FAILED=0
WHOLESALE="dist/wholesale/index.html"

assert_contains() {
  local file="$1" needle="$2" label="$3"
  if [ ! -f "$file" ]; then
    echo "  FAIL  $label — file missing: $file"
    FAILED=1
  elif grep -qF -- "$needle" "$file"; then
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

# The rule is "$39.00 is the only dollar figure on the page" — not a fixed
# blocklist of the tier prices we happen to know about today. Enumerate every
# dollar-looking token instead of naming individual figures, so a future
# repricing (or a stray $17.50/$19.50 from the rate card) fails loudly instead
# of shipping silently.
STRAY=$(grep -oE '\$[0-9][0-9,.]*' "$WHOLESALE" | sort -u | grep -vFx '$39.00')
if [ -z "$STRAY" ]; then
  echo "  PASS  MSRP is the only dollar figure"
else
  echo "  FAIL  MSRP is the only dollar figure — also found: $STRAY"
  FAILED=1
fi
assert_absent "$WHOLESALE" "200ml" "wrong net weight absent"

echo "Task 2 — thank-you page"
THANKYOU="dist/thank-you/index.html"
if [ -f "$THANKYOU" ]; then
  echo "  PASS  /thank-you is built"
  assert_contains "$THANKYOU" "Thank you" "thank-you heading renders"
  assert_contains "$THANKYOU" "wholesale@essenly.beauty" "fallback email renders"
  assert_contains "$THANKYOU" 'name="robots" content="noindex, follow"' "thank-you page is noindex"
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
assert_contains "$WHOLESALE" 'name="inquiry_type" value="Wholesale pricing" required' "inquiry type radio has required attribute"
assert_contains "$WHOLESALE" 'data-inquiry-type="Sample"' "sample button tagged for preselect"
assert_contains "$WHOLESALE" 'querySelectorAll("a[data-inquiry-type]")' "preselect script present"
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
assert_contains "$WHOLESALE" 'loading="eager"' "hero is eager-loaded, not lazy"
assert_contains "$WHOLESALE" 'fetchpriority="high"' "hero has fetchpriority high"
# The next two assertions assume global.css stays an external stylesheet
# (as it is today, imported via @import into a <style is:global> tag in
# Base.astro). If Astro's CSS-inlining threshold ever grows enough to swallow
# global.css into an inline <style> tag or a different chunk name, both the
# "placeholder-stage" absence check and the dist/_astro/*.css glob below would
# need to be revisited — the former would still work (it inspects the page
# HTML, not the CSS location) but the latter would start failing to find any
# matching file even though the CSS shipped correctly.
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

echo "Fix wave — tier table markup and copy"
# Astro injects a data-astro-cid-* attribute into every scoped-styled element,
# so it lands between the class attribute and the closing ">" — match on the
# opening tag prefix and the scope="col" attribute rather than a full tag.
assert_contains "$WHOLESALE" '<table class="tier-table"' "tier ladder is a real table"
assert_contains "$WHOLESALE" 'scope="col"' "tier table headers use scope=col"
assert_contains "$WHOLESALE" "90, 150 and 300 units" "volume pricing copy uses the spec's conjunction"

echo "Direct-email line"
# Web3Forms can only deliver to its own account's verified address, so submissions
# land at hq@. wholesale@ is the address a buyer is told to write to, and it must be
# visible while the form is on — not only in the no-key mailto fallback.
assert_contains "$WHOLESALE" "wholesale@essenly.beauty" "direct email address shown alongside the form"
assert_contains "$WHOLESALE" "Prefer to write to us directly" "direct-email invitation renders"
assert_absent "$WHOLESALE" "hq@essenly.beauty" "delivery address is not exposed on the page"

echo "Retail support"
# supportAssets used to be empty, which silently hid the whole section.
assert_contains "$WHOLESALE" "Retail support" "retail support section renders"
assert_contains "$WHOLESALE" "Gift-with-purchase stock for campaigns" "support assets render"
# The volume condition is a commercial term — it must appear both beside the
# section and in the terms table, and both must quote the same threshold.
assert_contains "$WHOLESALE" "Available from orders of 90 units" "support threshold shown with the section"
assert_contains "$WHOLESALE" "from orders of 90 units. Agreed per account" "support threshold shown in the terms table"
assert_contains "$WHOLESALE" "Marketing support" "marketing support row in the terms table"

echo "Contact page"
# The hero used to be a bare heading with the only address stranded in a
# one-card grid below it. It now names the address and links to the form.
assert_contains "$CONTACT" "Use the form below, or email" "contact hero points at both routes"
assert_contains "$CONTACT" "wholesale@essenly.beauty" "contact hero names the address"
assert_contains "$CONTACT" 'id="inquiry"' "form section is anchorable from the hero"
assert_contains "$CONTACT" 'name="inquiry_type"' "contact form uses the same radio pattern as wholesale"
assert_contains "$CONTACT" 'name="contact_name"' "contact form uses the shared contact_name field"
assert_absent "$CONTACT" 'name="category"' "old category select removed"
# Test the rendered element, not the class name — Astro inlines the scoped
# stylesheet into the page, so "contact-grid" is present in the CSS whether or
# not the section renders. `info-card` only appears if a card was emitted.
assert_absent "$CONTACT" "info-card" "single-method card grid stays hidden"

echo "Legal entity name"
# The company is Essenly Inc., not a Korean Co., Ltd. Every page reads the name from
# siteConfig.company.legalName — nothing hardcodes it, so this catches a reintroduction.
for page in dist/index.html dist/product/index.html dist/wholesale/index.html \
            dist/contact/index.html dist/privacy/index.html dist/terms/index.html; do
  assert_absent "$page" "Co., Ltd." "old legal entity absent from $page"
done
assert_contains "dist/index.html" "Essenly Inc." "home renders the legal entity"
assert_contains "dist/privacy/index.html" "Essenly Inc." "privacy meta renders the legal entity"

exit $FAILED
