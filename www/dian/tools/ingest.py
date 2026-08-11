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
                            r'catlinks|ambox|licence|licenseContainer|reflist|references)\b')
    VOID = {'br', 'img', 'hr', 'meta', 'link', 'input', 'source', 'base', 'col', 'area'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.buf = [], []
        self.stack = []          # [(tag, is_skip_root)]，用真正的标签栈配对
        self.skip_depth = 0      # >0 表示当前在被跳过的子树里
        self.heads = []          # (段落索引, 标题文字)
        self._pending_head = False

    # 为什么用栈：旧版拿一个计数器跳过 class 匹配的容器，而 HTMLParser 不配对标签，
    # 于是四库全书本页首那个 class="licence" 的公有领域提示框一打开就再也关不上，
    # 整页正文被吞光——《钦定协纪辨方书》36 卷只抽出 36 个字却报「成功」。
    # 现在按 (tag, 是否 skip 根) 入栈，遇到对应结束标签才出栈并解除跳过。
    def handle_starttag(self, tag, attrs):
        if tag in self.VOID:
            if tag == 'br' and not self.skip_depth:
                self.buf.append('\n')
            return
        a = dict(attrs)
        is_skip = tag in self.SKIP_TAGS or (a.get('class')
                                            and self.SKIP_CLASS.search(a['class']))
        self.stack.append((tag, bool(is_skip)))
        if is_skip:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag in ('p', 'li', 'dd', 'dt', 'td', 'th', 'h2', 'h3', 'h4'):
            self._flush()
            if tag in ('h2', 'h3', 'h4'):
                self._pending_head = True

    def handle_startendtag(self, tag, attrs):
        if tag == 'br' and not self.skip_depth:
            self.buf.append('\n')

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        # 从栈顶往下找最近的同名标签，容忍源码里未闭合的标签
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for _, was_skip in self.stack[i:]:
                    if was_skip:
                        self.skip_depth = max(0, self.skip_depth - 1)
                del self.stack[i:]
                break
        else:
            return
        if self.skip_depth:
            return
        if tag in ('p', 'li', 'dd', 'dt', 'td', 'th', 'h2', 'h3', 'h4'):
            head = self._pending_head
            txt = self._flush()
            if head and txt:
                self.heads.append((len(self.parts) - 1, txt))
            self._pending_head = False

    def handle_data(self, d):
        if self.skip_depth:
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


# ---------------------------------------------------------------- 中华典藏 / 殆知阁

DC_UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'}


def dc_get(url, timeout=40, retries=4):
    """中华典藏（diancang.xyz / zhonghuadiancang.com）取页。要浏览器 UA + gzip 解码。"""
    import gzip
    last = None
    for a in range(retries):
        try:
            req = urllib.request.Request(url, headers=DC_UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                if r.headers.get('Content-Encoding') == 'gzip':
                    raw = gzip.decompress(raw)
                return r.status, raw.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 502, 504) and a < retries - 1:
                time.sleep(min(45, 4 * (2 ** a)))
                last = e
                continue
            return e.code, ''
        except Exception as e:
            last = e
            time.sleep(1.5 * (a + 1))
    raise RuntimeError(f'diancang fetch failed: {url}: {last}')


def dc_chapters(index_url):
    """目录页 → [(章名, url)]，保持站上顺序。"""
    st, h = dc_get(index_url)
    if st != 200:
        raise RuntimeError(f'{index_url}: HTTP {st}')
    base = index_url.rstrip('/')
    out, seen = [], set()
    for href, label in re.findall(r'href="([^"]+\.html)"[^>]*>([^<]{1,60})</a>', h):
        full = href if href.startswith('http') else urllib.parse.urljoin(index_url, href)
        if not full.startswith(base):          # 只要本书目录下的页
            continue
        if full in seen:
            continue
        seen.add(full)
        out.append((htmllib.unescape(label).strip(), full))
    return out


def dc_body(page_html):
    """正文在 <div id="content" class="panel-body"> 里。"""
    m = re.search(r'<div[^>]+id="content"[^>]*>(.*?)</div>\s*(?:<div|</div>|<script)',
                  page_html, re.S)
    seg = m.group(1) if m else page_html
    paras, _ = html_to_paras(seg)
    return [p for p in paras if cjk_count(p) >= 2]


def txt_body(raw_text):
    """殆知阁一类纯文本源：按空行/换行切段。"""
    parts = [ln.strip() for ln in re.split(r'\n\s*\n|\r?\n', raw_text)]
    return [p for p in parts if cjk_count(p) >= 2]

# ---------------------------------------------------------------- 抓取一本书


def _preserve(spec, chapters):
    """把既有 texts/<id>.json 里人工整理的章节挪到新抓正文之前。

    为什么必须有这个：《八宅明镜》条目里那 72 字的〈大游年歌〉是 core.js 八宅引擎的
    唯一一手判据（已知的「离命生气/天医标反」bug 就出在这一段），而它在中华典藏的
    点校本里未必逐字对得上。直接覆盖 = 把判据冲掉。spec 写 preserveChapters:[章id]
    即保留，其余「【待补】」占位章丢弃。
    """
    ids = spec.get('preserveChapters')
    if not ids:
        return chapters
    p = os.path.join(TEXTS, spec['id'] + '.json')
    if not os.path.exists(p):
        return chapters
    old = {c['id']: c for c in json.load(open(p)).get('chapters', [])}
    head = []
    for cid in ids:
        c = old.get(cid)
        if not c:
            print(f"  ⚠️  preserveChapters: 旧库里没有章节 {cid}")
            continue
        c.setdefault('preserved', True)
        head.append(c)
        print(f"  ⊙ 保留旧章 {cid}（{c.get('label')}）")
    # 新抓章节 id 顺延，避免与保留章撞号
    for n, c in enumerate(chapters, len(head) + 1):
        c['id'] = f'ch{n:02d}'
    return head + chapters


def _norm_label(s):
    return re.sub(r'[·・\s]|第|卷|章|篇|卦|傳|传|[0-9一二三四五六七八九十百]+$', '', s or '').strip()


def _carry_annotations(spec, chapters):
    """重抓覆盖时，把旧库里人工写的章级导读按章名迁移到新章节上。

    实测教训：补全《周易》时，旧库 9 卦各带一段手写导读（且多处把卦象接到司南的
    玄空/命理功能上，如「恒卦→藏风聚气」「中孚→中宫」），一次覆盖全没了，
    而所有闸门都是绿的——annotation 不在任何一致性判据里。
    章名规范化后匹配（「乾卦」↔「乾」），匹配不上的会打印出来，不静默丢弃。
    ⚠️ 不做繁简折叠：旧库「恆卦」与维基文库「恒」就因此漏配过一次，靠下面那条
    「未迁移」警告才发现。宁可漏配后报警，也不要用不可靠的繁简表静默配错章。
    """
    p = os.path.join(TEXTS, spec['id'] + '.json')
    old_src = None
    if os.path.exists(p):
        try:
            old_src = json.load(open(p)).get('chapters', [])
        except Exception:
            old_src = None
    if not old_src:                      # 工作区已被覆盖时回落到 git HEAD
        try:
            import subprocess
            r = subprocess.run(['git', 'show', f'HEAD:www/dian/data/texts/{spec["id"]}.json'],
                               cwd=os.path.dirname(DIAN), capture_output=True, text=True)
            if r.returncode == 0:
                old_src = json.loads(r.stdout).get('chapters', [])
        except Exception:
            old_src = None
    if not old_src:
        return chapters

    pool = {}
    for c in old_src:
        an = (c.get('annotation') or '').strip()
        if an:
            pool[_norm_label(c.get('label', ''))] = (c.get('label'), an)
    if not pool:
        return chapters
    moved, used = 0, set()
    for c in chapters:
        k = _norm_label(c.get('label', ''))
        if k in pool and k not in used and not (c.get('annotation') or '').strip():
            c['annotation'] = pool[k][1]
            used.add(k)
            moved += 1
    if moved:
        print(f'  ⊙ 迁移旧导读 {moved} 条')
    orphan = [pool[k][0] for k in pool if k not in used]
    if orphan:
        print(f'  ⚠️  {len(orphan)} 条旧导读在新章节里找不到对应章名，未迁移：'
              f'{"、".join(orphan[:6])}')
    return chapters


def _assemble(spec, chapters, skipped, source_url, source_name, source_cc, fetch_note):
    chapters = _carry_annotations(spec, chapters)
    chapters = _preserve(spec, chapters)
    total = sum(cjk_count(f['text']) for c in chapters for f in c['fragments'])
    if total < 100:
        raise RuntimeError(f"{spec['id']}: 只抓到 {total} 字，判为失败（不入库）")
    out = {
        'id': spec['id'], 'title': spec['title'],
        'subtitle': spec.get('subtitle', spec['title']),
        'author': spec.get('author', ''), 'authorNote': spec.get('authorNote', ''),
        'dynasty': spec.get('dynasty', ''), 'category': spec['category'],
        'licenseNote': spec.get('licenseNote', '公有领域'),
        'source': source_url, 'sourceName': source_name, 'sourceCC': source_cc,
        'fetchNote': spec.get('fetchNote', fetch_note),
        'status': spec.get('status', '较全'),
        'chapters': chapters,
    }
    if skipped:
        out['incomplete'] = skipped
        out['status'] = '部分'
        out['statusNote'] = ((spec.get('statusNote', '') + ' ') if spec.get('statusNote') else '') \
            + f'⚠️ 抓取时有 {len(skipped)} 个页面未取到（' \
            + '、'.join(str(s['page']).split('/')[-1] for s in skipped[:6]) \
            + ('…' if len(skipped) > 6 else '') + '），待补。'
    elif spec.get('statusNote'):
        out['statusNote'] = spec['statusNote']
    return out, total, skipped


def _fetch_nonws(spec, src, sleep, verbose):
    chapters, skipped = [], []
    if src == 'diancang':
        pairs = ([(l, u) for l, u in zip(spec.get('chapterLabels', []), spec['chapterUrls'])]
                 if spec.get('chapterUrls') and spec.get('chapterLabels')
                 else ([(None, u) for u in spec['chapterUrls']] if spec.get('chapterUrls')
                       else dc_chapters(spec['indexUrl'])))
        if verbose:
            print(f'  ↳ 中华典藏：{len(pairs)} 章')
        for i, (label, url) in enumerate(pairs, 1):
            st, h = dc_get(url)
            if st != 200:
                print(f'  ⚠️  {url}: HTTP {st}，跳过')
                skipped.append({'page': url, 'reason': f'HTTP {st}'})
                continue
            body = dc_body(h)
            if not body:
                print(f'  ⚠️  {url}: 无正文，跳过')
                skipped.append({'page': url, 'reason': '页面无正文'})
                continue
            chapters.append({'id': f'ch{i:02d}', 'label': label or f'第{i}节',
                             'fragments': [{'text': t} for t in body],
                             'annotation': '', 'sourceUrl': url})
            if verbose:
                print(f'  · {label or i}: {sum(cjk_count(t) for t in body)} 字')
            time.sleep(sleep)
        return _assemble(spec, chapters, skipped,
                         spec.get('indexUrl') or spec['chapterUrls'][0],
                         spec.get('sourceName', '中华典藏'),
                         spec.get('sourceCC', '古籍公有领域；点校本版式归原站'),
                         '原文录自中华典藏（简体点校本），古籍本身属公有领域。'
                         f'抓取于 {time.strftime("%Y-%m-%d")}，由 tools/ingest.py 自动入库。')

    # plaintext（殆知阁等单文件）
    url = spec['textUrl']
    st, raw = dc_get(url)
    if st != 200:
        raise RuntimeError(f'{url}: HTTP {st}')
    pat = spec.get('splitPattern')
    if pat:
        parts = re.split(f'({pat})', raw)
        buf, label = [], spec.get('firstLabel', '卷首')
        for seg in parts:
            if re.fullmatch(pat, seg or ''):
                if buf:
                    body = txt_body('\n'.join(buf))
                    if body:
                        chapters.append({'id': f'ch{len(chapters)+1:02d}', 'label': label,
                                         'fragments': [{'text': t} for t in body],
                                         'annotation': '', 'sourceUrl': url})
                buf, label = [], seg.strip()
            else:
                buf.append(seg or '')
        if buf:
            body = txt_body('\n'.join(buf))
            if body:
                chapters.append({'id': f'ch{len(chapters)+1:02d}', 'label': label,
                                 'fragments': [{'text': t} for t in body],
                                 'annotation': '', 'sourceUrl': url})
    if not chapters:
        body = txt_body(raw)
        chapters = [{'id': 'ch01', 'label': spec['title'],
                     'fragments': [{'text': t} for t in body],
                     'annotation': '', 'sourceUrl': url}]
    if verbose:
        print(f'  ↳ 纯文本源：{len(chapters)} 章')
    return _assemble(spec, chapters, skipped, url,
                     spec.get('sourceName', '殆知阁'),
                     spec.get('sourceCC', '公有领域'),
                     '原文录自殆知阁古籍库纯文本，古籍本身属公有领域。'
                     f'抓取于 {time.strftime("%Y-%m-%d")}，由 tools/ingest.py 自动入库。')


def fetch_book(spec, sleep=0.4, verbose=True):
    """按 spec 抓一本书，返回 (texts/<id>.json 的 dict, 汉字数, 漏页列表)。

    source 支持三种：
      wikisource —— wsTitle（目录页自动展开子页）
      diancang   —— indexUrl（中华典藏目录页）或 chapterUrls
      plaintext  —— textUrl（殆知阁一类单文件纯文本），splitPattern 可选分章正则
    """
    src = spec.get('source', 'wikisource')
    if src in ('diancang', 'plaintext'):
        return _fetch_nonws(spec, src, sleep, verbose)

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

    # 目录页自身常混在 chapterUrls 里（普查 agent 直接把根页也列了进来），
    # 不滤掉会把整份目录当成一章正文入库。
    if chapters_spec:
        chapters_spec = [c for c in chapters_spec
                         if c.replace('_', ' ').strip() != ws.replace('_', ' ').strip()]

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

    return _assemble(
        spec, chapters, skipped,
        spec.get('sourceUrl') or ('https://zh.wikisource.org/wiki/'
                                  + urllib.parse.quote(ws.replace(' ', '_'), safe='/')),
        spec.get('sourceName', f'维基文库·{ws}'),
        spec.get('sourceCC', 'CC-BY-SA'),
        '原文录自维基文库，保留繁体原字；古籍本身属公有领域。'
        f'抓取于 {time.strftime("%Y-%m-%d")}，由 tools/ingest.py 自动入库。')

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

        # 回退守卫：registry 记着 charCount（含标点，约为汉字数的 1.2 倍），
        # 若正文汉字数掉到它的六成以下，多半是重抓时抽取出错把好数据覆盖没了。
        # 实测教训：2026-08-12 一次重抓把《钦定协纪辨方书》3607 字覆盖成 1296 字，
        # 当时的空壳判据（<1000）刚好放行。
        claimed = b.get('charCount')
        if claimed and real < claimed * 0.6:
            errs.append(f"{b['id']}: 正文汉字数 {real} 远低于 registry 记录的 charCount "
                        f"{claimed}（<60%）——疑似重抓时抽取失败覆盖了好数据，"
                        f"请 `git diff data/texts/{b['id']}.json` 核对")

        no_src = [c['id'] for c in chs if c.get('fragments') and not c.get('sourceUrl')]
        if no_src:
            warns.append(f"{b['id']}: {len(no_src)} 章无 sourceUrl，无法回源核对（旧数据）")

    # ② 索引同步（支持分片格式与旧的单份扁平数组）
    live = build_index()
    disk_raw = json.load(open(os.path.join(DATA, 'search-index.json')))
    if isinstance(disk_raw, dict) and disk_raw.get('shards') is not None:
        disk = []
        for s in disk_raw['shards']:
            p = os.path.join(DATA, 'search-index', s + '.json')
            if not os.path.exists(p):
                errs.append(f'search-index.json 清单列了分片 {s}，但 '
                            f'data/search-index/{s}.json 不存在')
                continue
            disk += json.load(open(p))
        stray = [f[:-5] for f in os.listdir(os.path.join(DATA, 'search-index'))
                 if f.endswith('.json') and f[:-5] not in disk_raw['shards']] \
            if os.path.isdir(os.path.join(DATA, 'search-index')) else []
        if stray:
            errs.append(f'data/search-index/ 有清单外的残留分片：{stray}（会被前端忽略，应删）')
    else:
        disk = disk_raw
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
        args_rest = [a for a in sys.argv[3:] if not a.startswith('--')]
        resume = '--resume' in sys.argv          # 跳过已抓好的，断点续跑
        only = set(args_rest)
        ok, fail, partial, skipped_done = [], [], [], 0
        for s in specs:
            if only and s['id'] not in only:
                continue
            if resume:
                p = os.path.join(TEXTS, s['id'] + '.json')
                if os.path.exists(p):
                    try:
                        t = json.load(open(p))
                        have = sum(cjk_count(f.get('text', ''))
                                   for c in t.get('chapters', []) for f in c.get('fragments', []))
                        want = s.get('_claimCjk') or 0
                        if have >= 500 and (not want or have >= want * 0.5) and not t.get('incomplete'):
                            skipped_done += 1
                            continue
                    except Exception:
                        pass
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
        print(f'\n完整 {len(ok)} / 残缺 {len(partial)} / 失败 {len(fail)}'
              + (f' / 已抓跳过 {skipped_done}' if skipped_done else ''))
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
        # 按分类分片写盘：单份索引会超过 Cloudflare Pages 25MB 单文件上限。
        shard_dir = os.path.join(DATA, 'search-index')
        os.makedirs(shard_dir, exist_ok=True)
        groups = {}
        for e in idx:
            groups.setdefault(e['category'], []).append(e)
        for old in os.listdir(shard_dir):
            if old.endswith('.json') and old[:-5] not in groups:
                os.remove(os.path.join(shard_dir, old))
        sizes = {}
        for cat, items in groups.items():
            p = os.path.join(shard_dir, cat + '.json')
            with open(p, 'w') as f:
                json.dump(items, f, ensure_ascii=False)
            sizes[cat] = os.path.getsize(p)
        manifest = {
            'format': 'sharded-v1',
            'note': '索引按分类分片存于 data/search-index/<category>.json；'
                    '本文件只是清单。分片是因为单份索引会超过 Cloudflare Pages '
                    '25MB 单文件上限。前端 loadSearchIndex() 并行取全部分片后合并，'
                    '搜索覆盖面与合并成一份完全一致，未做任何截断。',
            'shards': sorted(groups),
            'entries': len(idx),
            'builtBy': 'tools/ingest.py index',
        }
        with open(os.path.join(DATA, 'search-index.json'), 'w') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1)
        big = [c for c, s in sizes.items() if s > 24 * 1024 * 1024]
        print(f'✓ 索引重建：{len(idx)} 条 '
              f"（正文 {sum(1 for e in idx if e['type']=='content')} / "
              f"注 {sum(1 for e in idx if e['type']=='annotation')}），"
              f'{len(groups)} 个分片，合计 {sum(sizes.values())/1048576:.1f} MB')
        for c in sorted(sizes, key=lambda k: -sizes[k]):
            print(f'    {c:<10}{sizes[c]/1048576:>7.2f} MB')
        if big:
            print(f'  ✗ 分片仍超 24MB，需再按书分片：{big}')
            return 1
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
