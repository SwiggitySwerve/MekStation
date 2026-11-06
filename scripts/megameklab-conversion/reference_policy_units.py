"""Read immutable upstream Git objects and native verifier dispatch contracts."""
import hashlib
import io
from pathlib import Path
import re
import subprocess
import tarfile

from reference_policy_sources import source_field


class PinnedTree:
    def __init__(self, repo, pin):
        self.repo, self.pin, self.reads, self.contents = Path(repo), pin, {}, {}
        actual = self.git('rev-parse', '--verify', pin + '^{commit}').decode().strip()
        if actual != pin or not re.fullmatch(r'[a-f0-9]{40}', pin):
            raise ValueError('Expected an exact pinned commit')
        paths = self.git('ls-tree', '-r', '--name-only', pin).decode().splitlines()
        self.java = {Path(path).stem: path for path in paths if path.endswith('.java') and '/src/megamek/common/' in path}

    def git(self, *args):
        # Per-command conversion control writes no shared/local Git configuration.
        return subprocess.check_output(['git', '--no-replace-objects', '-c', 'core.autocrlf=false', '-C', str(self.repo), *args])

    def read(self, path):
        if path in self.contents:
            return self.contents[path]
        data = self.git('show', self.pin + ':' + path)
        self.reads[path] = hashlib.sha256(data).hexdigest()
        self.contents[path] = data.decode('utf-8')
        return self.contents[path]

    def source(self, name):
        return self.read(self.java[name])

    def unit_blobs(self):
        """Decode archive text; caller verifies bytes against owning blob inventory.

        Git archive honors upstream eol attributes even with autocrlf disabled.
        Universal newline decoding is safe only with that independent hash check.
        """
        with tarfile.open(fileobj=io.BytesIO(self.git('archive', self.pin, 'data/mekfiles'))) as archive:
            for entry in archive:
                if entry.isfile() and entry.name.lower().endswith(('.mtf', '.blk')):
                    with io.TextIOWrapper(archive.extractfile(entry), encoding='utf-8', newline=None) as reader:
                        content = reader.read().encode('utf-8')
                    yield entry.name.removeprefix('data/mekfiles/'), content


class VerifierDispatch:
    def __init__(self, tree):
        self.tree, self.cache = tree, {}
        parser, verifier = tree.source('MekFileParser'), tree.source('TestEntity')
        owner = tree.source('EntityVerifier')
        self.profiles = dict(re.findall(r'@XmlElement\(name = "([^"]+)"\)\s+public TestXMLOption (\w+)', owner))
        self.profiles = {field: tag for tag, field in self.profiles.items()}
        self.loaders = {}
        for labels, loader in re.findall(r'case ((?:"[^"]+"\s*,?\s*)+) -> new (\w+)\(bb\)', parser):
            for label in re.findall(r'"([^"]+)"', labels):
                self.loaders[label] = loader
        self.dispatch = []
        for match in re.finditer(r'if \(unit\.(hasETypeFlag\(Entity\.(\w+)\)|isSupportVehicle\(\))[^{]*\{\s*testEntity = new \w+\([^;]+entityVerifier\.(\w+), null\)', verifier):
            self.dispatch.append((match[2] or 'support', self.profiles[match[3]]))
        self.game_year = int(re.search(r'private int gameYear = (-?\d+);', verifier)[1])

    def facts(self, name):
        if name in self.cache:
            return self.cache[name]
        if name not in self.tree.java:
            return set(), False
        code = self.tree.source(name)
        parent = re.search(r'\bclass ' + re.escape(name) + r'(?:<[^>]+>)? extends (\w+)', code)
        inherited = self.facts(parent[1]) if parent else (set(), False)
        entity_type = re.search(r'public long getEntityType\(\)\s*\{([^}]+)}', code)
        flags = set(re.findall(r'\bETYPE_\w+', entity_type[1])) if entity_type else inherited[0]
        if entity_type and 'super.getEntityType()' in entity_type[1]:
            flags |= inherited[0]
        support = re.search(r'public boolean isSupportVehicle\(\)\s*\{\s*return (true|false);', code)
        result = flags, support[1] == 'true' if support else inherited[1]
        self.cache[name] = result
        return result

    def for_class(self, name):
        flags, support = self.facts(name)
        return next((profile for flag, profile in self.dispatch if flag in flags or flag == 'support' and support), None)

    def profile(self, path, content):
        if path.endswith('.mtf'):
            return self.for_class('Mek')
        unit_type = source_field(content, 'UnitType')
        loader = self.loaders.get(unit_type)
        if loader is None:
            return None
        code = self.tree.source(loader)
        classes = re.findall(r'\b(\w+)\s+\w+\s*=\s*new\s+\1\(', code)
        profiles = {self.for_class(name) for name in classes} - {None}
        return profiles.pop() if len(profiles) == 1 else None
