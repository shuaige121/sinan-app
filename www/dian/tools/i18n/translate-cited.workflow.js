// 司南 · 古籍英译流水线（Layer B）— cited-first 批量版
// ===========================================================================
// 一次并行翻多本命理书「被规则引擎引用」的句子（rules[].src 去重面，272 句）。
// 用法（主会话触发）：
//   Workflow({ scriptPath: 'daos/tools/i18n/translate-cited.workflow.js',
//              args: { batchSize: 30 } })            // books 可选，缺省=下面 BOOKS
// 产出：{ books: { <book>: { sidecar, translated, total, issues } , ... } }
//   主会话逐本写盘 daos/data/translations/en/<book>.json 后跑：
//     python3 daos/tools/i18n/translate_tool.py validate <book>
//   （流水线不写盘；写盘/校验/抽检留主会话，原子可控可复核。）
//
// 模型：sonnet（meta.model）。规范：每 agent 读 TRANSLATE-SPEC.md + glossary.json。
// 铁律：origHash 由 prep（工具，确定性）算，LLM 从不碰；脚本按 (ch,i) 贴回。
// ===========================================================================
export const meta = {
  name: 'daos-translate-cited',
  description: '并行翻多本命理书的被引用句(cited 272)为英文 sidecar（Sonnet 直译+对抗审校+工具校验）',
  phases: [
    { title: 'Prep', detail: 'translate_tool.py prep --only-cited（确定性取句+origHash）', model: 'sonnet' },
    { title: 'Translate', detail: 'Sonnet 分批直译 orig（读 SPEC+glossary）', model: 'sonnet' },
    { title: 'Review', detail: 'Sonnet 对抗审校（术语/禁语/忠实度/防编造）', model: 'sonnet' },
  ],
  model: 'sonnet',
}

const REPO = '/home/leonard/ai-daoshi'
const SPEC = `${REPO}/daos/tools/i18n/TRANSLATE-SPEC.md`
const GLOSSARY = `${REPO}/daos/data/glossary.json`
// cited 面分布来自 translate_tool.py surface（perBook）。八宅明镜仅 1 句，一并带上。
const BOOKS = (args && args.books) || [
  'shenfeng-tongkao', 'yuanhai-ziping', 'ditiansui',
  'xinji-bianfang', 'sanming-tonghui', 'bazhai-mingjing',
]
const batchSize = (args && args.batchSize) || 30

log(`cited-first 批翻：${BOOKS.length} 本 → prep --only-cited → 分批直译(Sonnet) → 对抗审校(Sonnet)`)

// ---- Phase 1 · Prep（确定性，工具算 origHash；每本一个低 effort agent 跑命令）----
phase('Prep')
const PREP_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['book', 'srcHash', 'sentences'],
  properties: {
    book: { type: 'string' }, srcFile: { type: 'string' }, srcHash: { type: 'string' },
    titleEn: { type: 'string' }, titlePinyin: { type: 'string' }, count: { type: 'integer' },
    sentences: {
      type: 'array', items: {
        type: 'object', additionalProperties: true,
        required: ['ch', 'i', 'origHash', 'orig'],
        properties: {
          ch: { type: 'string' }, i: { type: 'integer' },
          origHash: { type: 'string' }, orig: { type: 'string' }, bai: { type: 'string' },
        },
      },
    },
  },
}
const preps = await parallel(BOOKS.map((book) => () => agent(
  `运行：cd ${REPO} && python3 daos/tools/i18n/translate_tool.py prep --only-cited ${book}\n` +
  `把该命令 stdout 的 JSON 原样作为你的结构化输出返回（不改任何字段，尤其 origHash 一位都不能动）。` +
  `若命令报错或空，返回 {"book":"${book}","srcHash":"","sentences":[]}。`,
  { label: `prep:${book}`, phase: 'Prep', schema: PREP_SCHEMA, effort: 'low' },
)))

// 每本建 (ch/i → origHash) 表 + 元信息；构造带 book 标签的批次列表
const hashByBook = {}
const metaByBook = {}
const batchList = []
for (const prep of preps) {
  if (!prep || !prep.sentences || !prep.sentences.length) {
    if (prep) log(`✗《${prep.book}》无 cited 句（跳过）`)
    continue
  }
  const book = prep.book
  hashByBook[book] = {}
  for (const s of prep.sentences) hashByBook[book][`${s.ch}/${s.i}`] = s.origHash
  metaByBook[book] = {
    srcFile: prep.srcFile || `annotated/${book}.json`,
    srcHash: prep.srcHash, titleEn: prep.titleEn || undefined, titlePinyin: prep.titlePinyin || undefined,
    total: prep.sentences.length,
  }
  for (let i = 0; i < prep.sentences.length; i += batchSize) {
    batchList.push({
      book, titleEn: prep.titleEn || book,
      idx: batchList.length, items: prep.sentences.slice(i, i + batchSize),
    })
  }
  log(`prep《${book}》(${prep.titleEn || '?'})：${prep.sentences.length} cited 句`)
}
if (!batchList.length) { log('无任何 cited 句可翻，结束。'); return { books: {} } }
log(`共 ${batchList.length} 批（每批≤${batchSize}）跨 ${Object.keys(metaByBook).length} 本，开始并行直译+审校`)

// ---- Phase 2/3 · 直译 → 对抗审校（pipeline：每批独立流过两级，无栅栏）----------
const OUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['sentences'],
  properties: {
    sentences: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['ch', 'i', 'en', 'conf'],
        properties: {
          ch: { type: 'string' }, i: { type: 'integer' },
          en: { type: 'string', minLength: 1 }, enNote: { type: 'string' },
          terms: { type: 'array', items: { type: 'string' } },
          conf: { type: 'string', enum: ['high', 'med', 'low'] },
        },
      },
    },
    issues: { type: 'array', items: { type: 'string' } },
  },
}
const reviewed = await pipeline(
  batchList,
  (b) => agent(
    `你是古籍英译「译者」。先读规范 ${SPEC} 与术语表 ${GLOSSARY}（命中术语用其 en + 带声调拼音）。\n` +
    `翻《${b.book}》(${b.titleEn}) 这批：翻 orig（不翻 bai，bai 仅帮理解），每句一行英文直译 caption。\n` +
    `严格按 SPEC 输出契约：每句只回 {ch,i,en,enNote?,terms?,conf}，ch/i 与输入逐一对应不增不漏。\n\n` +
    `批次数据(JSON)：\n${JSON.stringify(b.items.map((s) => ({ ch: s.ch, i: s.i, orig: s.orig, bai: s.bai })), null, 0)}`,
    { label: `tr:${b.book}#${b.idx}`, phase: 'Translate', schema: OUT_SCHEMA },
  ),
  (draft, b) => agent(
    `你是古籍英译「对抗审校」（第二道关）。读规范 ${SPEC} 与术语表 ${GLOSSARY}。\n` +
    `逐句核初稿：①误译 bai 而非 orig ②禁语(算命/营销腔) ③术语是否符合 glossary+声调 ④编造/占位 ⑤忠实度。\n` +
    `发现问题就改正、把该句 conf 下调，返回修正后整批 {sentences:[...]}，并在 issues[] 列改动。\n\n` +
    `原文批次：\n${JSON.stringify(b.items.map((s) => ({ ch: s.ch, i: s.i, orig: s.orig })), null, 0)}\n\n` +
    `待审初稿：\n${JSON.stringify((draft && draft.sentences) || [], null, 0)}`,
    { label: `rv:${b.book}#${b.idx}`, phase: 'Review', schema: OUT_SCHEMA },
  ),
)

// ---- 组装：按 book 分组，(ch,i) 贴回工具算的 origHash -------------------------
const bucket = {}   // book → { sentences:[], issues:[], seen:{} }
for (const book of Object.keys(metaByBook)) bucket[book] = { sentences: [], issues: [], seen: {} }
for (let bi = 0; bi < reviewed.length; bi++) {
  const batch = reviewed[bi]
  const src = batchList[bi]
  if (!src) continue
  const book = src.book
  const bk = bucket[book]
  if (!batch || !batch.sentences) { bk.issues.push(`批 #${src.idx} 失败(null)`); continue }
  if (batch.issues) bk.issues.push(...batch.issues)
  const hashOf = hashByBook[book] || {}
  for (const s of batch.sentences) {
    const key = `${s.ch}/${s.i}`
    const oh = hashOf[key]
    if (!oh) { bk.issues.push(`丢弃越界句 ${key}（不在 cited prep 集）`); continue }
    if (bk.seen[key]) continue
    bk.seen[key] = 1
    const rec = { ch: s.ch, i: s.i, origHash: oh, en: s.en, conf: s.conf || 'med', status: 'draft' }
    if (s.enNote) rec.enNote = s.enNote
    if (s.terms && s.terms.length) rec.terms = s.terms
    bk.sentences.push(rec)
  }
}

const books = {}
for (const book of Object.keys(metaByBook)) {
  const bk = bucket[book]
  const m = metaByBook[book]
  bk.sentences.sort((a, b) => (a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : a.i - b.i))
  books[book] = {
    translated: bk.sentences.length, total: m.total, issues: bk.issues,
    sidecar: {
      book, srcFile: m.srcFile, srcHash: m.srcHash,
      titleEn: m.titleEn, titlePinyin: m.titlePinyin,
      pipeline: 'sonnet cited-first translate+adversarial-review (status=draft；须人工抽查 low-conf 后升 reviewed)',
      coverage: 'cited-only (rules[].src 引用面；非全本)',
      sentences: bk.sentences,
    },
  }
  log(`《${book}》完成：${bk.sentences.length}/${m.total} cited 句译出，issues ${bk.issues.length}`)
}
return { books }
