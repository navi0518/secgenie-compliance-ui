#!/usr/bin/env python3
"""Integrity checks for the benchmark rule catalog generated from source JSON."""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "public" / "mock" / "rule-catalog.json"
SOURCES = {
    "CIS-5.0": "cis_5.0_aws.json",
    "CIS-8.0": "cis_8.0_aws.json",
    "ISO27001-2013": "iso27001_2013_aws.json",
}

def main():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    expected = defaultdict(set)
    expected_requirements = {}
    for framework, filename in SOURCES.items():
        source = json.loads((ROOT / "source-data" / filename).read_text(encoding="utf-8"))
        expected_requirements[framework] = len(source.get("Requirements", []))
        for requirement in source.get("Requirements", []):
            for check_id in requirement.get("Checks", []):
                expected[(framework, str(requirement.get("Id", "")))].add(check_id)
    actual = defaultdict(set)
    rules_by_id = {rule["checkId"]: rule for rule in catalog["rules"]}
    for rule in catalog["rules"]:
        assert rule["checkId"] and isinstance(rule["enabled"], bool), f"Bad rule record: {rule.get('checkId')}"
        for mapping in rule["mappings"]:
            actual[(mapping["frameworkId"], mapping["requirementId"])].add(mapping["checkId"])
            assert mapping["checkId"] == rule["checkId"]
            assert mapping.get("sourceAttributes") is not None
    missing = []
    for key, check_ids in expected.items():
        missing.extend((key[0], key[1], check_id) for check_id in check_ids - actual[key])
    assert not missing, f"Missing source mapping(s): {missing[:10]}"
    assert catalog["meta"]["requirementCount"] == sum(expected_requirements.values())
    assert catalog["meta"]["ruleCount"] == len(rules_by_id)
    assert catalog["meta"]["mappingCount"] == sum(len(rule["mappings"]) for rule in catalog["rules"])
    assert sum(1 for rule in catalog["rules"] if rule["isCrossFramework"]) == catalog["meta"]["crossFrameworkRuleCount"]
    for check_id in ("cloudtrail_multi_region_enabled", "iam_root_mfa_enabled"):
        rule = rules_by_id.get(check_id)
        assert rule and len(rule["frameworkIds"]) >= 3, f"Expected cross-framework mapping absent for {check_id}"
    print("Rule catalog validation: PASS")
    print(f"Requirements: {catalog['meta']['requirementCount']} | Unique checks: {catalog['meta']['ruleCount']} | Requirement-check mappings: {catalog['meta']['mappingCount']} | Cross-framework checks: {catalog['meta']['crossFrameworkRuleCount']}")
    print("Framework mapping counts:", catalog["meta"]["mappingCountByFramework"])

if __name__ == "__main__":
    main()
