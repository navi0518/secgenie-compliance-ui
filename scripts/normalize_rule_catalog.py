#!/usr/bin/env python3
"""Normalize the supplied AWS benchmark JSON definitions into a rule catalog.

Source fields are preserved. Canonical categories are UI grouping hints only.
Unique checks have one global enabled state, while requirement mappings remain
separate records so cross-framework coverage is visible.
"""
from __future__ import annotations
import json, re
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "source-data"
OUTPUT = ROOT / "public" / "mock" / "rule-catalog.json"

FILES = [
    ("CIS-5.0", "cis_5.0_aws.json"),
    ("CIS-8.0", "cis_8.0_aws.json"),
    ("ISO27001-2013", "iso27001_2013_aws.json"),
]


def nullable(value):
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


def canonical_category(source_section: str, check_id: str) -> str:
    s = (source_section or "").lower()
    c = (check_id or "").lower()
    if any(x in s for x in ("identity", "access control", "iam")) or c.startswith("iam_") or c.startswith("account_"):
        return "Identity & Access Management"
    if any(x in s for x in ("storage", "data protection")) or c.startswith(("s3_", "rds_", "ebs_", "kms_", "redshift_", "dynamodb_")):
        return "Storage & Data Protection"
    if any(x in s for x in ("network", "communications security")) or c.startswith(("vpc_", "ec2_securitygroup_", "elb", "elbv2_", "apigateway_", "cloudfront_", "transfer_server_", "waf_")):
        return "Networking & Edge"
    if any(x in s for x in ("cryptography", "cryptographic")) or any(x in c for x in ("encrypt", "cipher", "pqc_tls", "kms_")):
        return "Cryptography & Encryption"
    if any(x in s for x in ("monitor", "logging", "operations security", "incident response", "vulnerability management", "network monitoring")) or c.startswith(("cloudtrail_", "cloudwatch_", "guardduty_", "securityhub_", "inspector", "config_recorder", "vpc_flow_logs")):
        return "Monitoring & Security Operations"
    if any(x in s for x in ("software assets", "enterprise assets", "secure configuration")) or c.startswith(("ec2_ami_", "ec2_ebs_", "ecr_", "lambda_", "eks_", "ecs_", "opensearch_")):
        return "Compute & Asset Inventory"
    return "Other Controls"


def extract_procedures(text):
    """Best-effort split of labelled Console and CLI subsections; never discard raw source."""
    raw = nullable(text)
    if not raw:
        return {"rawRemediationProcedure": None, "consoleRemediation": None,
                "cliRemediation": None, "remediationMode": "missing"}
    marker = re.compile(r"(?i)(?:\*\*\s*)?(from\s+console|from\s+command\s+line|from\s+cli|command\s+line\s*:)(?:\s*\*\*)?\s*:?")
    matches = list(marker.finditer(raw))
    console = None
    cli = None
    if matches:
        for idx, m in enumerate(matches):
            start = m.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw)
            segment = raw[start:end].strip(" \t\r\n:*-")
            label = m.group(1).lower()
            if "console" in label and console is None:
                console = nullable(segment)
            elif ("command" in label or "cli" in label) and cli is None:
                cli = nullable(segment)
    mode = "split" if console or cli else "general"
    if not console and not cli:
        # Keep generic narrative as a fallback presentation; do not claim it is CLI-specific.
        console = raw
    return {"rawRemediationProcedure": raw,
            "consoleRemediation": console,
            "cliRemediation": cli,
            "remediationMode": mode}


def get_attrs(req):
    attrs = req.get("Attributes") or []
    return attrs if attrs else [{}]


def normalize():
    framework_meta = []
    mappings = []
    raw_frameworks = {}
    for framework_id, filename in FILES:
        with (SOURCE_DIR / filename).open(encoding="utf-8") as f:
            source = json.load(f)
        raw_frameworks[framework_id] = source
        framework_meta.append({
            "id": framework_id,
            "name": source.get("Name", framework_id),
            "version": str(source.get("Version", "")),
            "provider": source.get("Provider", "AWS"),
            "description": source.get("Description", ""),
            "sourceFile": filename,
            "requirementsCount": len(source.get("Requirements", [])),
        })
        for req in source.get("Requirements", []):
            checks = req.get("Checks") or []
            for attr_index, attr in enumerate(get_attrs(req)):
                source_section = (attr.get("Section") or attr.get("Category") or req.get("Name") or req.get("Description") or "Uncategorized")
                for check_id in checks:
                    proc = extract_procedures(attr.get("RemediationProcedure"))
                    mappings.append({
                        "mappingUid": f"{framework_id}:{req.get('Id','unknown')}:{check_id}:{attr_index}",
                        "frameworkId": framework_id,
                        "frameworkName": source.get("Name", framework_id),
                        "frameworkVersion": str(source.get("Version", "")),
                        "requirementId": str(req.get("Id", "")),
                        "requirementDescription": req.get("Description") or req.get("Name") or "",
                        "requirementName": req.get("Name"),
                        "sourceSection": source_section,
                        "canonicalCategory": canonical_category(source_section, check_id),
                        "checkId": check_id,
                        "profile": nullable(attr.get("Profile")),
                        "assessmentStatus": nullable(attr.get("AssessmentStatus")),
                        "description": nullable(attr.get("Description") or attr.get("Check_Summary")),
                        "rationaleStatement": nullable(attr.get("RationaleStatement")),
                        "impactStatement": nullable(attr.get("ImpactStatement")),
                        **proc,
                        "auditProcedure": nullable(attr.get("AuditProcedure")),
                        "additionalInformation": nullable(attr.get("AdditionalInformation")),
                        "references": nullable(attr.get("References")),
                        "defaultValue": nullable(attr.get("DefaultValue")),
                        "objectiveId": nullable(attr.get("Objetive_ID") or attr.get("Objective_ID")),
                        "objectiveName": nullable(attr.get("Objetive_Name") or attr.get("Objective_Name") or req.get("Name")),
                        "sourceAttributes": attr,
                    })

    # Mark generic procedure boilerplate shared across many checks so the detail UI
    # can warn analysts before they treat source text as a check-specific runbook.
    remediation_users = defaultdict(set)
    audit_users = defaultdict(set)
    for mapping in mappings:
        remediation = mapping.get("rawRemediationProcedure")
        audit = mapping.get("auditProcedure")
        if remediation:
            remediation_users[(mapping["frameworkId"], remediation)].add(mapping["checkId"])
        if audit:
            audit_users[(mapping["frameworkId"], audit)].add(mapping["checkId"])
    for mapping in mappings:
        remediation = mapping.get("rawRemediationProcedure")
        audit = mapping.get("auditProcedure")
        mapping["remediationSharedCheckCount"] = len(remediation_users[(mapping["frameworkId"], remediation)]) if remediation else 0
        mapping["auditSharedCheckCount"] = len(audit_users[(mapping["frameworkId"], audit)]) if audit else 0

    frameworks_by_check = defaultdict(set)
    mappings_by_check = defaultdict(list)
    for mapping in mappings:
        frameworks_by_check[mapping["checkId"]].add(mapping["frameworkId"])
        mappings_by_check[mapping["checkId"]].append(mapping)

    rules = []
    for check_id in sorted(mappings_by_check):
        rule_mappings = sorted(mappings_by_check[check_id], key=lambda m: (m["frameworkId"], m["requirementId"]))
        profile_values = {m["profile"] for m in rule_mappings if m["profile"]}
        status_values = {m["assessmentStatus"] for m in rule_mappings if m["assessmentStatus"]}
        rules.append({
            "checkId": check_id,
            "enabled": True,
            "frameworkIds": sorted(frameworks_by_check[check_id]),
            "isCrossFramework": len(frameworks_by_check[check_id]) > 1,
            "frameworkCount": len(frameworks_by_check[check_id]),
            "mappingCount": len(rule_mappings),
            "profiles": sorted(profile_values),
            "assessmentStatuses": sorted(status_values),
            "assessmentMode": "Mixed" if len(status_values) > 1 else (next(iter(status_values)) if status_values else None),
            "mappings": rule_mappings,
        })

    counts = Counter(m["frameworkId"] for m in mappings)
    metadata = {
        "generatedFrom": [filename for _, filename in FILES],
        "ruleCount": len(rules),
        "mappingCount": len(mappings),
        "requirementCount": sum(len(d.get("Requirements", [])) for d in raw_frameworks.values()),
        "crossFrameworkRuleCount": sum(1 for r in rules if r["isCrossFramework"]),
        "mappingCountByFramework": dict(counts),
        "catalogNote": "Enabled defaults are initialized to true for this local demo because the source catalogs do not define an Active/Enabled field. Persist scan configuration through the backend before using it operationally.",
        "sourceCatalogsHaveExecutionState": False,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"meta": metadata, "frameworks": framework_meta, "rules": rules}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    print("Cross-framework examples:")
    for check in ("cloudtrail_multi_region_enabled", "iam_root_mfa_enabled"):
        rule = next(r for r in rules if r["checkId"] == check)
        print(check, "=>", ", ".join(rule["frameworkIds"]), "mappings:", rule["mappingCount"])

if __name__ == "__main__":
    normalize()
