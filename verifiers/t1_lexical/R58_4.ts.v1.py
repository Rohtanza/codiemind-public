"""R58_4 (T1): "Use UK spelling (colour, behaviour, organisation)".

A property of the character stream: every word segment anywhere in the text (identifier,
comment, string, JSX text) is examined. Letter runs are split on camelCase/PascalCase humps
(digits, underscores and punctuation already separate runs) and matched case-insensitively,
as WHOLE segments, against UK/US spelling-variant families:
  - -our/-or (colour/color, behaviour/behavior, favourite/favorite, ...), with a closed set of
    prefixes and suffixes so 'Colorado', 'honorific', 'decorator', 'laboratory' never match;
  - -re/-er (centre/center, theatre/theater, fibre/fiber, kilometre/kilometer, ...);
  - doubled -l- inflections (travelled/traveled, modelling/modeling, ...);
  - -ence/-ense (defence/defense, offence/offense), and a short list of other pairs;
  - -ise/-isation vs -ize/-ization verbs (generic, with exclusions for words that end in
    -ise/-ize in both varieties: promise, raise, advise, exercise, size, prize, seize, ...);
  - -yse vs -yze (analyse/analyze, paralyse/paralyze, ...).
SATISFIED: at least one variant word and all UK. VIOLATED: any US-form word.
NOT_APPLICABLE: no variant word. Evidence: one item per variant word found.
"""
import re

TIER = "T1"

RUN = re.compile(r"[A-Za-z]+")
HUMP = re.compile(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+")

# ---- -or / -our family -----------------------------------------------------------------
OR_CORES = ["color", "behavior", "favor", "flavor", "neighbor", "harbor", "honor", "humor",
            "labor", "rumor", "savor", "armor", "endeavor", "parlor", "rigor", "valor",
            "vapor", "vigor", "tumor", "clamor", "candor", "splendor", "odor", "ardor",
            "fervor", "demeanor"]
OR_PREFIX = r"(?:re|dis|de|un|mis|multi|bi|tri|mono|water|off|non|pre|over|under|be)?"
OR_SUFFIX = (r"(?:s|ed|ing|ings|ful|fully|fulness|less|ation|ations|al|ally|ist|ists|able|ably|"
             r"ite|ites|itism|y|ism|isms|er|ers|hood|hoods|ly|liness|some)?")
OR_US = re.compile(r"^" + OR_PREFIX + r"(?:" + "|".join(OR_CORES) + r")" + OR_SUFFIX + r"$")
OR_UK = re.compile(r"^" + OR_PREFIX + r"(?:" + "|".join(c[:-2] + "our" for c in OR_CORES) + r")"
                   + OR_SUFFIX + r"$")

# ---- -er / -re family --------------------------------------------------------------------
RE_PREFIX = r"(?:re|de|off|epi|data|call|hyper|un|mis|pre|non|sub|over|under|out|home|dis)?"
CENTER_US = re.compile(r"^" + RE_PREFIX + r"center(?:s|ed|ing|piece|pieces|line|lines|fold)?$")
CENTER_UK = re.compile(r"^" + RE_PREFIX + r"centr(?:e|es|ed|ing|epiece|epieces|eline|elines|efold)$")
ER_WORDS_US = re.compile(
    r"^(?:theater|theaters|fiber|fibers|fiberglass|caliber|calibers|somber|somberly|saber|sabers|"
    r"specter|specters|luster|lackluster|meager|meagerly|liter|liters|"
    r"(?:milli|centi|kilo|deci|nano)(?:meter|meters|liter|liters)|"
    r"maneuver|maneuvers|maneuvered|maneuvering|maneuverable|maneuverability)$")
ER_WORDS_UK = re.compile(
    r"^(?:theatre|theatres|fibre|fibres|fibreglass|calibre|calibres|sombre|sombrely|sabre|sabres|"
    r"spectre|spectres|lustre|lacklustre|meagre|meagrely|litre|litres|"
    r"(?:milli|centi|kilo|deci|nano)(?:metre|metres|litre|litres)|"
    r"manoeuvre|manoeuvres|manoeuvred|manoeuvring|manoeuvrable|manoeuvrability)$")

# ---- doubled-l inflections ---------------------------------------------------------------
L_CORES = ["cancel", "travel", "label", "model", "level", "signal", "fuel", "total", "channel",
           "tunnel", "dial", "equal", "panel", "jewel", "marvel", "quarrel", "rival", "shovel",
           "spiral", "funnel", "pencil", "barrel", "duel", "grovel", "counsel", "cudgel",
           "enamel", "gravel", "libel", "pedal", "revel", "swivel", "tassel", "towel", "ravel",
           "bevel", "chisel", "dishevel", "snorkel", "yodel"]
L_PREFIX = r"(?:re|un|mis|pre|de|over|under|time)?"
L_US = re.compile(r"^" + L_PREFIX + r"(?:" + "|".join(L_CORES) + r")(?:ed|ing|ings|er|ers|or|ors|ous|ously)$")
L_UK = re.compile(r"^" + L_PREFIX + r"(?:" + "|".join(L_CORES) + r")l(?:ed|ing|ings|er|ers|or|ors|ous|ously)$")

# ---- assorted pairs ----------------------------------------------------------------------
MISC_US = re.compile(
    r"^(?:defense|defenses|defenseless|offense|offenses|pretense|pretenses|"
    r"gray|grays|grayed|graying|grayish|grayscale|grayer|grayest|grayness|"
    r"aluminum|mold|molds|molded|molding|moldy|plow|plows|plowed|plowing|"
    r"cozy|cozier|coziest|coziness|pajama|pajamas|mustache|mustaches|donut|donuts|"
    r"sulfur|sulfuric|airplane|airplanes|"
    r"anemia|anemic|encyclopedia|encyclopedias|pediatric|pediatrics|pediatrician|"
    r"fetus|fetuses|fetal|estrogen|leukemia|hemoglobin|anesthesia|anesthetic|anesthetics|"
    r"orthopedic|orthopedics|"
    r"fulfill|fulfills|fulfillment|fulfillments|enroll|enrolls|enrollment|enrollments|"
    r"installment|installments|skillful|skillfully|willful|willfully|distill|distills|"
    r"instill|instills|jewelry|cancelation|cancelations)$")
MISC_UK = re.compile(
    r"^(?:defence|defences|defenceless|offence|offences|pretence|pretences|"
    r"grey|greys|greyed|greying|greyish|greyscale|greyer|greyest|greyness|"
    r"aluminium|mould|moulds|moulded|moulding|mouldy|plough|ploughs|ploughed|ploughing|"
    r"cosy|cosier|cosiest|cosiness|pyjama|pyjamas|moustache|moustaches|doughnut|doughnuts|"
    r"sulphur|sulphuric|aeroplane|aeroplanes|"
    r"anaemia|anaemic|encyclopaedia|encyclopaedias|paediatric|paediatrics|paediatrician|"
    r"foetus|foetuses|foetal|oestrogen|leukaemia|haemoglobin|anaesthesia|anaesthetic|anaesthetics|"
    r"orthopaedic|orthopaedics|"
    r"fulfil|fulfils|fulfilment|fulfilments|enrol|enrols|enrolment|enrolments|"
    r"instalment|instalments|skilful|skilfully|wilful|wilfully|distil|distils|"
    r"instil|instils|jewellery|licence|licences)$")

# ---- -yse / -yze -------------------------------------------------------------------------
LYZ_US = re.compile(r"^[a-z]{2,}lyz(?:e|es|ed|ing|er|ers|able|ation|ations)$")
LYS_UK = re.compile(r"^[a-z]{2,}lys(?:e|ed|ing|er|ers|able)$")

# ---- -ise / -ize (generic) ---------------------------------------------------------------
IZ = re.compile(r"^([a-z]{3,})iz(e|es|ed|ing|er|ers|able|ation|ations|ational|ationally)$")
IS = re.compile(r"^([a-z]{3,})is(e|es|ed|ing|er|ers|able|ation|ations|ational|ationally)$")
# Words ending -ize in both varieties (checked on the base form stem+'ize').
IZE_SAME_END = ("size", "seize", "prize", "maize", "baize", "assize", "belize")
# Words ending -ise in both varieties (checked on the base form stem+'ise').
ISE_SAME_END = ("vise", "wise", "uise", "aise", "oise", "eise", "prise", "promise", "premise",
                "surmise", "demise", "chemise", "remise", "exercise", "precise", "concise",
                "excise", "incise", "circumcise", "exorcise", "advertise", "expertise",
                "chastise", "mortise", "treatise", "paradise", "merchandise", "franchise",
                "despise", "valise", "cerise", "denise", "sunrise", "moonrise", "uprise",
                "highrise", "trellise", "mantise", "metropolise", "penise")
ISE_VARIANT_KEEP = ("criticise", "ostracise")


def classify(word):
    w = word.lower()
    if OR_US.match(w) or CENTER_US.match(w) or ER_WORDS_US.match(w) or L_US.match(w) \
            or MISC_US.match(w) or LYZ_US.match(w):
        return "US"
    if OR_UK.match(w) or CENTER_UK.match(w) or ER_WORDS_UK.match(w) or L_UK.match(w) \
            or MISC_UK.match(w):
        return "UK"
    if LYS_UK.match(w):
        return "UK"
    m = IZ.match(w)
    if m:
        base = m.group(1) + "ize"
        if not base.endswith(IZE_SAME_END):
            return "US"
        return None
    m = IS.match(w)
    if m:
        base = m.group(1) + "ise"
        if base.endswith(ISE_VARIANT_KEEP):
            return "UK"
        if not base.endswith(ISE_SAME_END):
            return "UK"
    return None


def verify(ctx):
    text = ctx["text"]
    line_starts = [0]
    for i, ch in enumerate(text):
        if ch == "\n":
            line_starts.append(i + 1)

    def locate(pos):
        lo, hi = 0, len(line_starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if line_starts[mid] <= pos:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1, pos - line_starts[lo] + 1

    evidence = []
    any_us = False
    for run in RUN.finditer(text):
        base = run.start()
        for seg in HUMP.finditer(run.group(0)):
            kind = classify(seg.group(0))
            if kind is None:
                continue
            if kind == "US":
                any_us = True
            line, col = locate(base + seg.start())
            evidence.append({"line": line, "column": col,
                             "node_kind": "word_" + kind + "_spelling",
                             "text": seg.group(0)})
    if not evidence:
        return {"outcome": "NOT_APPLICABLE", "evidence": []}
    return {"outcome": "VIOLATED" if any_us else "SATISFIED", "evidence": evidence}
