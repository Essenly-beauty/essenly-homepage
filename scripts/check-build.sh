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

exit $FAILED
