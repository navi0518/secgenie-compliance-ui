#!/usr/bin/env python3
"""Normalize SecGenie/AWS discovery and framework finding exports for the demo UI.

Run from project root: python scripts/normalize_data.py
The script preserves raw finding records, records source scan IDs, links only by
explicit identity matches, and leaves unresolved findings unattached.
"""
from __future__ import annotations
import json, hashlib
from datetime import datetime, timezone
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-data"
OUT = ROOT / "public" / "mock" / "normalized-dataset.json"
FRAMEWORK_FILES = [
    ("CIS-5.0", "CIS-5.0_findings.json"),
    ("CIS-8.1", "CIS-8.1_findings.json"),
    ("ISO27001-2013", "ISO27001-2013_findings.json"),
]

def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)

def norm(value: Any) -> str:
    return str(value or "").strip().lower()

def sha(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]

def finding_slug(framework: str) -> str:
    return framework.lower().replace(".", "").replace(":", "-")

def main() -> None:
    discovery = load_json(SOURCE / "asset_discovery.json")
    raw_assets = discovery.get("assets", [])
    account_ids = sorted({str(a.get("accountId")) for a in raw_assets if a.get("accountId")})
    accounts = [{"uid": f"account:{account_id}", "accountId": account_id,
                 "label": f"AWS Account {account_id}", "kind": "account"} for account_id in account_ids]

    assets: list[dict[str, Any]] = []
    by_asset_id: dict[str, dict[str, Any]] = {}
    by_arn: dict[str, dict[str, Any]] = {}
    by_resource_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_region_resource: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for index, a in enumerate(raw_assets):
        asset_id = str(a.get("assetId") or f"unknown-asset-{index}")
        uid = f"asset:{sha(asset_id)}"
        tags = a.get("tags") if isinstance(a.get("tags"), dict) else {}
        compliance = {}
        asset = {
            "uid": uid,
            "assetId": asset_id,
            "arn": a.get("arn"),
            "resourceId": str(a.get("resourceId") or ""),
            "accountId": a.get("accountId"),
            "region": str(a.get("region") or "unknown"),
            "resourceType": str(a.get("resourceType") or "unknown"),
            "resourceTypeName": str(a.get("resourceTypeName") or a.get("resourceType") or "Unknown resource"),
            "name": str(a.get("assetDisplayName") or a.get("assetName") or a.get("resourceId") or asset_id),
            "assetName": a.get("assetName"),
            "assetDisplayName": a.get("assetDisplayName"),
            "description": (a.get("additionalAttributes") or {}).get("description"),
            "active": bool(a.get("active", False)),
            "status": a.get("status"),
            "assetCriticality": a.get("assetCriticality"),
            "businessCriticality": a.get("businessCriticality"),
            "riskLevel": a.get("riskLevel"),
            "riskScore": a.get("riskScore"),
            "exposureLevel": a.get("exposureLevel"),
            "isExposedPublicly": a.get("isExposedPublicly"),
            "attackPathCount": int(a.get("attackPathCount") or 0),
            "environment": a.get("environment"),
            "owner": a.get("owner"),
            "createdDate": a.get("createdDate"),
            "discoveredAt": a.get("discoveredAt"),
            "firstSeen": a.get("firstSeen"),
            "lastSeen": a.get("lastSeen"),
            "stale": bool(a.get("stale", False)),
            "tags": {str(k): str(v) for k, v in tags.items()},
            "additionalAttributes": a.get("additionalAttributes") or {},
            "derivedFindingsCount": 0,
            "complianceByFramework": compliance,
        }
        assets.append(asset)
        by_asset_id[norm(asset_id)] = asset
        if a.get("arn"):
            by_arn[norm(a["arn"])] = asset
        if a.get("resourceId"):
            by_resource_id[norm(a["resourceId"])].append(asset)
            by_region_resource[(norm(a.get("region")), norm(a["resourceId"]))].append(asset)
        for name in (a.get("assetName"), a.get("assetDisplayName")):
            if name:
                by_name[norm(name)].append(asset)

    def resolve_resource(resource_id: Any, region: Any = None) -> tuple[dict[str, Any] | None, str | None]:
        """Resolve exact ARN/resource ID, then a region-constrained ARN suffix."""
        rid = norm(resource_id)
        if not rid:
            return None, None
        if rid in by_arn:
            return by_arn[rid], "arn"
        if rid in by_asset_id:
            return by_asset_id[rid], "assetId"
        candidates = by_resource_id.get(rid, [])
        if region:
            regional = [a for a in candidates if norm(a.get("region")) == norm(region)]
            candidates = regional or candidates
        if len(candidates) == 1:
            return candidates[0], "resourceId"
        # Most AWS ARN resource identifiers end after ':' and use '/' or ':'.
        # Resolve the terminal token only when the result is unique and region-compatible.
        if rid.startswith("arn:"):
            suffix = rid.rsplit("/", 1)[-1].rsplit(":", 1)[-1]
            candidates = by_resource_id.get(norm(suffix), [])
            if region:
                regional = [a for a in candidates if norm(a.get("region")) == norm(region)]
                candidates = regional or candidates
            if len(candidates) == 1:
                return candidates[0], "resourceId"
        return None, None

    findings: list[dict[str, Any]] = []
    source_scan_ids: dict[str, str] = {}
    signatures = Counter()
    framework_raw: dict[str, list[dict[str, Any]]] = defaultdict(list)
    diagnostics = Counter()

    # Flatten in source order. The stable record key is intentionally distinct from findingId,
    # because source finding IDs repeat for some records.
    for framework, filename in FRAMEWORK_FILES:
        data = load_json(SOURCE / filename)
        source_scan_ids[framework] = str(data.get("scanId") or "unknown")
        record_index = 0
        for parent_index, parent in enumerate(data.get("assets", [])):
            parent_asset_id = str(parent.get("assetId") or "")
            for framework_group_index, group in enumerate(parent.get("frameworks", [])):
                for child_index, original in enumerate(group.get("findings", [])):
                    record_index += 1
                    raw = original
                    extra = raw.get("extra") or {}
                    status_raw = str(raw.get("status") or "MANUAL").upper()
                    status = status_raw if status_raw in {"PASS", "FAIL", "MANUAL"} else "MANUAL"
                    scope_raw = norm(extra.get("scope"))
                    scope = "account" if scope_raw == "account" else ("resource" if scope_raw == "resource" else "unknown")
                    source_record_id = f"{finding_slug(framework)}:{parent_index + 1:04d}:{framework_group_index + 1:02d}:{child_index + 1:04d}"
                    uid = f"finding:{finding_slug(framework)}:{record_index:04d}"
                    matched = None
                    method = "unresolved"
                    confidence = "unresolved"
                    account_id = None
                    scope_entity_uid = None

                    if scope == "account":
                        # Account-scope findings are not attached to an arbitrary asset.
                        account_id = str(parent_asset_id.rsplit(":", 1)[-1] or "unknown")
                        rid = str(extra.get("resourceid") or "")
                        parts = rid.split(":")
                        if rid.startswith("arn:") and len(parts) > 4 and parts[4] in account_ids:
                            account_id = parts[4]
                        if account_id in account_ids:
                            method, confidence = "account", "high"
                            scope_entity_uid = f"account:{account_id}"
                        else:
                            scope = "unknown"
                    else:
                        matched = by_asset_id.get(norm(parent_asset_id))
                        if matched:
                            method, confidence = "assetId", "high"
                        else:
                            matched, how = resolve_resource(extra.get("resourceid"), extra.get("region"))
                            if not matched:
                                matched, how = resolve_resource(parent_asset_id, extra.get("region"))
                            if matched:
                                method, confidence = how or "resourceId", "high"
                            else:
                                method, confidence = "unresolved", "unresolved"
                    asset_uid = matched["uid"] if matched and scope == "resource" else None
                    if asset_uid:
                        diagnostics["assetLinkedFindings"] += 1
                        matched["derivedFindingsCount"] += 1
                        summary = matched["complianceByFramework"].setdefault(framework, {"pass": 0, "fail": 0, "manual": 0})
                        summary[status.lower()] += 1
                    elif scope == "account":
                        diagnostics["accountScopedFindings"] += 1
                    else:
                        diagnostics["unresolvedFindings"] += 1

                    check_id = str(extra.get("checkid") or raw.get("checkId") or "unknown")
                    requirement_id = str(extra.get("requirements_id") or raw.get("requirementId") or "unknown")
                    region = extra.get("region")
                    signature_source = "|".join([framework, requirement_id, check_id,
                                                 str(extra.get("resourceid") or parent_asset_id),
                                                 str(region or ""), status])
                    signature = sha(signature_source)
                    signatures[signature] += 1
                    row = {
                        "uid": uid,
                        "sourceFindingId": extra.get("findingId"),
                        "sourceRecordId": source_record_id,
                        "framework": framework,
                        "sourceScanId": str(data.get("scanId") or "unknown"),
                        "sourceAssetId": parent_asset_id,
                        "assetUid": asset_uid,
                        "scopeEntityUid": scope_entity_uid,
                        "scope": scope,
                        "identityResolution": {"method": method, "confidence": confidence},
                        "checkId": check_id,
                        "requirementId": requirement_id,
                        "requirementDescription": str(extra.get("requirements_description") or raw.get("description") or "Requirement description unavailable"),
                        "status": status,
                        "severity": raw.get("severity"),
                        "region": region,
                        "evidence": {
                            "statusExtended": extra.get("statusextended"),
                            "rationale": extra.get("RationaleStatement"),
                            "impact": extra.get("ImpactStatement"),
                            "remediation": extra.get("RemediationProcedure"),
                            "additionalInformation": extra.get("AdditionalInformation"),
                            "references": extra.get("References"),
                        },
                        "findingSignature": signature,
                        "duplicateCandidate": False,
                        "raw": raw,
                    }
                    findings.append(row)
                    framework_raw[framework].append(row)

    for finding in findings:
        finding["duplicateCandidate"] = signatures[finding["findingSignature"]] > 1

    # Derive relationship edges only for explicit reference-bearing discovery fields.
    assets_by_uid = {a["uid"]: a for a in assets}
    relationships: list[dict[str, Any]] = []
    edge_seen = set()
    reference_fields = {
        "vpcId": "uses_vpc", "subnetId": "deployed_in_subnet",
        "securityGroups": "attached_security_group", "securityGroupIds": "attached_security_group",
        "iamInstanceProfile": "uses_instance_profile", "iamInstanceProfileRoleArns": "assumes_role",
        "linkedEcrRepositories": "uses_ecr_repository", "linkedLogGroups": "writes_to_log_group",
        "linkedSecrets": "references_secret", "volumeIds": "attached_volume",
        "networkInterfaceIds": "has_network_interface", "routeTableId": "uses_route_table",
        "kmsKeyId": "encrypted_with_key", "role": "assumes_role",
    }
    for source in assets:
        attrs = source.get("additionalAttributes") or {}
        candidate_refs: list[tuple[str, Any]] = []
        for field, rel_type in reference_fields.items():
            if field in attrs:
                value = attrs[field]
                values = value if isinstance(value, list) else [value]
                for item in values:
                    if isinstance(item, (str, int)) and str(item).strip():
                        candidate_refs.append((field + "|" + rel_type, str(item)))
        # Some Lambda data nests the references under vpcConfig.
        vpc_config = attrs.get("vpcConfig")
        if isinstance(vpc_config, dict):
            for field, rel_type in [("subnetIds", "deployed_in_subnet"), ("securityGroupIds", "attached_security_group")]:
                value = vpc_config.get(field) or []
                for item in value if isinstance(value, list) else [value]:
                    candidate_refs.append(("vpcConfig." + field + "|" + rel_type, str(item)))
        for source_field_and_type, raw_ref in candidate_refs:
            source_field, rel_type = source_field_and_type.split("|", 1)
            target, how = resolve_resource(raw_ref, source.get("region"))
            if not target or target["uid"] == source["uid"]:
                continue
            edge_key = (source["uid"], target["uid"], rel_type, source_field)
            if edge_key in edge_seen:
                continue
            edge_seen.add(edge_key)
            relationships.append({
                "uid": f"relationship:{sha('|'.join(edge_key))}",
                "sourceAssetUid": source["uid"], "targetAssetUid": target["uid"],
                "relationshipType": rel_type, "sourceField": source_field,
                "inferred": False, "confidence": "high" if how else "medium",
            })

    framework_summaries = []
    for framework, _ in FRAMEWORK_FILES:
        rows = framework_raw[framework]
        counts = Counter(row["status"] for row in rows)
        evaluated = counts["PASS"] + counts["FAIL"]
        framework_summaries.append({
            "framework": framework,
            "pass": counts["PASS"], "fail": counts["FAIL"], "manual": counts["MANUAL"],
            "evaluated": evaluated,
            "observedPassRate": round(counts["PASS"] / evaluated * 100, 1) if evaluated else None,
            "distinctChecks": len({row["checkId"] for row in rows}),
            "distinctRequirements": len({row["requirementId"] for row in rows}),
        })

    failed_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in findings:
        if row["status"] == "FAIL":
            failed_groups[(row["framework"], row["checkId"])].append(row)
    top_failed_checks = []
    for (framework, check_id), rows in failed_groups.items():
        examples = [r["requirementDescription"] for r in rows]
        top_failed_checks.append({
            "framework": framework, "checkId": check_id, "failCount": len(rows),
            "requirementDescriptions": list(dict.fromkeys(examples))[:3],
            "requirementIds": list(dict.fromkeys(r["requirementId"] for r in rows))[:8],
        })
    top_failed_checks.sort(key=lambda x: x["failCount"], reverse=True)

    meta = {
        "accountIds": account_ids,
        "sourceScanIds": {"discovery": str(discovery.get("scanId") or "unknown"), "compliance": source_scan_ids},
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "historicalSnapshotsAvailable": False,
        "scanAlignmentWarning": "Discovery and framework source scan IDs differ. Resource matches are identity-based, but these records are not asserted to be from the same scan run.",
        "diagnostics": {
            **dict(diagnostics),
            "inventoryAssetCount": len(assets),
            "findingRecordCount": len(findings),
            "duplicateCandidateCount": sum(1 for f in findings if f["duplicateCandidate"]),
            "accountScopedEntityCount": len(accounts),
            "relationshipCount": len(relationships),
        },
    }
    output = {
        "meta": meta, "accounts": accounts, "assets": assets, "findings": findings,
        "relationships": relationships, "frameworkSummaries": framework_summaries,
        "topFailedChecks": top_failed_checks,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps({"output": str(OUT), "bytes": OUT.stat().st_size,
                      "meta": meta, "frameworkSummaries": framework_summaries,
                      "topFailedChecks": top_failed_checks[:5]}, indent=2))

if __name__ == "__main__":
    main()
