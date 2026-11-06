"""Extract expected settings from native source contracts, never reference results.

The deliberately bounded source recognizers leave unfamiliar expressions unspecified.
"""
import re
import xml.etree.ElementTree as ET
from collections import Counter


def scalar(text):
    text = text.strip()
    if text in ('true', 'false'):
        return text == 'true'
    if re.fullmatch(r'-?\d+', text):
        return int(text)
    if re.fullmatch(r'-?\d+\.\d+', text):
        return float(text)
    if re.fullmatch(r'Ceil\.\w+', text):
        return text.split('.')[1]
    return None


def option_getters(sources):
    return re.findall(r'\w+\s+(\w+)\(\);', sources['verifier/TestEntityOption.java'])


def complete_profile(sources, profiles, profile):
    """Omissions are explicit None values, never an empty successful profile."""
    return {getter: profiles.get(profile, {}).get(getter) for getter in option_getters(sources)}


def option_profiles(sources, xml):
    """Resolve zero-argument interface getters through JAXB fields/defaults/XML."""
    owner = sources['verifier/TestXMLOption.java']
    ceilings = set(re.findall(r'\b([A-Z_]+)\([\d.]+\)', sources.get('verifier/Ceil.java', '')))
    getters = option_getters(sources)
    return_matches = list(re.finditer(r'public \w+ (\w+)\(\)\s*\{\s*return ([\w.]+);\s*}', owner))
    returns = {match[1]: (match[2], owner[:match.start()].count('\n') + 1) for match in return_matches}
    return_counts = Counter(match[1] for match in return_matches)
    fields = {}
    pattern = r'@XmlElement(?:\(name = "([^"]+)"\))?\s+(?:private )?(?:double|int|boolean|Ceil) (\w+) = ([^;]+);'
    field_matches = list(re.finditer(pattern, owner))
    field_counts = Counter(match[2] for match in field_matches)
    for match in field_matches:
        name, field, default = match.groups()
        fields[field] = (name or field, scalar(default), owner[:match.start(2)].count('\n') + 1)
    profiles, citations = {}, {}
    sections = {section.tag: section for section in ET.fromstring(xml)}
    factory = sources.get('verifier/EntityVerifier.java', '')
    native_profiles = {}
    for match in re.finditer(r'@XmlElement\(name = "([^"]+)"\)\s+public TestXMLOption \w+ = new TestXMLOption\(\);', factory):
        native_profiles[match[1]] = factory[:match.start()].count('\n') + 1
    for family in sorted(sections.keys() | native_profiles.keys()):
        section = sections.get(family, ET.Element(family))
        fallback = family not in sections
        values, evidence = {}, {}
        for getter in getters:
            returned, getter_line = returns.get(getter, ('', 0))
            target = returned.split('.')
            field = fields.get(target[-1])
            if return_counts[getter] != 1 or field_counts[target[-1]] != 1:
                field = None
            value, citation = None, 'unspecified: no recognized native getter/default'
            if field:
                tag, default, line = field
                xml_path = ('ceilWeight/' if len(target) == 2 else '') + tag
                element = section.find(xml_path)
                value = scalar(element.text or '') if element is not None else default
                if element is not None and value is None and isinstance(default, str):
                    candidate = (element.text or '').strip()
                    value = candidate if candidate in ceilings else None
                if isinstance(default, bool) and not isinstance(value, bool):
                    value = None
                if isinstance(default, (int, float)) and not isinstance(default, bool):
                    if not isinstance(value, (int, float)) or isinstance(value, bool):
                        value = None
                citation = f'verifier/TestXMLOption.java#L{line}; getter #L{getter_line}'
                if fallback:
                    citation += f'; native default via verifier/EntityVerifier.java#L{native_profiles[family]}'
                elif element is None:
                    citation += f'; native default for absent XML /{family}/{xml_path}'
                else:
                    citation += f'; XML /{family}/{xml_path}'
                if value is None:
                    citation = 'unspecified: unrecognized scalar; ' + citation
            values[getter], evidence[getter] = value, citation
        profiles[section.tag], citations[section.tag] = values, evidence
    return profiles, citations


def tech_tables(sources):
    """Mine native switch cases and constants, including BLK's year exception."""
    constants = {name: int(value) for name, value in re.findall(
        r'public static final int (T_\w+) = (-?\d+);', sources['TechConstants.java'])}
    mtf = sources['loaders/MtfFile.java'].split('private void setTechLevel(Mek mek)', 1)[1]
    starts = list(re.finditer(r'techBase.equalsIgnoreCase\("([^"]+)"\)', mtf))
    mtf_rules = {}
    for index, match in enumerate(starts):
        block = mtf[match.end():starts[index + 1].start() if index + 1 < len(starts) else len(mtf)]
        mtf_rules[match[1].lower()] = {int(level): constants.get(name) for level, name in re.findall(
            r'case (\d+):\s*mek.setTechLevel\(TechConstants\.(\w+)\)', block)}
    blk = sources['loaders/BLKFile.java'].split('public void setTechLevel(Entity e)', 1)[1].split('public static BuildingBlock', 1)[0]
    blk_rules, conditional = {}, {}
    for block in blk.split('break;'):
        labels = re.findall(r'case "([^"]+)":', block)
        values = re.findall(r'e.setTechLevel\(TechConstants\.(\w+)\)', block)
        year = re.search(r'e.getYear\(\) == (\d+)', block)
        for label in labels:
            if year and len(values) == 2:
                conditional[label] = (int(year[1]), constants.get(values[0]), constants.get(values[1]))
            elif len(values) == 1:
                blk_rules[label] = constants.get(values[0])
    return {'mtf': mtf_rules, 'blk': blk_rules, 'conditional': conditional}


def source_field(content, key, mtf=False):
    """Read source lexical fields, without invoking local conversion semantics."""
    content = '\n'.join(line for line in content.splitlines() if not line.lstrip().startswith('#'))
    expression = rf'^{re.escape(key)}\s*:\s*([^\n]+)' if mtf else rf'<{re.escape(key)}>\s*([^<]+)</{re.escape(key)}>'
    match = re.search(expression, content, re.I | re.M)
    return match[1].strip() if match else None


def tech_level(path, content, tables):
    if path.lower().endswith('.mtf'):
        base = source_field(content, 'TechBase', True)
        level = source_field(content, 'Rules Level', True)
        return tables['mtf'].get((base or '').lower(), {}).get(int(level)) if level and level.isdigit() else None
    base = source_field(content, 'type')
    if base in tables['conditional']:
        year = source_field(content, 'year')
        pivot, equal, other = tables['conditional'][base]
        return (equal if int(year) == pivot else other) if year and year.isdigit() else None
    return tables['blk'].get(base)
