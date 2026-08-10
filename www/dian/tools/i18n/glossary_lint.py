#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
司南 · glossary / 译文 lint
================================================================
硬检（有命中即 exit 1）：
  ① §1.4 禁语：扫 translations/en/*.json 的 en/enNote + web/js/i18n/en.js 的英文值。
  ② 拼音必带声调：glossary.json terms[].pinyin 非空却无声调符（除英文外来词白名单）。
信息（只报不阻断，exit 不受影响）：
  ③ 三源一致性：glossary.json vs web/js/plain-glossary.js（186 个 en 字段）按汉字对比 en，报冲突。
门禁接入见 daos/tools/check.sh（当前 lint 以 advisory 方式跑）。
"""
import re, os, json, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DAOS = os.path.abspath(os.path.join(HERE, "..", ".."))
ROOT = os.path.abspath(os.path.join(DAOS, ".."))
GLOSSARY = os.path.join(DAOS, "data", "glossary.json")
TRANS = os.path.join(DAOS, "data", "translations", "en")
EN_JS = os.path.join(ROOT, "web", "js", "i18n", "en.js")
PLAIN = os.path.join(ROOT, "web", "js", "plain-glossary.js")

# §1.4 禁语（算命腔/营销腔）——targeted 短语，避免误伤正当词
BANNED = [
    r"destiny\s+reveals?", r"unlock\s+your\s+(destiny|fate|potential)", r"\byour\s+fate\b",
    r"lucky\s+energy", r"\bmystical\b", r"the\s+stars?\s+(say|reveal|show|tell)",
    r"dear\s+seeker", r"esteemed\s+one", r"\bwill\s+bring\s+you\b", r"\bguarantees?\b",
    r"unlock\s+your\s+destiny",
]
BANNED_RE = re.compile("|".join(BANNED), re.I)

TONE = set("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀ")
# §0 允许的无声调英文外来词
TONELESS_OK = {"yin", "yang", "feng shui", "fengshui", "luopan", "bazi", "xuankong",
               "yin and yang", "feng-shui"}


def scan_banned():
    hits = []
    files = sorted(glob.glob(os.path.join(TRANS, "*.json")))
    for fp in files:
        d = json.load(open(fp, encoding="utf-8"))
        for s in d.get("sentences", []):
            for k in ("en", "enNote"):
                v = s.get(k, "")
                if v and BANNED_RE.search(v):
                    hits.append(f"{os.path.basename(fp)} {s.get('ch')}/{s.get('i')} [{k}]: “{v[:60]}”")
        for c in d.get("chapters", []):
            v = c.get("en", "")
            if v and BANNED_RE.search(v):
                hits.append(f"{os.path.basename(fp)} {c.get('ch')} [chap.en]: “{v[:60]}”")
    if os.path.exists(EN_JS):
        for m in re.finditer(r":\s*'((?:[^'\\]|\\.)*)'", open(EN_JS, encoding="utf-8").read()):
            if BANNED_RE.search(m.group(1)):
                hits.append(f"en.js: “{m.group(1)[:60]}”")
    return hits


def scan_pinyin():
    if not os.path.exists(GLOSSARY):
        return []
    g = json.load(open(GLOSSARY, encoding="utf-8"))
    bad = []
    for t in g.get("terms", []):
        py = (t.get("pinyin") or "").strip()
        if not py or py.lower() in TONELESS_OK:
            continue
        if not any(ch in TONE for ch in py):
            bad.append(f"{t.get('hanzi')} → pinyin '{py}'（无声调）")
    return bad


def plain_glossary_pairs():
    """从 plain-glossary.js 抽 {汉字: en}（行式解析：'汉字': { ... 'en'/\"en\": '...' ...}）。"""
    if not os.path.exists(PLAIN):
        return {}
    pairs, cur = {}, None
    key_re = re.compile(r'^\s*["\']([一-鿿·]+)["\']\s*:\s*\{')
    en_re = re.compile(r'["\']en["\']\s*:\s*["\'](.+?)["\']\s*,?\s*$')
    for ln in open(PLAIN, encoding="utf-8"):
        mk = key_re.match(ln)
        if mk:
            cur = mk.group(1); continue
        me = en_re.search(ln)
        if me and cur:
            pairs.setdefault(cur, me.group(1)); cur = None
    return pairs


_STOP = {"the", "a", "an", "of", "to", "and", "or", "in", "on"}


def _core_words(en):
    """归一：小写、去括号内容(拼音/义项标注)、去斜杠备选、去停用词，留英文核心词集合。"""
    s = re.sub(r"\([^)]*\)", " ", en.lower())          # 去括号
    s = s.split("/")[0]                                  # 取首选（斜杠前）
    s = re.sub(r"[^a-z\s]", " ", s)                      # 去非字母（含拼音声调、符号）
    return {w for w in s.split() if w and w not in _STOP and len(w) > 2}


def diff_sources():
    """区分『真漂移』（同字同义但英译核心词无交集）与『义项差异/兼容』（共享核心词或子串）。
    只有真漂移才该对齐；义项差异（如 乾=NW corner vs Heaven）不能强行统一。"""
    if not os.path.exists(GLOSSARY):
        return 0, 0, [], []
    g = json.load(open(GLOSSARY, encoding="utf-8"))
    # 同一汉字可在多小节各有义项（如 乾=§2.7 Heaven / §2.12 NW corner）——聚合全部义项
    gmap = {}
    for t in g.get("terms", []):
        if t.get("hanzi") and t.get("en"):
            gmap.setdefault(t["hanzi"], []).append(t["en"])
    pmap = plain_glossary_pairs()
    true_drift, sense_diff = [], []
    for h, pen in pmap.items():
        gens = gmap.get(h)
        if not (gens and pen):
            continue
        pl = pen.strip().lower(); pw = _core_words(pen)
        compatible = False
        for gen in gens:
            if gen.strip().lower() == pl or gen in pen or pen in gen or (_core_words(gen) & pw):
                compatible = True; break            # 与任一义项兼容/共享核心词 → 非漂移
        if compatible:
            sense_diff.append(f"{h}: plain“{pen[:40]}”兼容 glossary 某义项")
        else:
            true_drift.append(f"{h}: glossary“{' | '.join(gens)}” ≠ plain“{pen[:40]}”")
    return len(gmap), len(pmap), true_drift, sense_diff


def main():
    banned = scan_banned()
    pinyin = scan_pinyin()
    ng, npl, true_drift, sense_diff = diff_sources()

    print("glossary/译文 lint：")
    print(f"  ① 禁语命中：{len(banned)}  → {'✓' if not banned else '✗'}")
    for h in banned[:15]:
        print("      " + h)
    print(f"  ② 无声调拼音：{len(pinyin)}  → {'✓' if not pinyin else '✗'}")
    for h in pinyin[:15]:
        print("      " + h)
    # ③ 信息性：候选漂移含音译/括号注噪声，供人工复核，不自动对齐；义项差异（同字多义）绝不强行统一。
    print(f"  ③ 三源对比（info，report-only）：glossary {ng} 词 / plain-glossary {npl} 词；"
          f"候选漂移 {len(true_drift)}（人工复核，非自动对齐）/ 兼容或义项差异 {len(sense_diff)}")
    for h in true_drift[:20]:
        print("      [候选] " + h)

    return 1 if (banned or pinyin) else 0


if __name__ == "__main__":
    sys.exit(main())
