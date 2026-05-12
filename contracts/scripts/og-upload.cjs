/* Upload a file to 0G Storage and print its Merkle root + the storage tx.
 *
 *   cd contracts
 *   cp .env.example .env       # fill OG_STORAGE_RPC, OG_STORAGE_INDEXER, OG_PRIVATE_KEY
 *   npm install                # pulls @0glabs/0g-ts-sdk (optional dep)
 *   npm run upload:0g -- ./path/to/file
 *
 * The root hash this prints is exactly what the in-app "Pin to 0G Storage" widget
 * shows when VITE_0G_STORAGE_INDEXER is configured; here it's done from Node where
 * the official SDK runs cleanly. Graceful: if the SDK or env isn't set up it tells
 * you what's missing instead of crashing — the rest of the demo keeps working.
 */
require("dotenv").config();
const path = require("path");

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("usage: npm run upload:0g -- ./path/to/file");
    process.exitCode = 1;
    return;
  }

  const { OG_STORAGE_RPC, OG_STORAGE_INDEXER, OG_PRIVATE_KEY } = process.env;
  const missing = [];
  if (!OG_STORAGE_RPC) missing.push("OG_STORAGE_RPC");
  if (!OG_STORAGE_INDEXER) missing.push("OG_STORAGE_INDEXER");
  if (!OG_PRIVATE_KEY) missing.push("OG_PRIVATE_KEY");
  if (missing.length) {
    console.error(`Not configured — set ${missing.join(", ")} in contracts/.env (see .env.example).`);
    process.exitCode = 1;
    return;
  }

  let sdk;
  try {
    sdk = require("@0glabs/0g-ts-sdk");
  } catch {
    console.error("@0glabs/0g-ts-sdk is not installed. Run `npm install` inside contracts/ (it's an optional dependency).");
    process.exitCode = 1;
    return;
  }
  let ethers;
  try {
    ethers = require("ethers");
  } catch {
    console.error("ethers is not installed. Run `npm install` inside contracts/.");
    process.exitCode = 1;
    return;
  }

  const { ZgFile, Indexer } = sdk;
  const provider = new ethers.JsonRpcProvider(OG_STORAGE_RPC);
  const signer = new ethers.Wallet(OG_PRIVATE_KEY, provider);
  const indexer = new Indexer(OG_STORAGE_INDEXER);

  const abs = path.resolve(filePath);
  console.log(`Uploading ${abs} to 0G Storage…`);
  const file = await ZgFile.fromFilePath(abs);
  try {
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) throw treeErr;
    const rootHash = tree.rootHash();
    console.log(`Merkle root: ${rootHash}`);

    const [tx, uploadErr] = await indexer.upload(file, OG_STORAGE_RPC, signer);
    if (uploadErr) throw uploadErr;
    console.log("");
    console.log("✓ Stored on 0G Storage");
    console.log(`  root: ${rootHash}`);
    console.log(`  tx:   ${tx}`);
    const explorerBase = (process.env.OG_EXPLORER_URL || "https://chainscan-galileo.0g.ai").replace(/\/+$/, "");
    console.log(`  explorer: ${explorerBase}/tx/${tx}`);
  } finally {
    await file.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
