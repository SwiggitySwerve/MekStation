"""Extract expected settings from native source contracts, never reference results.

The deliberately bounded source recognizers leave unfamiliar expressions unspecified.
"""
import re
import xml.etree.ElementTree as ET


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


def option_profiles(sources, xml):
    """Resolve zero-argument interface getters through JAXB fields/defaults/XML."""
    interface = sources['verifier/TestEntityOption.java']
    owner = sources['verifier/TestXMLOption.java']
    ceilings = set(re.findall(r'\b([A-Z_]+)\([\d.]+\)', sources.get('verifier/Ceil.java', '')))
    getters = re.findall(r'\w+\s+(\w+)\(\);', interface)
    returns = dict(re.findall(r'public \w+ (\w+)\(\)\s*\{\s*return ([\w.]+);\s*}', owner))
    fields = {}
    pattern = r'@XmlElement(?:\(name = "([^"]+)"\))?\s+(?:private )?(?:double|int|boolean|Ceil) (\w+) = ([^;]+);'
    for match in re.finditer(pattern, owner):
        name, field, default = match.groups()
        fields[field] = (name or field, scalar(default), owner[:match.start()].count('\n') + 1)
    profiles, citations = {}, {}
    for section in ET.fromstring(xml):
        values, evidence = {}, {}
        for getter in getters:
            target = returns.get(getter, '').split('.')
            field = fields.get(target[-1])
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
                citation = f'verifier/TestXMLOption.java#L{line}; XML /{section.tag}/{xml_path}'
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
