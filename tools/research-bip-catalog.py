#!/usr/bin/env python3
"""Build/check the editorial BIP inventory without changing publication inputs.

Fetch a separate bitcoin/bips checkout, then use --upstream PATH --write.
The checkout must match chapters.json's immutable commit. --check is offline.
Only Python's standard library is required. All output stays under docs/research.
"""

import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/research/2026-10-bip-map'
REPOSITORY = 'https://github.com/bitcoin/bips'
SPEC = re.compile(r'bip-(\d+)\.(?:md|mediawiki)$')
REFERENCE = re.compile(r'\bBIP[\s_-]*(\d{1,4})(?!\w)|https?://(?:www\.)?bips\.dev/(\d+)(?!\w)', re.I)
HEADER = re.compile(r'^\s{0,3}([A-Z][A-Za-z-]*):\s*(.*)$')
FIELD_TYPES = {'Requires': 'declared-requires', 'Replaces': 'declared-replaces',
               'Proposed-Replacement': 'declared-proposed-replacement'}


def read_json(name):
    return json.loads((OUT / name).read_text())


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(condition, message):
    if not condition:
        raise ValueError(message)


def index_rows(text):
    rows = []
    for block in re.split(r'^\|-.*$', text, flags=re.M)[1:]:
        cells = [line[1:].strip() for line in block.splitlines()
                 if line.startswith('|') and not line.startswith('|}')]
        if len(cells) < 6:
            continue
        first = re.match(r'(?:\[\[(bip-\d+\.[^|]+)\|)?(\d+)', cells[0])
        if first:
            rows.append(dict(number=int(first[2]), path=first[1], layer=cells[1] or None,
                             title=cells[2], authors=cells[3], type=cells[4], status=cells[5]))
    check(len(rows) == len({r['number'] for r in rows}), 'Duplicate upstream index entries')
    return rows


def parse_document(path):
    lines = path.read_text().splitlines()
    end = next(i for i, line in enumerate(lines[1:], 1) if line.strip() in ('</pre>', '```'))
    headers, positions, previous = {}, {}, None
    for i, line in enumerate(lines[1:end], 2):
        match = HEADER.match(line)
        if match:
            previous = match[1]
            headers[previous] = match[2]
            positions[previous] = i
        elif previous and line.strip():
            headers[previous] += '\n' + line.strip()
    sections = []
    refs = defaultdict(list)
    for i, line in enumerate(lines[end + 1:], end + 2):
        heading = re.match(r'^(?:=+\s*(.*?)\s*=+|#+\s+(.*?))\s*$', line)
        if heading:
            title = heading[1] or heading[2]
            if title.lower() in ('abstract', 'summary', 'motivation', 'specification', 'introduction'):
                sections.append(dict(title=title, line=i))
        for match in REFERENCE.finditer(line):
            number = int(match[1] or match[2])
            if i not in refs[number]:
                refs[number].append(i)
    return headers, positions, sections, refs, lines


def site_chapters():
    result = {}
    for filename in ('catalog.json', 'catalog-phase3.json'):
        for chapter in json.loads((ROOT / filename).read_text())['chapters']:
            check(chapter['id'] not in result, 'Duplicate current chapter')
            result[chapter['id']] = chapter['primaryBips']
    return result


def graph_components(edges):
    """Tarjan SCCs; a declared cycle is a finding, not necessarily an error."""
    graph = defaultdict(list)
    for source, target in edges:
        graph[source].append(target)
    seen, low, stack, active, result = {}, {}, [], set(), []

    def visit(node):
        seen[node] = low[node] = len(seen)
        stack.append(node)
        active.add(node)
        for nxt in graph.get(node, []):
            if nxt not in seen:
                visit(nxt)
                low[node] = min(low[node], low[nxt])
            elif nxt in active:
                low[node] = min(low[node], seen[nxt])
        if low[node] == seen[node]:
            component = []
            while True:
                other = stack.pop()
                active.remove(other)
                component.append(other)
                if other == node:
                    break
            if len(component) > 1 or node in graph.get(node, []):
                result.append(sorted(component))

    for node in list(graph):
        if node not in seen:
            visit(node)
    return sorted(result)


def generate(upstream):
    plan = read_json('chapters.json')
    commit = subprocess.check_output(['git', '-C', str(upstream), 'rev-parse', 'HEAD'], text=True).strip()
    check(commit == plan['upstreamCommit'], 'Checkout does not match the pinned research commit')
    # Compare bytes as well as HEAD, so a dirty checkout cannot silently alter the snapshot.
    tracked_changes = subprocess.check_output(['git', '-C', str(upstream), 'status', '--porcelain', '--untracked-files=no'], text=True)
    check(not tracked_changes, 'Upstream checkout has modified tracked files')
    index = index_rows((upstream / 'README.mediawiki').read_text())
    files = {int(SPEC.fullmatch(p.name)[1]): p for p in upstream.iterdir()
             if p.is_file() and SPEC.fullmatch(p.name)}
    published = {r['number'] for r in index if r['path']}
    check(published == set(files), 'Index and published root specification files disagree')
    notes = {n['number']: n['teachingPoint'] for n in read_json('bip-notes.json')['notes']}
    check(set(notes) == published, 'Teaching objectives must cover exactly the published documents')
    owners = {n: c for c in plan['chapters'] for n in c['ownedBips']}
    current = {n: id for id, numbers in site_chapters().items() for n in numbers}
    inventory, declared, unresolved = [], [], []
    manifest_files = [dict(path='README.mediawiki', sha256=sha(upstream / 'README.mediawiki'))]
    for row in index:
        n = row['number']
        chapter = owners[n]
        item = dict(number=n, title=row['title'], status=row['status'], layer=row['layer'], type=row['type'],
                    chapter=chapter['id'], role=('allocated-only' if not row['path'] else
                      'comparison' if n in chapter['comparisonBips'] else 'main-explanation'),
                    currentCoverage='primary-explainer' if n in current else 'no-primary-explainer',
                    currentChapter=current.get(n), deliveryBatch=chapter['deliveryBatch'], unitFormat=chapter['format'], placement=chapter['placement'],
                    teachingPoint=notes.get(n, 'Record the allocated number and title. No published specification exists to explain or implement.'),
                    source=dict(path=row['path'] or 'README.mediawiki',
                                url=f"{REPOSITORY}/blob/{commit}/{row['path'] or 'README.mediawiki'}"))
        if row['path']:
            path = files[n]
            check(path.name == row['path'], f'Index path mismatch for BIP{n}')
            headers, positions, sections, refs, lines = parse_document(path)
            check(int(headers['BIP']) == n, f'Header number mismatch for BIP{n}')
            for field in ('Status', 'Title', 'Type'):
                check(headers[field] == row[field.lower()], f'{field} index/header mismatch for BIP{n}')
            item.update(assigned=headers['Assigned'], sourceSections=sections,
                        declaredHeaders={key: headers[key] for key in FIELD_TYPES if key in headers},
                        references=[dict(number=target, lines=positions,
                              targetState='published' if target in published else 'allocated-only' if target in owners else 'unresolved')
                                    for target, positions in sorted(refs.items()) if target != n])
            for field, kind in FIELD_TYPES.items():
                if field not in headers:
                    continue
                targets = [int(s) for s in re.findall(r'\d+', headers[field])]
                location = dict(path=path.name, line=positions[field], text=lines[positions[field]-1].strip(),
                                url=f'{REPOSITORY}/blob/{commit}/{path.name}#L{positions[field]}')
                if not targets:
                    unresolved.append(dict(source=n, field=field, raw=headers[field], evidence=location))
                for target in targets:
                    declared.append(dict(source=n, target=target, kind=kind, evidence=location))
            manifest_files.append(dict(number=n, path=path.name, sha256=sha(path), bytes=path.stat().st_size))
        else:
            item.update(references=[], declaredHeaders={}, sourceSections=[])
        inventory.append(item)
    manifest = dict(schemaVersion='bip-atlas.research-sources.v1', repository=REPOSITORY, commit=commit,
                    commitDate=subprocess.check_output(['git', '-C', str(upstream), 'show', '-s', '--format=%cI', 'HEAD'], text=True).strip(),
                    retrievedAt='2026-10-17', scope='README index and every root numbered BIP document; auxiliary implementations/vectors are not part of this catalogue study.',
                    indexEntries=index, files=manifest_files)
    relations = dict(schemaVersion='bip-atlas.research-declared-relations.v1',
                     direction='source depends on / replaces / names a proposed replacement target; do not reverse these kinds indiscriminately.',
                     edges=declared, unresolvedDeclarations=unresolved,
                     requiresCycles=graph_components([(r['source'],r['target']) for r in declared if r['kind']=='declared-requires']))
    for edge in read_json('relationships.json')['edges']:
        for location in edge['evidence']:
            lines = (upstream / location['path']).read_text().splitlines()
            check(1 <= location['line'] <= len(lines), 'Curated evidence line out of range')
            check(location['excerpt'] in lines[location['line']-1],
                  f'Curated evidence no longer matches BIP{edge["source"]}')
    results = {'inventory.json': encoded(dict(schemaVersion='bip-atlas.research-inventory.v2', bips=inventory)),
               'sources.lock.json': encoded(manifest), 'declared-relations.json': encoded(relations)}
    stream = io.StringIO(newline='')
    writer = csv.writer(stream, lineterminator='\n')
    writer.writerow(['BIP','Title','Status','Layer','Type','Unit','Role','Current primary chapter','Delivery batch','Format','Placement','Teaching objective','Source'])
    for b in inventory:
        writer.writerow([b['number'],b['title'],b['status'],b['layer'],b['type'],b['chapter'],b['role'],
                         b['currentChapter'] or '',b['deliveryBatch'],b['unitFormat'],b['placement'],b['teachingPoint'],b['source']['url']])
    results['inventory.csv'] = stream.getvalue()
    results['bip-index.md'] = render_index(plan, inventory)
    results['chapter-briefs.md'] = render_chapters(plan)
    results['curriculum.md'] = render_curriculum(plan)
    return results


def render_index(plan, inventory):
    parts=['# Complete BIP ownership index', '',
           'Reference coverage, not the learning sequence. Start with [the curriculum](curriculum.md). An ownership assignment is a planned explanation or subsection, not a published chapter. Status is upstream document metadata, not an independent adoption survey. Each published BIP has a distinct teaching objective. An allocated-only row is an accounting entry, not explanatory coverage.', '',
           '“Current” means a primary BIP in the existing 18 chapter briefs; all existing chapters remain draft-unreviewed. “Comparison” still requires a real explanatory section or row, not a link or passing mention.', '']
    for trail in plan['trails']:
        ids = {c['id'] for c in plan['chapters'] if c['trail']==trail['id']}
        parts += [f"## {trail['title']}", '', '| BIP | Status | Unit / role | Current | Required explanation |',
                  '|---|---|---|---|---|']
        for b in inventory:
            if b['chapter'] not in ids:
                continue
            chapter=f"[{b['chapter']}](chapter-briefs.md#{b['chapter']}) / {b['role']}"
            parts.append(f"| [{b['number']}]({b['source']['url']}) | {b['status']} | {chapter} | {'yes' if b['currentChapter'] else '—'} | {b['teachingPoint']} |")
        parts.append('')
    return '\n'.join(parts)


def render_chapters(plan):
    allocated = set(plan['allocatedOnlyBips'])
    parts=['# Curriculum unit briefs', '',
           'Start with [the core route and optional paths](curriculum.md). These are editorial units: a lesson, companion section or reference entry, not a commitment to one page per unit. All 18 existing lessons retain their BIP scope. New material defaults to static prose and drawings. Backlog entries have no delivery commitment. Suggested prior reading is an editorial graph, not a protocol dependency declaration.', '']
    for trail in plan['trails']:
        parts += [f"## {trail['title']}", '']
        for c in plan['chapters']:
            if c['trail'] != trail['id']:
                continue
            parts += [f"<a id=\"{c['id']}\"></a>", f"### {c['question']}", '',
                      f"`{c['id']}` · **{c['format']} / {c['placement']}** · {c['action']} · batch: {c['deliveryBatch']}", '',
                      '- **Main explanations:** ' + numbers_text([n for n in c['ownedBips'] if n not in c['comparisonBips'] and n not in allocated]) + '.',
                      '- **Comparison sections:** ' + numbers_text(c['comparisonBips']) + '.',
                      '- **Allocated only:** ' + numbers_text([n for n in c['ownedBips'] if n in allocated]) + '.', '',
                      c['scope'], '', f"Static drawing: {c['staticIllustration']}", '',
                      'Suggested prior reading: ' + (', '.join(f"[{p}](#{p})" for p in c['suggestedPriorReading']) or 'none') + '.', '']
            if c['format'] == 'primer':
                parts += ['Supporting BIPs (no new ownership): ' + numbers_text(c['supportingBips']) + '.', '',
                          'Source work before authoring: ' + c['sourceRequirement'], '']
    return '\n'.join(parts)


def numbers_text(numbers):
    return ', '.join(f'BIP{n}' for n in numbers) or 'none'


def unit_link(id):
    return f'[{id}](chapter-briefs.md#{id})'


def render_curriculum(plan):
    chapters = plan['chapters']
    core = [id for stage in plan['coreStages'] for id in stage['units']]
    parts = ['# The learning route', '', plan['audience'], '',
             f'The core has **{len(core)} stops**. Finish it for a working model of wallets, spending and node agreement; then choose a path for a concrete task. Familiar readers may enter at any unit after checking its prior reading. Coverage of the entire BIP collection belongs to the reference index, not the completion requirement.', '',
             'This is a proposed curriculum. The live site still has its existing 18 lessons and navigation. The two primers require source work before authoring. No new unit is published or approved by this plan.', '',
             '## Core route', '']
    for i, stage in enumerate(plan['coreStages'], 1):
        parts += [f"### {i}. {stage['title']}", '',
                  ' → '.join(unit_link(id) for id in stage['units']), '',
                  'By the end: ' + stage['outcome'], '',
                  'Check your understanding: ' + stage['check'], '']
    parts += ['## Optional paths', '',
              'Each path assumes the core concepts. Its order includes any extra prior reading; shared lessons appear in several paths and need only be read once. Reference entries are available on demand. These paths are not additional compulsory courses.', '']
    for track in plan['optionalTracks']:
        parts += [f"### {track['title']}", '',
                  ' → '.join(unit_link(id) for id in track['units']), '',
                  'By the end: ' + track['outcome'], '']
    parts += ['## Reference shelf', '',
              'Use [the numerical BIP index](bip-index.md) for a specific proposal. Historical, competing and specialized formats get substantive explanations here without extending the core lessons. A reference entry can be a subsection or comparison table; these are not all separate pages.', '']
    for trail in plan['trails']:
        refs = [c['id'] for c in chapters if c['trail'] == trail['id'] and c['format'] == 'reference']
        if refs:
            parts += [f"- **{trail['title']}:** " + ', '.join(unit_link(id) for id in refs) + '.']
    parts += ['', '## First delivery batches', '',
              'Each batch adds two bounded units. Author and review one batch before starting the next. A batch is accepted on explanation quality, not the number of new BIPs. All other proposed units remain an unscheduled backlog.', '']
    for i, batch in enumerate(plan['deliveryBatches'], 1):
        parts += [f"### {i}. {batch['title']}", '',
                  ', '.join(unit_link(id) for id in batch['units']), '', batch['purpose'], '',
                  'Acceptance: ' + batch['acceptance'], '']
    parts += ['## Accounting, not a page target', '',
              '| Unit format | Count |', '|---|---:|']
    for format, count in sorted(Counter(c['format'] for c in chapters).items()):
        parts.append(f'| {format} | {count} |')
    parts += ['', 'The unit count records useful explanatory boundaries. It does not determine site page count, equal lesson lengths or a release deadline. Existing lessons keep their URLs and figures; companion and reference material can live in grouped pages when that is easier to read.', '']
    return '\n'.join(parts)


def validate():
    plan, data, sources = read_json('chapters.json'), read_json('inventory.json'), read_json('sources.lock.json')
    check(plan['schemaVersion'] == 'bip-atlas.research-curriculum.v2', 'Unknown curriculum schema')
    chapters, bips = plan['chapters'], data['bips']
    numbers = [b['number'] for b in bips]
    indexed = [b['number'] for b in sources['indexEntries']]
    check(len(numbers)==len(set(numbers)), 'Duplicate inventory BIP')
    check(set(numbers)==set(indexed), 'Inventory does not match the frozen upstream index')
    ids = [c['id'] for c in chapters]
    check(len(ids)==len(set(ids)), 'Duplicate chapter ID')
    owners = [n for c in chapters for n in c['ownedBips']]
    check(Counter(owners)==Counter(numbers), 'Each indexed BIP must have exactly one explanation owner')
    check(plan['upstreamCommit']==sources['commit'], 'Source and plan commits differ')
    published = {b['number'] for b in bips if b['role']!='allocated-only'}
    notes=read_json('bip-notes.json')['notes']
    check(Counter(n['number'] for n in notes)==Counter(published), 'Duplicate/missing teaching objective')
    check({f.get('number') for f in sources['files'] if 'number' in f}==published, 'Source manifest is incomplete')
    existing=site_chapters()
    by_id = {c['id']: c for c in chapters}
    allocated = {b['number'] for b in sources['indexEntries'] if not b['path']}
    check(set(plan['allocatedOnlyBips']) == allocated, 'Allocation list differs from source index')
    trail_ids = [t['id'] for t in plan['trails']]
    check(len(trail_ids) == len(set(trail_ids)), 'Duplicate collection ID')
    check(set(existing)<=set(ids), 'An existing chapter disappeared')
    for c in chapters:
        check(c['currentPrimaryBips']==existing.get(c['id'],[]), f"Current coverage changed: {c['id']}")
        if c['id'] in existing:
            check(c['ownedBips'] == existing[c['id']], 'An existing lesson was expanded')
            check(c['format'] == 'lesson' and c['deliveryBatch'] == 'existing', 'Existing lesson mislabeled')
        check(set(c['comparisonBips'])<=set(c['ownedBips']), 'Comparison without chapter ownership')
        check(not set(c['comparisonBips']) & allocated, 'Allocated-only entry cannot be a comparison')
        check(len(c['comparisonBips']) == len(set(c['comparisonBips'])), 'Duplicate comparison BIP')
        check(set(c['suggestedPriorReading'])<=set(ids), 'Unknown prior-reading chapter')
        check(c['trail'] in trail_ids, 'Unknown collection')
        check(c['format'] in ('primer','lesson','companion','reference'), 'Unknown unit format')
        check(c['placement'] in ('core','optional','reference'), 'Unknown unit placement')
        check(c['newInteractions']==0, 'Plan exceeds the static-first interaction constraint')
        expected_action = 'retain' if c['id'] in existing else 'new'
        check(c['action']==expected_action, 'Inconsistent chapter action')
        if c['format'] == 'primer':
            check(not c['ownedBips'] and not c['comparisonBips'], 'Primer counted as new BIP coverage')
            check(c['sourceRequirement'].strip() and c['supportingBips'], 'Primer lacks a source plan')
            check(set(c['supportingBips']) <= published, 'Unknown primer supporting BIP')
        else:
            check(c['ownedBips'], 'Non-primer has no explanation ownership')
        check(all(c[k].strip() for k in ('question','scope','staticIllustration')), 'Empty unit brief')
    cycles=graph_components([(c['id'],p) for c in chapters for p in c['suggestedPriorReading']])
    check(not cycles, f'Editorial prerequisite cycles: {cycles}')
    # Check actual reading order, not just the absence of cycles in the graph.
    def check_route(route, available, label):
        check(len(route) == len(set(route)), f'Duplicate stop in {label}')
        check(set(route) <= set(ids), f'Unknown stop in {label}')
        available = set(available)
        for id in route:
            missing = set(by_id[id]['suggestedPriorReading']) - available
            check(not missing, f'{label}: {id} needs earlier reading {sorted(missing)}')
            available.add(id)
        return available

    stages = plan['coreStages']
    check(len({s['id'] for s in stages}) == len(stages), 'Duplicate core stage')
    check(all(s['units'] and s['outcome'].strip() and s['check'].strip() for s in stages), 'Incomplete core stage')
    core = [id for stage in stages for id in stage['units']]
    check_route(core, [], 'Core route')
    check(set(core) == {c['id'] for c in chapters if c['placement'] == 'core'}, 'Core placement mismatch')
    check(all(by_id[id]['format'] in ('primer','lesson') for id in core), 'Core includes a reference or companion')
    tracks = plan['optionalTracks']
    check(len({t['id'] for t in tracks}) == len(tracks), 'Duplicate optional path')
    reachable = set(core)
    for track in tracks:
        check(track['units'] and track['outcome'].strip(), 'Incomplete optional path')
        reachable.update(check_route(track['units'], core, track['id']))
    reachable.update(c['id'] for c in chapters if c['format'] == 'reference')
    check(reachable == set(ids), 'A unit is absent from routes and reference shelf')
    check(all((c['format'] == 'reference') == (c['placement'] == 'reference') for c in chapters), 'Reference placement mismatch')
    batches = plan['deliveryBatches']
    check(len({b['id'] for b in batches}) == len(batches), 'Duplicate delivery batch')
    completed_batches, available, scheduled = set(), set(existing), []
    for batch in batches:
        check(set(batch['dependsOn']) <= completed_batches, 'Delivery dependency is not earlier')
        check(batch['units'] and batch['purpose'].strip() and batch['acceptance'].strip(), 'Incomplete batch')
        available = check_route(batch['units'], available, 'Batch ' + batch['id'])
        for id in batch['units']:
            check(by_id[id]['deliveryBatch'] == batch['id'], 'Unit/batch assignment differs')
            check(id not in existing, 'Batch rewrites an existing lesson scope')
        scheduled.extend(batch['units'])
        completed_batches.add(batch['id'])
    check(len(scheduled) == len(set(scheduled)), 'Unit scheduled more than once')
    for c in chapters:
        if c['id'] not in scheduled and c['id'] not in existing:
            check(c['deliveryBatch'] == 'backlog', 'Unscheduled unit is not marked backlog')
    for b in bips:
        check(b['teachingPoint'].strip(), 'Missing teaching objective')
        check(b['chapter'] in ids, 'Unknown owner')
        check(sources['commit'] in b['source']['url'], 'Unpinned source')
        index_row=next(r for r in sources['indexEntries'] if r['number']==b['number'])
        check(all(b[k]==index_row[k] for k in ('title','status','layer','type')), 'Inventory/index metadata differs')
        owner=next(c for c in chapters if b['number'] in c['ownedBips'])
        check(b['chapter']==owner['id'] and b['deliveryBatch']==owner['deliveryBatch'], 'Inventory/plan ownership differs')
        check(b['unitFormat']==owner['format'] and b['placement']==owner['placement'], 'Inventory/plan format differs')
        expected_role = 'allocated-only' if b['number'] in allocated else 'comparison' if b['number'] in owner['comparisonBips'] else 'main-explanation'
        check(b['role'] == expected_role, 'Incorrect explanation role')
        check(b['teachingPoint'] == next((n['teachingPoint'] for n in notes if n['number'] == b['number']), b['teachingPoint']), 'Stale teaching objective')
        check(b['currentChapter']==next((id for id,ns in existing.items() if b['number'] in ns),None), 'Incorrect current coverage')
    declared=read_json('declared-relations.json')
    check(all(e['source'] in published and e['target'] in published for e in declared['edges']), 'Unresolved numbered header edge')
    computed_cycles=graph_components([(e['source'],e['target']) for e in declared['edges'] if e['kind']=='declared-requires'])
    check(computed_cycles==declared['requiresCycles'], 'Stale declared cycle report')
    relationships=read_json('relationships.json')['edges']
    check(len({(e['source'],e['target'],e['kind']) for e in relationships})==len(relationships), 'Duplicate curated relationship')
    for e in relationships:
        check(e['source'] in published and e['target'] in published, 'Unknown curated relationship BIP')
        source=next(b for b in bips if b['number']==e['source'])
        target=next(b for b in bips if b['number']==e['target'])
        check(e['basis'] in ('source-reference','editorial-comparison'), 'Unknown relationship basis')
        if e['basis'] == 'source-reference':
            check(any(r['number']==e['target'] for r in source['references']), 'Curated relationship lacks a source-body reference')
        paths = {source['source']['path'], target['source']['path']}
        check(e['evidence'], 'Curated relationship has no evidence')
        if e['basis'] == 'editorial-comparison':
            check({location['path'] for location in e['evidence']} == paths, 'Comparison must cite both designs')
        for location in e['evidence']:
            check(location['path'] in paths, 'Curated evidence belongs to another source')
            check(location['line'] > 0 and location['excerpt'].strip(), 'Empty evidence excerpt or invalid line')
            expected_url = f"{REPOSITORY}/blob/{sources['commit']}/{location['path']}#L{location['line']}"
            check(location['url'] == expected_url, 'Incorrect curated evidence URL')
    unresolved=sorted({r['number'] for b in bips for r in b['references'] if r['targetState']=='unresolved'})
    check((OUT/'bip-index.md').read_text()==render_index(plan,bips), 'Stale readable BIP index')
    check((OUT/'chapter-briefs.md').read_text()==render_chapters(plan), 'Stale readable chapter briefs')
    check((OUT/'curriculum.md').read_text()==render_curriculum(plan), 'Stale readable curriculum')
    print(f"{len(published)} documents + {len(bips)-len(published)} allocated-only; {len(chapters)} editorial units (not a page target)")
    print(f'{len(core)} core stops; {len(tracks)} optional paths; {len(batches)} bounded delivery batches')
    print('Chapter actions:',dict(Counter(c['action'] for c in chapters)))
    print('Document statuses:',dict(Counter(b['status'] for b in bips if b['number'] in published)))
    print('Declared edges:',dict(Counter(e['kind'] for e in declared['edges'])))
    print('Curated relationships:',len(relationships),'source-body reference pairs:',sum(len(b['references']) for b in bips))
    print('Declared Requires cycles:',declared['requiresCycles'])
    print('Unresolved declarations:',[(d['source'],d['raw']) for d in declared['unresolvedDeclarations']])
    print('Unresolved textual reference numbers (not dependencies):',unresolved)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upstream',type=Path,help='Separate bitcoin/bips checkout at the pinned commit')
    parser.add_argument('--write',action='store_true',help='Write generated research artifacts')
    parser.add_argument('--check',action='store_true',help='Check inventory/ownership and, when supplied, upstream source bytes')
    args=parser.parse_args()
    check(args.write or args.check,'Pass --write or --check')
    if args.write:
        check(args.upstream is not None,'--write requires --upstream')
    if args.upstream:
        generated=generate(args.upstream)
        for name,content in generated.items():
            if args.write:
                (OUT/name).write_text(content)
            else:
                check((OUT/name).read_text()==content, f'Stale or altered generated file: {name}')
    validate()


if __name__=='__main__':
    main()
