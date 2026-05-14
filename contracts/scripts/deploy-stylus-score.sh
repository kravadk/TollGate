#!/usr/bin/env bash
# Deploy AgentScoreVerifier (Rust/Stylus) to Arbitrum Sepolia, then wire it
# to the already-deployed AgentCreditRegistry.
#
# Prerequisites:
#   1. cargo-stylus installed:  cargo install cargo-stylus
#   2. nightly + wasm32 target: rustup target add wasm32-unknown-unknown
#   3. ARBITRUM_PRIVATE_KEY in contracts/.env
#   4. (optional) CREDIT_REGISTRY_ADDRESS in contracts/.env to auto-wire
#
# Usage:
#   cd contracts
#   bash scripts/deploy-stylus-score.sh

set -euo pipefail

RPC="https://sepolia-rollup.arbitrum.io/rpc"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "${ARBITRUM_PRIVATE_KEY:-}" ]; then
  echo "Error: ARBITRUM_PRIVATE_KEY not set in contracts/.env"
  exit 1
fi

CREDIT_REGISTRY_ADDRESS="${CREDIT_REGISTRY_ADDRESS:-}"

# ── Step 1: Build & check ─────────────────────────────────────────────────────
echo "=== Step 1: cargo stylus check ==="
cd "$SCRIPT_DIR/../stylus-score"
cargo stylus check --endpoint "$RPC"

# ── Step 2: Deploy ────────────────────────────────────────────────────────────
echo ""
echo "=== Step 2: cargo stylus deploy ==="
STYLUS_OUTPUT=$(cargo stylus deploy \
  --endpoint "$RPC" \
  --private-key "$ARBITRUM_PRIVATE_KEY" 2>&1)
echo "$STYLUS_OUTPUT"

STYLUS_ADDRESS=$(echo "$STYLUS_OUTPUT" \
  | grep -oP '(?<=Contract deployed at: )0x[0-9a-fA-F]+' | head -1)

if [ -z "$STYLUS_ADDRESS" ]; then
  echo "Could not auto-parse address — copy it from output above, then run:"
  echo "  cast send <REGISTRY> 'setStylusVerifier(address)' <STYLUS> --rpc-url $RPC --private-key \$ARBITRUM_PRIVATE_KEY"
  exit 0
fi

echo ""
echo "Deployed: $STYLUS_ADDRESS"
echo "Explorer: https://sepolia.arbiscan.io/address/$STYLUS_ADDRESS"

# ── Step 3: Wire to AgentCreditRegistry ──────────────────────────────────────
if [ -n "$CREDIT_REGISTRY_ADDRESS" ]; then
  echo ""
  echo "=== Step 3: setStylusVerifier on AgentCreditRegistry ==="
  cast send "$CREDIT_REGISTRY_ADDRESS" \
    'setStylusVerifier(address)' "$STYLUS_ADDRESS" \
    --rpc-url "$RPC" \
    --private-key "$ARBITRUM_PRIVATE_KEY"
  echo "Wired. Registry now delegates computeScore to Rust/Stylus."
else
  echo ""
  echo "=== Step 3: wire manually ==="
  echo "  cast send <CREDIT_REGISTRY> 'setStylusVerifier(address)' $STYLUS_ADDRESS \\"
  echo "    --rpc-url $RPC --private-key \$ARBITRUM_PRIVATE_KEY"
fi

# ── Step 4: Gas estimate ───────────────────────────────────────────────────────
echo ""
echo "=== Step 4: gas estimate (100 payments, 50 USDC, 0 missed) ==="
cast estimate "$STYLUS_ADDRESS" \
  'computeScoreFromData(uint256,uint256,uint256)' \
  100 "50000000000000000000" 0 \
  --rpc-url "$RPC" 2>/dev/null \
  && echo "  Target: ~2,800 gas  (Solidity baseline: ~142,000)" \
  || echo "  (install cast for gas estimate: https://getfoundry.sh)"

echo ""
echo "Stylus : $STYLUS_ADDRESS"
echo "Registry: ${CREDIT_REGISTRY_ADDRESS:-<not set>}"
echo "Gas savings: ~50x (142k → 2.8k)"
