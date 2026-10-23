#!/usr/bin/env python3
"""Build a unified Check Catalogue from four enriched benchmark definitions."""
from __future__ import annotations
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ("CIS-5.0", "source-data/enriched/cis_5.0_aws_enriched.json"),
    ("CIS-8.0", "source-data/enriched/cis_8.0_aws_enriched.json"),
    ("CIS-8.1", "source-data/enriched/cis_8.1_aws_enriched.json"),
    ("ISO27001-2013", "source-data/enriched/iso27001_2013_aws_enriched.json"),
]

def first_nonempty(values):
    return next((v for v in values if isinstance(v, str) and v.strip()), "")

def extract_cli(text: str) -> str:
    fenced = re.findall(r"```(?:bash|sh|shell|console)?\s*\n(.*?)```", text or "", flags=re.I | re.S)
    for block in fenced:
        if re.search(r"\baws\s+[a-z0-9-]+", block, re.I):
            return block.strip()
    lines = [line.strip(" `") for line in (text or "").splitlines() if re.search(r"\baws\s+[a-z0-9-]+", line, re.I)]
    return "\n".join(lines[:8])

def attr_val(attrs, *keys):
    for attr in attrs or []:
        for key in keys:
            value = attr.get(key)
            if isinstance(value, str) and value.strip(): return value.strip()
    return ""

checks = {}
frameworks = []
all_requirements = []
for framework_id, rel in SOURCES:
    data = json.loads((ROOT / rel).read_text(encoding="utf-8"))
    frameworks.append({
        "id": framework_id, "name": data.get("Name", framework_id), "version": data.get("Version", ""),
        "framework": data.get("Framework", ""), "provider": data.get("Provider", "AWS"),
        "requirementsCount": len(data.get("Requirements", [])),
    })
    for req in data.get("Requirements", []):
        attrs = req.get("Attributes") or []
        all_requirements.append({
            "frameworkId": framework_id,
            "frameworkName": data.get("Name", framework_id),
            "frameworkVersion": str(data.get("Version", "")),
            "requirementId": str(req.get("Id", "")),
            "requirementDescription": str(req.get("Description", "")),
            "requirementName": str(req.get("Name", "") or attr_val(attrs, "Objetive_Name", "Objective_Name")),
            "category": attr_val(attrs, "Category", "Section"),
            "profile": attr_val(attrs, "Profile"),
            "assessmentStatus": attr_val(attrs, "AssessmentStatus"),
            "attributes": attrs[0] if attrs else {},
            "hasMappedChecks": bool(req.get("Checks")),
        })
        for check in req.get("Checks") or []:
            cid = check.get("check_id")
            if not cid: continue
            entry = checks.get(cid)
            remediation = attr_val(attrs, "RemediationProcedure")
            audit = attr_val(attrs, "AuditProcedure")
            mapping = {
                "frameworkId": framework_id,
                "frameworkName": data.get("Name", framework_id),
                "frameworkVersion": str(data.get("Version", "")),
                "requirementId": str(req.get("Id", "")),
                "requirementDescription": str(req.get("Description", "")),
                "requirementName": str(req.get("Name", "") or attr_val(attrs, "Objetive_Name", "Objective_Name")),
                "category": attr_val(attrs, "Category", "Section"),
                "profile": attr_val(attrs, "Profile"),
                "assessmentStatus": attr_val(attrs, "AssessmentStatus"),
                "description": attr_val(attrs, "Description"),
                "rationaleStatement": attr_val(attrs, "RationaleStatement"),
                "impactStatement": attr_val(attrs, "ImpactStatement"),
                "remediationProcedure": remediation,
                "auditProcedure": audit,
                "references": attr_val(attrs, "References"),
                "sourceAttributes": attrs[0] if attrs else {},
            }
            if entry is None:
                check_base = {
                    "checkId": cid,
                    "name": str(check.get("name") or cid),
                    "description": str(check.get("description") or ""),
                    "service": str(check.get("service") or "Uncategorized"),
                    "resourceType": str(check.get("resource_type") or "Unknown"),
                    "severity": check.get("severity") if check.get("severity") in {"Critical", "High", "Medium", "Low"} else "Medium",
                    "rationaleStatement": mapping["rationaleStatement"],
                    "impactStatement": mapping["impactStatement"],
                    "assessmentStatus": mapping["assessmentStatus"] or "Unspecified",
                    "remediationProcedure": remediation,
                    "consoleRemediation": remediation,
                    "cliRemediation": extract_cli(remediation),
                    "auditProcedure": audit,
                }
                entry = {**check_base, "frameworkAssociations": [], "isCustom": False, "isModified": False, "isActive": True, "isArchived": False, "baseline": check_base}
                checks[cid] = entry
            # Keep unique mapping records only.
            if not any(m["frameworkId"] == framework_id and m["requirementId"] == mapping["requirementId"] for m in entry["frameworkAssociations"]):
                entry["frameworkAssociations"].append(mapping)
            # Fill blank metadata from the first usable framework source.
            for field in ("rationaleStatement", "impactStatement", "remediationProcedure", "consoleRemediation", "cliRemediation", "auditProcedure"):
                if not entry.get(field):
                    candidate = {"rationaleStatement": mapping["rationaleStatement"], "impactStatement": mapping["impactStatement"], "remediationProcedure": remediation, "consoleRemediation": remediation, "cliRemediation": extract_cli(remediation), "auditProcedure": audit}[field]
                    if candidate: entry[field] = candidate
            statuses = {m["assessmentStatus"] for m in entry["frameworkAssociations"] if m.get("assessmentStatus")}
            entry["assessmentStatus"] = next(iter(statuses)) if len(statuses) == 1 else ("Mixed" if statuses else "Unspecified")
            entry["frameworkIds"] = sorted({m["frameworkId"] for m in entry["frameworkAssociations"]})
for check in checks.values():
    check["frameworkAssociations"].sort(key=lambda x: (x["frameworkId"], x["requirementId"]))
    check["frameworkIds"] = sorted(set(check["frameworkIds"]))
    check["frameworkCoverageCount"] = len(check["frameworkIds"])
    check["baseline"] = {k: check.get(k) for k in ("name", "description", "service", "resourceType", "severity", "rationaleStatement", "impactStatement", "assessmentStatus", "remediationProcedure", "consoleRemediation", "cliRemediation", "auditProcedure", "frameworkAssociations")}

out = {
    "meta": {
        "generatedFrom": [p for _, p in SOURCES],
        "generatedAt": "build-time",
        "checkCount": len(checks),
        "mappingCount": sum(len(c["frameworkAssociations"]) for c in checks.values()),
        "standardCheckCount": len(checks),
        "customCheckCount": 0,
        "note": "Baseline catalogue generated from enriched framework definitions. Execution state and finding counts are initialized as demo values and must be hydrated from the secured backend in production."
    },
    "frameworks": frameworks,
    "requirements": all_requirements,
    "auditLog": [],
    "checks": sorted(checks.values(), key=lambda x: x["name"].casefold()),
}
(ROOT / "public/mock/checks-catalogue.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"checks": len(checks), "mappingCount": out["meta"]["mappingCount"], "frameworks": len(frameworks), "requirements": len(all_requirements), "out": "public/mock/checks-catalogue.json"}, indent=2))
