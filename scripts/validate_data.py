#!/usr/bin/env python3
"""Validate normalized data invariants for the demo."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "public/mock/normalized-dataset.json").read_text(encoding="utf-8"))
assets = data["assets"]
findings = data["findings"]
relationships = data["relationships"]
asset_uids = {asset["uid"] for asset in assets}
finding_uids = {finding["uid"] for finding in findings}
status_counts = Counter(finding["status"] for finding in findings)

assert len(assets) == 1568, f"Expected 1568 assets; got {len(assets)}"
assert len(findings) == 2200, f"Expected 2200 finding records; got {len(findings)}"
assert len(asset_uids) == len(assets), "Asset UIDs must be unique"
assert len(finding_uids) == len(findings), "Finding UIDs must be unique"
assert status_counts == {"PASS": 1240, "FAIL": 836, "MANUAL": 124}, status_counts
assert all(f["assetUid"] is None or f["assetUid"] in asset_uids for f in findings), "Finding references a missing asset"
assert all(r["sourceAssetUid"] in asset_uids and r["targetAssetUid"] in asset_uids for r in relationships), "Relationship references a missing asset"
assert all(f["scopeEntityUid"] is None or f["scopeEntityUid"].startswith("account:") for f in findings), "Invalid scope entity"
diag = data["meta"]["diagnostics"]
assert diag["assetLinkedFindings"] + diag["accountScopedFindings"] + diag["unresolvedFindings"] == len(findings), "Finding resolution totals do not reconcile"
assert not data["meta"]["historicalSnapshotsAvailable"], "Do not assert historical snapshots for this source set"
print("Normalized data validation: PASS")
print(f"Assets: {len(assets)} | findings: {len(findings)} | relationships: {len(relationships)}")
print(f"Statuses: {dict(status_counts)}")
print("Resolution: " + ", ".join(f"{k}={diag[k]}" for k in ["assetLinkedFindings", "accountScopedFindings", "unresolvedFindings"]))
print("Framework pass rates: " + ", ".join(f"{item['framework']}={item['observedPassRate']}%" for item in data["frameworkSummaries"]))
