#!/usr/bin/env python3
import json, sys
from pathlib import Path
path = Path(__file__).resolve().parents[1] / "public/mock/checks-catalogue.json"
data = json.loads(path.read_text(encoding="utf-8"))
errors = []
checks = data.get("checks", [])
ids = [item.get("checkId") for item in checks]
if len(ids) != len(set(ids)): errors.append("duplicate checkId values found")
req_keys = {(r.get("frameworkId"), r.get("requirementId")) for r in data.get("requirements", [])}
framework_ids = {f.get("id") for f in data.get("frameworks", [])}
for check in checks:
    for key in ("checkId", "name", "description", "service", "resourceType", "severity", "assessmentStatus", "frameworkIds", "frameworkAssociations", "isCustom", "isModified", "isActive", "isArchived", "baseline"):
        if key not in check: errors.append(f"{check.get('checkId', '<unknown>')}: missing {key}")
    if check.get("severity") not in {"Critical", "High", "Medium", "Low"}: errors.append(f"{check.get('checkId')}: invalid severity")
    association_ids = sorted({m.get("frameworkId") for m in check.get("frameworkAssociations", [])})
    if association_ids != sorted(set(check.get("frameworkIds", []))): errors.append(f"{check.get('checkId')}: frameworkIds inconsistent with associations")
    for association in check.get("frameworkAssociations", []):
        if association.get("frameworkId") not in framework_ids: errors.append(f"{check.get('checkId')}: unknown framework {association.get('frameworkId')}")
        if (association.get("frameworkId"), association.get("requirementId")) not in req_keys: errors.append(f"{check.get('checkId')}: unknown requirement {association.get('frameworkId')}:{association.get('requirementId')}")
        if association.get("frameworkId") not in check.get("frameworkIds", []): errors.append(f"{check.get('checkId')}: mapping missing from frameworkIds")
if data.get("meta", {}).get("checkCount") != len(checks): errors.append("meta.checkCount does not match checks length")
if data.get("meta", {}).get("mappingCount") != sum(len(c.get("frameworkAssociations", [])) for c in checks): errors.append("meta.mappingCount does not match association count")
if errors:
    print("VALIDATION FAILED")
    print("\n".join(f"- {err}" for err in errors))
    sys.exit(1)
print(json.dumps({"status": "PASS", "checks": len(checks), "mappings": sum(len(c.get("frameworkAssociations", [])) for c in checks), "requirements": len(data.get("requirements", [])), "frameworks": len(data.get("frameworks", [])), "uniqueIds": len(set(ids)), "errors": []}, indent=2))
