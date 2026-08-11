#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
司南·典籍阁 语料入库工具 —— 抓取 / 建索引 / 体检

设计铁律（与 data/registry.json 的 meta.notice 一致）：
    「本站所有古文均须从权威全文站实际抓取，不凭记忆默写。」
本工具是这条铁律的执行者：古文只从 URL 取，任何路径都不接受手写正文入库。

用法
----
  python3 tools/ingest.py probe   <书名> [书名...]      # 维基文库检索 + 试抓，看有没有全文
  python3 tools/ingest.py fetch   <spec.json>           # 按 spec 抓取，写 data/texts/<id>.json
  python3 tools/ingest.py index                         # 由 registry + texts 重建 search-index.json
  python3 tools/ingest.py check                         # 一致性硬检（CI 用，不联网）；任一失败 exit 1
  python3 tools/ingest.py audit   [--json]              # 体检：实际汉字数 vs registry 声称
  python3 tools/ingest.py verify  [id ...]              # 抽样回源核对：库里的字是不是源站的字

spec.json 格式（数组，每项一本书）
--------------------------------
  [{
    "id": "zhouyi-lueli",
    "title": "周易略例",
    "subtitle": "周易略例·王弼",
    "category": "zhexue",
    "author": "魏·王弼",
    "dynasty": "曹魏（3世纪）",
    "authorNote": "王弼（226-249），魏晋玄学奠基者。",
    "source": "wikisource",
    "wsTitle": "周易略例",            # 维基文库页名；若为目录页则自动展开子页
    "wsChapters": ["周易略例/明彖", ...],   # 可选：显式指定子页顺序，省略则自动发现
    "status": "较全",
    "statusNote": "..."
  }]
"""

import sys, os, re, json, time, html as htmllib
import urllib.parse, urllib.request, urllib.error
from html.parser import HTMLParser

DIAN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(DIAN, 'data')
TEXTS = os.path.join(DATA, 'texts')
UA = {'User-Agent': 'sinan-dian/1.0 (https://daos.leonardchow.work; classical-text archival)'}
CJK = re.compile(r'[㐀-䶿一-鿿豈-﫿]')

# ---------------------------------------------------------------- 网络

def _get(url, timeout=40, retries=5):
    """带退避重试。

    坑（2026-08-12 实测）：并发抓维基文库时会吃 HTTP 429。旧版遇 HTTPError 直接返回
    错误码不重试，结果《南華真經註疏》末 8 卷被静默跳过、书却照样写盘算「成功」——
    静默截断比抓取失败更危险。故 429/503 必须退避重试，并尊重 Retry-After。
    """
    last = None
    for a in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 502, 504) and a < retries - 1:
                wait = int(e.headers.get('Retry-After') or 0) or min(60, 5 * (2 ** a))
                print(f'    · HTTP {e.code}，等 {wait}s 重试（第 {a + 1} 次）')
                time.sleep(wait)
                last = e
                continue
            return e.code, ''
        except Exception as e:                       # 网络抖动重试
            last = e
            time.sleep(1.5 * (a + 1))
    raise RuntimeError(f'fetch failed after {retries}: {url}: {last}')


def ws_html(title):
    """维基文库 REST API 取 Parsoid HTML。返回 (status, html)。"""
    q = urllib.parse.quote(title, safe='')
    return _get(f'https://zh.wikisource.org/api/rest_v1/page/html/{q}')


def ws_search(q, limit=8):
    u = 'https://zh.wikisource.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'query', 'list': 'search', 'srsearch': q,
        'srlimit': limit, 'format': 'json', 'srnamespace': 0})
    st, body = _get(u)
    if st != 200:
        return []
    return [h['title'] for h in json.loads(body).get('query', {}).get('search', [])]


def ws_subpages(title, page_html):
    """从目录页 HTML 抽出 ./<title>/<子页> 形式的链接，保持出现顺序。

    坑：Parsoid 输出的 href 有时是原样中文（./周易略例/明彖），有时是 URL 编码的
    （./%E5%91%A8...）。只按编码形式匹配会一个都找不到，然后把「有全文的目录页」
    误判成「短/空」。这里统一 unquote 后再比前缀。
    """
    seen, out = set(), []
    pref = title.replace('_', ' ') + '/'
    for m in re.findall(r'href="\./([^"#\s]+)"', page_html):
        t = urllib.parse.unquote(m).replace('_', ' ')
        if t.startswith(pref) and t not in seen:
            seen.add(t)
            out.append(t)
    return out

# ---------------------------------------------------------------- HTML → 正文


class _Extract(HTMLParser):
    """把 Parsoid HTML 抽成段落列表。

    丢弃：脚注 <sup>、样式、维基导航模板（header/navigation/noprint）、编辑链接。
    保留：<p> 与表格单元格文本（部分古籍以表格排版）。
    标题 <h2>/<h3> 单独记录，供单页书内部分章。
    """
    # title 必须滤：HTMLParser 会连 <head><title> 一起读，
    # 否则每章第一段变成「周易略例/明象」这样的页面标题，污染正文与搜索索引。
    SKIP_TAGS = {'style', 'script', 'sup', 'sub', 'title', 'head'}
    SKIP_CLASS = re.compile(r'\b(ws-noexport|noprint|navigation|header_notes|mw-editsection|'
                            r'catlinks|ambox|licence|reflist|references)\b')

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.buf = [], []
        self.depth_skip = 0
        self.in_block = 0
        self.heads = []          # (段落索引, 标题文字)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.SKIP_TAGS or (a.get('class') and self.SKIP_CLASS.search(a['class'])):
            self.depth_skip += 1
            return
        if self.depth_skip:
            return
        if tag in ('p', 'li', 'dd', 'dt', 'td', 'th', 'h2', 'h3', 'h4'):
            self._flush()
            self.in_block = 1
            if tag in ('h2', 'h3', 'h4'):
                self._pending_head = True
        elif tag == 'br':
            self.buf.append('\n')

    def handle_endtag(self, tag):
        a_skip = tag in self.SKIP_TAGS
        if self.depth_skip and (a_skip or True):
            # 只在确实进入过 skip 时递减；HTMLParser 无法精确配对 class-skip，
            # 故用保守策略：遇到任意结束标签且处于 skip 中就尝试递减一次。
            if a_skip:
                self.depth_skip = max(0, self.depth_skip - 1)
                return
        if tag in ('p', 'li', 'dd', 'dt', 'td', 'th', 'h2', 'h3', 'h4'):
            head = getattr(self, '_pending_head', False)
            txt = self._flush()
            if head and txt:
                self.heads.append((len(self.parts) - 1, txt))
            self._pending_head = False
            self.in_block = 0
        elif tag in ('div', 'section', 'table') and self.depth_skip:
            self.depth_skip = max(0, self.depth_skip - 1)

    def handle_data(self, d):
        if self.depth_skip:
            return
        self.buf.append(d)

    def _flush(self):
        t = ''.join(self.buf).strip()
        self.buf = []
        t = re.sub(r'[ \t　]+', '', t)
        t = re.sub(r'\n{2,}', '\n', t)
        if t and CJK.search(t):
            self.parts.append(t)
            return t
        return ''


def html_to_paras(page_html):
    p = _Extract()
    p.feed(page_html)
    p._flush()
    return p.parts, p.heads


def cjk_count(s):
    return len(CJK.findall(s))

# ---------------------------------------------------------------- 抓取一本书


def fetch_book(spec, sleep=0.4, verbose=True):
    """按 spec 抓一本书，返回 texts/<id>.json 的 dict。"""
    src = spec.get('source', 'wikisource')
    if src != 'wikisource':
        raise NotImplementedError(f"{spec['id']}: source={src} 尚未实现（当前只支持 wikisource）")

    ws = spec['wsTitle']
    chapters_spec = spec.get('wsChapters')

    if not chapters_spec:
        st, root = ws_html(ws)
        if st != 200:
            raise RuntimeError(f'{ws}: HTTP {st}')
        subs = ws_subpages(ws, root)
        paras, heads = html_to_paras(root)
        root_cjk = sum(cjk_count(p) for p in paras)
        # 目录页判据：子页多，且自身正文少
        if subs and root_cjk < max(3000, 40 * len(subs)):
            chapters_spec = subs
            if verbose:
                print(f'  ↳ {ws}: 目录页（自身 {root_cjk} 字），展开 {len(subs)} 个子页')
        else:
            chapters_spec = None
            if verbose:
                print(f'  ↳ {ws}: 单页正文 {root_cjk} 字'
                      + (f'，{len(heads)} 个小标题' if heads else ''))

    chapters = []
    skipped = []
    if chapters_spec:
        for i, sub in enumerate(chapters_spec, 1):
            st, h = ws_html(sub)
            if st != 200:
                print(f'  ⚠️  {sub}: HTTP {st}，跳过')
                skipped.append({'page': sub, 'reason': f'HTTP {st}'})
                continue
            paras, _ = html_to_paras(h)
            body = [p for p in paras if cjk_count(p) >= 2]
            if not body:
                print(f'  ⚠️  {sub}: 无正文，跳过')
                skipped.append({'page': sub, 'reason': '页面无正文'})
                continue
            label = sub.split('/', 1)[1] if '/' in sub else sub
            chapters.append({
                'id': f'ch{i:02d}',
                'label': label,
                'fragments': [{'text': t} for t in body],
                'annotation': '',
                'sourceUrl': 'https://zh.wikisource.org/wiki/' + urllib.parse.quote(sub.replace(' ', '_'), safe='/'),
            })
            if verbose:
                print(f'  · {label}: {sum(cjk_count(t) for t in body)} 字')
            time.sleep(sleep)
    else:
        st, h = ws_html(ws)
        paras, heads = html_to_paras(h)
        url = 'https://zh.wikisource.org/wiki/' + urllib.parse.quote(ws.replace(' ', '_'), safe='/')
        if heads and len(heads) >= 2:
            bounds = [i for i, _ in heads] + [len(paras)]
            for n, (start, label) in enumerate(heads, 1):
                seg = [p for p in paras[start + 1: bounds[n]] if cjk_count(p) >= 2]
                if not seg:
                    continue
                chapters.append({'id': f'ch{n:02d}', 'label': label,
                                 'fragments': [{'text': t} for t in seg],
                                 'annotation': '', 'sourceUrl': url})
        else:
            body = [p for p in paras if cjk_count(p) >= 2]
            chapters.append({'id': 'ch01', 'label': spec.get('title', ws),
                             'fragments': [{'text': t} for t in body],
                             'annotation': '', 'sourceUrl': url})

    total = sum(cjk_count(f['text']) for c in chapters for f in c['fragments'])
    if total < 100:
        raise RuntimeError(f"{spec['id']}: 只抓到 {total} 字，判为失败（不入库）")

    out = {
        'id': spec['id'],
        'title': spec['title'],
        'subtitle': spec.get('subtitle', spec['title']),
        'author': spec.get('author', ''),
        'authorNote': spec.get('authorNote', ''),
        'dynasty': spec.get('dynasty', ''),
        'category': spec['category'],
        'licenseNote': spec.get('licenseNote', '公有领域'),
        'source': spec.get('sourceUrl') or ('https://zh.wikisource.org/wiki/'
                                            + urllib.parse.quote(ws.replace(' ', '_'), safe='/')),
        'sourceName': spec.get('sourceName', f'维基文库·{ws}'),
        'sourceCC': spec.get('sourceCC', 'CC-BY-SA'),
        'fetchNote': spec.get('fetchNote',
                              '原文录自维基文库，保留繁体原字；古籍本身属公有领域。'
                              f'抓取于 {time.strftime("%Y-%m-%d")}，由 tools/ingest.py 自动入库。'),
        'status': spec.get('status', '较全'),
        'chapters': chapters,
    }
    if skipped:
        # 抓漏必须留痕：书能读，但「这本是全的」这句话不能说。
        out['incomplete'] = skipped
        out['status'] = '部分'
        out['statusNote'] = ((spec.get('statusNote', '') + ' ') if spec.get('statusNote') else '') \
            + f'⚠️ 抓取时有 {len(skipped)} 个页面未取到（' \
            + '、'.join(s['page'].split('/')[-1] for s in skipped[:6]) \
            + ('…' if len(skipped) > 6 else '') + '），待补。'
    return out, total, skipped

# ---------------------------------------------------------------- registry 合并


def merge_registry(specs):
    """把已抓好的书并入 registry.json（幂等：同 id 覆盖而非追加）。

    charCount 沿用本仓库既有口径 = 正文总字符数（含标点），非纯汉字数；
    纯汉字数请用 audit。两者比值约 1.2，历史条目也是这个口径。
    """
    rp = os.path.join(DATA, 'registry.json')
    reg = json.load(open(rp))
    byid = {b['id']: i for i, b in enumerate(reg['books'])}
    added, updated = [], []
    for s in specs:
        p = os.path.join(TEXTS, s['id'] + '.json')
        if not os.path.exists(p):
            print(f"  ⚠️  {s['id']}: 无 texts 文件，跳过（先跑 fetch）")
            continue
        t = json.load(open(p))
        chs = t.get('chapters', [])
        joined = ''.join(f.get('text', '') for c in chs for f in c.get('fragments', []))
        entry = {
            'id': s['id'], 'title': s['title'],
            'subtitle': s.get('subtitle', s['title']),
            'category': s['category'],
            'author': s.get('author', ''), 'dynasty': s.get('dynasty', ''),
            'authorNote': s.get('authorNote', ''),
            'licenseNote': s.get('licenseNote', '公有领域'),
            'source': t.get('source', ''), 'sourceName': t.get('sourceName', ''),
            'sourceCC': t.get('sourceCC', 'CC-BY-SA'),
            'status': t.get('status', s.get('status', '较全')),
            'statusNote': t.get('statusNote', s.get('statusNote', '')),
            'fragments': [], 'chapters': [],
            'hasTextData': True,
            'chapterCount': len(chs),
            'charCount': len(joined),
            'hasAnnotated': os.path.exists(os.path.join(DATA, 'annotated', s['id'] + '.json')),
        }
        if s['id'] in byid:
            reg['books'][byid[s['id']]] = entry
            updated.append(s['id'])
        else:
            reg['books'].append(entry)
            added.append(s['id'])

    have_text = sum(1 for b in reg['books']
                    if os.path.exists(os.path.join(TEXTS, b['id'] + '.json')))
    reg['meta']['textCount'] = have_text
    reg['meta']['totalCount'] = len(reg['books'])
    reg['meta']['lastUpdated'] = time.strftime('%Y-%m-%d') + '-ingest'
    with open(rp, 'w') as f:
        json.dump(reg, f, ensure_ascii=False, indent=2)
    return added, updated, reg


# ---------------------------------------------------------------- 索引


def build_index():
    reg = json.load(open(os.path.join(DATA, 'registry.json')))
    out = []
    for b in reg['books']:
        p = os.path.join(TEXTS, b['id'] + '.json')
        if not os.path.exists(p):
            continue
        t = json.load(open(p))
        for c in t.get('chapters', []):
            txt = ''.join(f.get('text', '') for f in c.get('fragments', []))
            if txt:
                out.append({'id': f"{b['id']}/{c['id']}", 'bookId': b['id'],
                            'bookTitle': b['title'], 'category': b['category'],
                            'chapterId': c['id'], 'chapterLabel': c.get('label', ''),
                            'text': txt, 'type': 'content'})
            an = (c.get('annotation') or '').strip()
            if an:
                out.append({'id': f"{b['id']}/{c['id']}/annot", 'bookId': b['id'],
                            'bookTitle': b['title'], 'category': b['category'],
                            'chapterId': c['id'], 'chapterLabel': c.get('label', ''),
                            'text': an, 'type': 'annotation'})
    return out

# ---------------------------------------------------------------- 体检


def audit():
    reg = json.load(open(os.path.join(DATA, 'registry.json')))
    rows = []
    for b in reg['books']:
        p = os.path.join(TEXTS, b['id'] + '.json')
        real = ch = waiting = 0
        if os.path.exists(p):
            t = json.load(open(p))
            for c in t.get('chapters', []):
                ch += 1
                txt = ''.join(f.get('text', '') for f in c.get('fragments', []))
                if '待補' in txt or '待补' in txt:
                    waiting += 1
                real += cjk_count(txt)
        rows.append({'id': b['id'], 'title': b['title'], 'category': b['category'],
                     'realCjk': real, 'claimed': b.get('charCount'), 'chapters': ch,
                     'waitingChapters': waiting, 'status': b.get('status')})
    rows.sort(key=lambda r: r['realCjk'])
    return rows

# ---------------------------------------------------------------- 一致性硬检（CI）


def check():
    """不联网的结构一致性硬检。返回错误列表（空 = 通过）。

    这几条都是真出过事的：
      ① registry 说有正文、texts/ 里却没有文件 —— 前端点进去空白。
      ② search-index 与 texts/ 不同步 —— 加了书搜不到（本仓库 2026-08 实际漂了 36 条）。
      ③ 章节里全是「待补」却标 status=较全 —— 目录看着满，点进去是壳。
      ④ 新入库章节缺 sourceUrl —— 无法回源核对，等于放弃溯源。
    """
    errs, warns = [], []
    reg = json.load(open(os.path.join(DATA, 'registry.json')))
    ids = [b['id'] for b in reg['books']]

    if len(ids) != len(set(ids)):
        dup = {i for i in ids if ids.count(i) > 1}
        errs.append(f'registry 有重复 id: {sorted(dup)}')

    cats = {c['id'] for c in reg['categories']}
    for b in reg['books']:
        if b['category'] not in cats:
            errs.append(f"{b['id']}: category={b['category']} 不在 categories 里")

        p = os.path.join(TEXTS, b['id'] + '.json')
        if b.get('hasTextData') and not os.path.exists(p):
            errs.append(f"{b['id']}: hasTextData=true 但 data/texts/{b['id']}.json 不存在")
            continue
        if not os.path.exists(p):
            continue

        t = json.load(open(p))
        if t.get('id') != b['id']:
            errs.append(f"{b['id']}: texts 文件里的 id={t.get('id')} 对不上")
        chs = t.get('chapters', [])
        if b.get('chapterCount') is not None and b['chapterCount'] != len(chs):
            errs.append(f"{b['id']}: registry.chapterCount={b['chapterCount']} "
                        f"但实际 {len(chs)} 章")
        cids = [c['id'] for c in chs]
        if len(cids) != len(set(cids)):
            errs.append(f"{b['id']}: 章节 id 重复")

        real = sum(cjk_count(f.get('text', '')) for c in chs for f in c.get('fragments', []))
        if b.get('status') in ('全', '较全') and real < 1000:
            errs.append(f"{b['id']}: status={b['status']} 但实际只有 {real} 个汉字（空壳）")

        no_src = [c['id'] for c in chs if c.get('fragments') and not c.get('sourceUrl')]
        if no_src:
            warns.append(f"{b['id']}: {len(no_src)} 章无 sourceUrl，无法回源核对（旧数据）")

    # ② 索引同步
    live = build_index()
    disk = json.load(open(os.path.join(DATA, 'search-index.json')))
    lk = {e['id']: e['text'] for e in live}
    dk = {e['id']: e['text'] for e in disk}
    missing = set(lk) - set(dk)
    stale = {k for k in set(lk) & set(dk) if lk[k] != dk[k]}
    orphan = set(dk) - set(lk)
    if missing or stale or orphan:
        errs.append(f'search-index.json 与 texts/ 不同步：缺 {len(missing)} 条 / '
                    f'过期 {len(stale)} 条 / 多余 {len(orphan)} 条。'
                    f'跑 `python3 tools/ingest.py index` 重建。'
                    + (f' 例：{sorted(missing)[:3]}' if missing else ''))
    return errs, warns


# ---------------------------------------------------------------- 回源核对


def verify_book(bid, samples=3):
    """随机抽 N 段，回源站比对——库里的字必须在源页面里能找到。"""
    p = os.path.join(TEXTS, bid + '.json')
    t = json.load(open(p))
    chs = [c for c in t.get('chapters', []) if c.get('fragments') and c.get('sourceUrl')]
    if not chs:
        return {'id': bid, 'ok': None, 'reason': '无 sourceUrl，无法回源核对（旧数据）'}
    step = max(1, len(chs) // samples)
    picked = chs[::step][:samples]
    results = []
    for c in picked:
        title = urllib.parse.unquote(c['sourceUrl'].split('/wiki/', 1)[1]).replace('_', ' ')
        st, h = ws_html(title)
        if st != 200:
            results.append({'chapter': c['label'], 'ok': False, 'reason': f'源站 HTTP {st}'})
            continue
        src = re.sub(r'\s+', '', re.sub(r'<[^>]+>', '', h))
        frag = c['fragments'][0]['text']
        probe = re.sub(r'\s+', '', frag)[:30]
        results.append({'chapter': c['label'], 'ok': probe in src,
                        'probe': probe, 'reason': '' if probe in src else '库中文字未在源页面出现'})
    return {'id': bid, 'ok': all(r['ok'] for r in results), 'checks': results}

# ---------------------------------------------------------------- CLI


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    cmd = sys.argv[1]

    if cmd == 'probe':
        for q in sys.argv[2:]:
            hits = ws_search(q)
            print(f'【{q}】')
            for h in hits:
                st, body = ws_html(h)
                paras, _ = html_to_paras(body) if st == 200 else ([], [])
                n = sum(cjk_count(p) for p in paras)
                subs = len(ws_subpages(h, body)) if st == 200 else 0
                kind = '目录页' if subs and n < 3000 else ('正文' if n > 500 else '短/空')
                print(f'   {h:<34} HTTP={st} 字={n:<7} 子页={subs:<3} {kind}')
        return 0

    if cmd == 'fetch':
        specs = json.load(open(sys.argv[2]))
        only = set(sys.argv[3:])
        ok, fail, partial = [], [], []
        for s in specs:
            if only and s['id'] not in only:
                continue
            print(f"▶ {s['title']}（{s['id']}）")
            try:
                doc, total, skipped = fetch_book(s)
                os.makedirs(TEXTS, exist_ok=True)
                with open(os.path.join(TEXTS, s['id'] + '.json'), 'w') as f:
                    json.dump(doc, f, ensure_ascii=False, indent=2)
                mark = '✓' if not skipped else '◐'
                print(f"  {mark} {total} 字 / {len(doc['chapters'])} 章 "
                      f"→ data/texts/{s['id']}.json"
                      + (f'（⚠️ 漏 {len(skipped)} 页，已标 status=部分）' if skipped else ''))
                rec = {'id': s['id'], 'title': s['title'], 'cjk': total,
                       'chapters': len(doc['chapters']), 'skipped': len(skipped)}
                (partial if skipped else ok).append(rec)
            except Exception as e:
                print(f'  ✗ {e}')
                fail.append({'id': s['id'], 'title': s['title'], 'error': str(e)})
        print(f'\n完整 {len(ok)} / 残缺 {len(partial)} / 失败 {len(fail)}')
        for p in partial:
            print(f"  ◐ {p['title']}：漏 {p['skipped']} 页，重跑 "
                  f"`fetch {sys.argv[2]} {p['id']}` 可只补这本")
        with open(os.path.join(DIAN, 'tools', '.last-fetch.json'), 'w') as f:
            json.dump({'ok': ok, 'partial': partial, 'fail': fail}, f,
                      ensure_ascii=False, indent=1)
        # 残缺也算失败：宁可你看见红，也不要拿一本缺了 8 卷的书当全本用。
        return 1 if (fail or partial) else 0

    if cmd == 'registry':
        specs = json.load(open(sys.argv[2]))
        added, updated, reg = merge_registry(specs)
        print(f"✓ registry 合并：新增 {len(added)}（{'、'.join(added)}）"
              f"／更新 {len(updated)}（{'、'.join(updated)}）")
        print(f"  藏书总数 {reg['meta']['totalCount']}，有正文 {reg['meta']['textCount']}")
        return 0

    if cmd == 'index':
        idx = build_index()
        with open(os.path.join(DATA, 'search-index.json'), 'w') as f:
            json.dump(idx, f, ensure_ascii=False)
        print(f'✓ search-index.json 重建：{len(idx)} 条 '
              f"（正文 {sum(1 for e in idx if e['type']=='content')} / "
              f"注 {sum(1 for e in idx if e['type']=='annotation')}）")
        return 0

    if cmd == 'check':
        errs, warns = check()
        for w in warns:
            print(f'  ⚠️  {w}')
        for e in errs:
            print(f'  ✗ {e}')
        if errs:
            print(f'\n✗ 语料一致性检查失败：{len(errs)} 项')
            return 1
        print(f'✓ 语料一致性检查通过（{len(warns)} 条 advisory 警告）')
        return 0

    if cmd == 'audit':
        rows = audit()
        if '--json' in sys.argv:
            print(json.dumps(rows, ensure_ascii=False, indent=1))
            return 0
        print(f"{'实际汉字':>9} {'声称':>7} {'章':>4} {'待补':>4}  书名")
        print('-' * 72)
        for r in rows:
            flag = '  ⚠️ 空壳' if r['realCjk'] < 300 else ('  ⚠️ 偏少' if r['realCjk'] < 1000 else '')
            print(f"{r['realCjk']:>9} {str(r['claimed']):>7} {r['chapters']:>4} "
                  f"{r['waitingChapters']:>4}  {r['title']}{flag}")
        print(f"\n合计 {sum(r['realCjk'] for r in rows)} 字，"
              f"{sum(1 for r in rows if r['realCjk'] >= 1000)}/{len(rows)} 部有实质正文")
        return 0

    if cmd == 'verify':
        ids = sys.argv[2:] or [f[:-5] for f in sorted(os.listdir(TEXTS))]
        bad = 0
        for i in ids:
            r = verify_book(i)
            mark = '✓' if r['ok'] else ('–' if r['ok'] is None else '✗')
            print(f"{mark} {i}: {r.get('reason','')}")
            for c in r.get('checks', []):
                if not c['ok']:
                    print(f"    ✗ {c['chapter']}: {c['reason']}")
                    bad += 1
        return 1 if bad else 0

    print(__doc__)
    return 1


if __name__ == '__main__':
    sys.exit(main())
