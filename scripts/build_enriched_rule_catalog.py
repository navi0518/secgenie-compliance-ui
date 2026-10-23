#!/usr/bin/env python3
"""Build a unified check catalog from the four enriched benchmark definitions."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-data' / 'enriched'
OUT = ROOT / 'public' / 'mock' / 'enriched-rule-catalog.json'
FILES = [
    ('CIS-5.0', 'cis_5.0_aws_enriched.json'),
    ('CIS-8.0', 'cis_8.0_aws_enriched.json'),
    ('CIS-8.1', 'cis_8.1_aws_enriched.json'),
    ('ISO27001-2013', 'iso27001_2013_aws_enriched.json'),
]

def main():
    rules = {}
    frameworks = []
    for framework_id, filename in FILES:
        data = json.loads((SOURCE / filename).read_text(encoding='utf-8'))
        frameworks.append({'id': framework_id, 'name': data.get('Name', framework_id), 'version': data.get('Version', ''), 'provider': data.get('Provider', 'AWS'), 'description': data.get('Description', ''), 'requirementsCount': len(data.get('Requirements', []))})
        for req in data.get('Requirements', []):
            for check in req.get('Checks', []):
                cid = check.get('check_id')
                if not cid: continue
                entry = rules.setdefault(cid, {'check': {k: check.get(k, '') for k in ('check_id','name','description','service','resource_type','severity')}, 'frameworkCoverage': [], 'enabled': True, 'affectedFindingCount': 0, 'affectedAssetCount': 0})
                # First canonical definition wins; differing metadata is reported for review rather than silently overwritten.
                if entry['check'] != {k: check.get(k, '') for k in ('check_id','name','description','service','resource_type','severity')}:
                    entry.setdefault('metadataVariants', []).append({'frameworkId': framework_id, 'check': check})
                attrs = req.get('Attributes', [])
                entry['frameworkCoverage'].append({'frameworkId': framework_id, 'frameworkName': data.get('Name', framework_id), 'version': data.get('Version', ''), 'requirementId': req.get('Id', ''), 'requirementDescription': req.get('Description', ''), 'attributes': attrs[0] if attrs else {}})
    payload = {'meta': {'generatedFrom': [name for _, name in FILES], 'ruleCount': len(rules), 'mappingCount': sum(len(r['frameworkCoverage']) for r in rules.values()), 'frameworkCount': len(frameworks), 'note': 'Counts are benchmark mappings. Finding and affected-asset counts are intentionally zero until joined to live finding data.'}, 'frameworks': frameworks, 'rules': list(rules.values())}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(OUT), 'frameworks': len(frameworks), 'uniqueChecks': len(rules), 'mappings': payload['meta']['mappingCount'], 'metadataVariants': sum(len(r.get('metadataVariants', [])) for r in rules.values())}, indent=2))

if __name__ == '__main__': main()
