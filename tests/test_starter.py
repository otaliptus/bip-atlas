from __future__ import annotations
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from demo_models import mnemonic_layout, mnemonic_indices, transaction_sizes, decode_encoding, decode_segwit, unpack_five_bit
from snapshot_sources import parse_metadata, selected_numbers, snapshot, validate_revision, safe_path

PUBLIC_V0 = "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4"
PUBLIC_V1 = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0"

class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((ROOT / "catalog.json").read_text())
    def test_ten_primary_bips(self):
        self.assertEqual(len({b for c in self.catalog['chapters'] for b in c['primaryBips']}), 10)
    def test_eight_chapters(self):
        self.assertEqual(len(self.catalog['chapters']), 8)
    def test_phase_one_is_five_chapters_seven_bips(self):
        chapters = [c for c in self.catalog['chapters'] if c['phase'] == 1]
        self.assertEqual(len(chapters), 5)
        self.assertEqual(len({b for c in chapters for b in c['primaryBips']}), 7)
    def test_unique_build_order(self):
        self.assertEqual(sorted(c['buildOrder'] for c in self.catalog['chapters']), list(range(1, 9)))
    def test_primary_and_supporting_count(self):
        self.assertEqual(len(selected_numbers(self.catalog)), 15)

class ModelTests(unittest.TestCase):
    def test_12_word_layout(self):
        self.assertEqual(mnemonic_layout(128), {'entropyBits':128,'checksumBits':4,'totalBits':132,'wordCount':12,'lastWordEntropyBits':7})
    def test_24_word_layout(self):
        self.assertEqual(mnemonic_layout(256)['wordCount'], 24)
        self.assertEqual(mnemonic_layout(256)['lastWordEntropyBits'], 3)
    def test_all_word_counts(self):
        self.assertEqual([mnemonic_layout(n)['wordCount'] for n in (128,160,192,224,256)], [12,15,18,21,24])
    def test_entropy_rejection(self):
        for n in (0, 32, 129, 512, True, 128.0):
            with self.subTest(n=n), self.assertRaises(ValueError): mnemonic_layout(n)
    def test_public_zero_entropy_indices(self):
        bits, indices = mnemonic_indices(bytes(16))
        self.assertEqual(len(bits), 132)
        self.assertEqual(indices, [0]*11+[3])
        self.assertEqual(bits[-4:], '0011')
    def test_weight_formula(self):
        self.assertEqual(transaction_sizes(100,200)['weightUnits'],500)
        self.assertEqual(transaction_sizes(100,200)['virtualBytes'],125)
    def test_weight_ceiling(self):
        self.assertEqual(transaction_sizes(100,201)['virtualBytes'],126)
    def test_weight_rejection(self):
        for pair in ((-1,2),(100,99),(1.0,2),(True,3)):
            with self.subTest(pair=pair), self.assertRaises(ValueError): transaction_sizes(*pair)
    def test_generic_bech32(self):
        self.assertEqual(decode_encoding('A12UEL5L'),('a',[],'bech32'))
    def test_generic_bech32m(self):
        self.assertEqual(decode_encoding('A1LQFN3A'),('a',[],'bech32m'))
    def test_v0_vector(self):
        result = decode_segwit(PUBLIC_V0,'bc')
        self.assertEqual(result['scriptPubKeyHex'],'0014751e76e8199196d454941c45d1b3a323f1433bd6')
        self.assertEqual(result['encoding'],'bech32')
    def test_v1_vector(self):
        result = decode_segwit(PUBLIC_V1,'bc')
        self.assertEqual(result['scriptPubKeyHex'],'512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
        self.assertEqual(result['encoding'],'bech32m')
    def test_wrong_family_v1(self):
        with self.assertRaisesRegex(ValueError,'family'):
            decode_segwit('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd','bc')
    def test_wrong_family_v0(self):
        with self.assertRaisesRegex(ValueError,'family'):
            decode_segwit('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh','bc')
    def test_mixed_case(self):
        with self.assertRaisesRegex(ValueError,'Mixed'):
            decode_segwit(PUBLIC_V0[:-1]+'t','bc')
    def test_wrong_network(self):
        with self.assertRaisesRegex(ValueError,'prefix'): decode_segwit(PUBLIC_V0,'tb')
    def test_bad_checksum(self):
        with self.assertRaisesRegex(ValueError,'Checksum'): decode_segwit(PUBLIC_V1[:-1]+'q','bc')
    def test_padding_rejection(self):
        with self.assertRaises(ValueError): unpack_five_bit([1])
    def test_invalid_version(self):
        with self.assertRaisesRegex(ValueError,'version'):
            decode_segwit('BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R','bc')
    def test_invalid_program_length(self):
        with self.assertRaisesRegex(ValueError,'length'):
            decode_segwit('bc1pw5dgrnzv','bc')
    def test_invalid_v0_program_length(self):
        with self.assertRaisesRegex(ValueError,'20 or 32'):
            decode_segwit('BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P','bc')
    def test_v16_encoding_is_not_spendability_claim(self):
        result = decode_segwit('BC1SW50QGDZ25J','bc')
        self.assertEqual(result['witnessVersion'],16)
        self.assertIn('not spendability',result['validationScope'])

class ParserTests(unittest.TestCase):
    SAMPLE = '<pre>\n  BIP: 39\n  Title: Fixture\n  Authors: A\n           B\n  Status: Deployed\n  Type: Specification\n  Assigned: 2013-09-10\n  License: MIT\n  Future-Field: retain-me\n</pre>\n\n== Specification ==\nText\n'
    def test_continuation_and_unknown_fields(self):
        result = parse_metadata(self.SAMPLE,39)
        self.assertEqual(result['authorsRaw'],'A\nB')
        self.assertEqual(result['headersRaw']['Future-Field'],'retain-me')
    def test_heading(self):
        self.assertEqual(parse_metadata(self.SAMPLE,39)['headingCandidates'][0]['title'],'Specification')
    def test_markdown_header(self):
        sample = '```\nBIP: 39\nTitle: Fixture\nAuthor: A\nStatus: Final\nType: Standards Track\nCreated: 2013-09-10\n```\n## Motivation\n'
        result = parse_metadata(sample,39)
        self.assertEqual(result['statusRaw'],'Final')
        self.assertEqual(result['authorsRaw'],'A')
        self.assertEqual(result['assignedOrCreatedRaw'],'2013-09-10')
        self.assertTrue(result['licenseReviewRequired'])
    def test_wrong_id(self):
        with self.assertRaises(ValueError): parse_metadata(self.SAMPLE,32)
    def test_duplicate_header(self):
        with self.assertRaises(ValueError): parse_metadata(self.SAMPLE.replace('  Type:', '  Status: Draft\n  Type:'),39)
    def test_unknown_status_preserved(self):
        self.assertEqual(parse_metadata(self.SAMPLE.replace('Deployed','FutureStatus'),39)['statusRaw'],'FutureStatus')
    def test_revision_validation(self):
        validate_revision('a'*40)
        for value in ('master','a'*39,'--help','A'*40):
            with self.subTest(value=value), self.assertRaises(ValueError): validate_revision(value)
    def test_path_validation(self):
        for value in ('../outside','/tmp/out','bip-0039/../../x','a\\b'):
            with self.subTest(value=value), self.assertRaises(ValueError): safe_path(value)
    def test_pinned_git_snapshot_ignores_dirty_worktree(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); repo=root/'repo'; repo.mkdir()
            def run(*args):
                return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.STDOUT).decode().strip()
            run('init','-q'); run('config','user.name','Fixture'); run('config','user.email','fixture@example.invalid')
            file=repo/'bip-0039.mediawiki'; file.write_text(self.SAMPLE)
            (repo/'bip-0039').mkdir(); (repo/'bip-0039'/'fixture.txt').write_text('public fixture')
            run('add','.'); run('commit','-qm','fixture'); revision=run('rev-parse','HEAD')
            file.write_text('uncommitted corruption')
            out=root/'snapshot'
            result=snapshot(repo,revision,{'chapters':[{'primaryBips':[39]}]},out)
            self.assertEqual(result['sources'][0]['title'],'Fixture')
            self.assertEqual((out/'raw'/'bip-0039.mediawiki').read_text(),self.SAMPLE)
            self.assertEqual(len(result['files']),2)
            entry=next(f for f in result['files'] if f['path']=='bip-0039.mediawiki')
            self.assertEqual(entry['sha256'],hashlib.sha256(self.SAMPLE.encode()).hexdigest())
            with self.assertRaises(ValueError): snapshot(repo,revision,{'chapters':[{'primaryBips':[39]}]},out)
            run('config','remote.origin.promisor','true')
            with self.assertRaisesRegex(ValueError,'Partial/promisor'):
                snapshot(repo,revision,{'chapters':[{'primaryBips':[39]}]},root/'another-snapshot')

if __name__ == '__main__': unittest.main(verbosity=2)
