// 司南 · 古籍英译流水线（Layer B 内容生产）
// ===========================================================================
// 用法（主会话触发）：
//   Workflow({ scriptPath: 'daos/tools/i18n/translate-book.workflow.js',
//              args: { book: 'zangshu', batchSize: 20 } })
// 产出：返回一份合法的 sidecar 对象（daos/data/translations/en/<book>.json 内容）。
//   主会话拿到后写盘并跑 `python3 daos/tools/i18n/translate_tool.py validate <book>` 校验。
//   （流水线本身不写盘，写盘留在主会话手里——原子、可控、可复核。）
//
// 模型：翻译/审校 agent 用 sonnet（高量、便宜；用户 sonnet 额度充足时批量跑）。
// 规范：每个 agent 读 daos/tools/i18n/TRANSLATE-SPEC.md + daos/data/glossary.json。
// 铁律：origHash 由 prep（工具，确定性）计算，LLM 从不碰；译者只回 en 等字段，脚本贴回 origHash。
// ===========================================================================
export const meta = {
  name: 'daos-translate-book',
  description: '把一部古籍句级原文翻成英文 sidecar（Sonnet 直译 + 对抗审校 + 工具校验）',
  phases: [
    { title: 'Prep', detail: '确定性取句 + origHash + 书名（translate_tool.py prep）' },
    { title: 'Translate', detail: 'Sonnet 分批直译 orig（读 SPEC + glossary）' },
    { title: 'Review', detail: 'Sonnet 对抗审校（术语/禁语/忠实度/防编造）' },
  ],
  model: 'sonnet',
}

const REPO = '/home/leonard/ai-daoshi'
const book = (args && args.book) || 'zangshu'
const batchSize = (args && args.batchSize) || 20
const SPEC = `${REPO}/daos/tools/i18n/TRANSLATE-SPEC.md`
const GLOSSARY = `${REPO}/daos/data/glossary.json`

log(`翻译《${book}》：prep → 分批直译(Sonnet) → 对抗审校(Sonnet)`)

// ---- Phase 1 · Prep（确定性，工具算 origHash）--------------------------------
phase('Prep')
const PREP_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['book', 'srcHash', 'sentences'],
  properties: {
    book: { type: 'string' }, srcFile: { type: 'string' }, srcHash: { type: 'string' },
    titleEn: { type: 'string' }, titlePinyin: { type: 'string' }, count: { type: 'integer' },
    sentences: { type: 'array', items: {
      type: 'object', additionalProperties: true,
      required: ['ch', 'i', 'origHash', 'orig'],
      properties: { ch: { type: 'string' }, i: { type: 'integer' },
        origHash: { type: 'string' }, orig: { type: 'string' }, bai: { type: 'string' } } } },
  },
}
const prep = await agent(
  `运行：cd ${REPO} && python3 daos/tools/i18n/translate_tool.py prep ${book}\n` +
  `把该命令 stdout 的 JSON 原样作为你的结构化输出返回（不要改动任何字段，尤其 origHash 一位都不能动）。` +
  `若命令报错（如无此书的 annotated 文件），返回 {"book":"${book}","srcHash":"","sentences":[]} 并在 count 记 0。`,
  { label: `prep:${book}`, phase: 'Prep', schema: PREP_SCHEMA, effort: 'low' }
)

if (!prep || !prep.sentences || prep.sentences.length === 0) {
  log(`✗《${book}》无可翻译句（缺 annotated 或空）。`)
  return { book, error: 'no-sentences', sidecar: null }
}
log(`prep 就绪：${prep.sentences.length} 句，书名 ${prep.titleEn || '(未查到)'}`)

// ---- 分批 -------------------------------------------------------------------
const batches = []
for (let i = 0; i < prep.sentences.length; i += batchSize) {
  batches.push({ idx: batches.length, items: prep.sentences.slice(i, i + batchSize) })
}
log(`分 ${batches.length} 批（每批≤${batchSize} 句）`)

const OUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['sentences'],
  properties: {
    sentences: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['ch', 'i', 'en', 'conf'],
      properties: {
        ch: { type: 'string' }, i: { type: 'integer' },
        en: { type: 'string', minLength: 1 },
        enNote: { type: 'string' },
        terms: { type: 'array', items: { type: 'string' } },
        conf: { type: 'string', enum: ['high', 'med', 'low'] },
      } } },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

// batch → 直译 → 对抗审校（pipeline：每批独立流过两级，无栅栏）
const reviewed = await pipeline(
  batches,
  (b) => agent(
    `你是古籍英译「译者」。先读规范 ${SPEC} 与术语表 ${GLOSSARY}（命中的术语用其 en + 带声调拼音）。\n` +
    `翻译《${book}》(${prep.titleEn || book}) 的这批句子：翻 orig（不翻 bai，bai 仅帮你理解），每句一行英文直译 caption。\n` +
    `严格按 SPEC 输出契约：每句只回 {ch,i,en,enNote?,terms?,conf}，ch/i 与输入逐一对应不增不漏。\n\n` +
    `批次数据(JSON)：\n${JSON.stringify(b.items.map(s => ({ ch: s.ch, i: s.i, orig: s.orig, bai: s.bai })), null, 0)}`,
    { label: `tr:${book}#${b.idx}`, phase: 'Translate', schema: OUT_SCHEMA }
  ),
  (draft, b) => agent(
    `你是古籍英译「对抗审校」（第二道关）。读规范 ${SPEC} 与术语表 ${GLOSSARY}。\n` +
    `逐句核初稿：①是否误译了 bai 而非 orig ②禁语(算命/营销腔) ③术语是否符合 glossary+声调 ④编造/占位 ⑤忠实度。\n` +
    `发现问题就改正、把该句 conf 下调，返回修正后的整批 {sentences:[...]}，并在 issues[] 列出改动。\n\n` +
    `原文批次：\n${JSON.stringify(b.items.map(s => ({ ch: s.ch, i: s.i, orig: s.orig })), null, 0)}\n\n` +
    `待审初稿：\n${JSON.stringify(draft && draft.sentences || [], null, 0)}`,
    { label: `rv:${book}#${b.idx}`, phase: 'Review', schema: OUT_SCHEMA }
  ),
)

// ---- 组装 sidecar（按 (ch,i) 贴回工具算的 origHash）---------------------------
const hashOf = {}
for (const s of prep.sentences) hashOf[`${s.ch}/${s.i}`] = s.origHash
const seen = {}
const outSentences = []
const allIssues = []
for (const batch of reviewed) {
  if (!batch || !batch.sentences) continue
  if (batch.issues) allIssues.push(...batch.issues)
  for (const s of batch.sentences) {
    const key = `${s.ch}/${s.i}`
    const oh = hashOf[key]
    if (!oh) { allIssues.push(`丢弃越界句 ${key}（不在 prep 集）`); continue }
    if (seen[key]) continue
    seen[key] = 1
    const rec = { ch: s.ch, i: s.i, origHash: oh, en: s.en, conf: s.conf || 'med', status: 'draft' }
    if (s.enNote) rec.enNote = s.enNote
    if (s.terms && s.terms.length) rec.terms = s.terms
    outSentences.push(rec)
  }
}
outSentences.sort((a, b) => a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : a.i - b.i)

const sidecar = {
  book: prep.book,
  srcFile: prep.srcFile || `annotated/${book}.json`,
  srcHash: prep.srcHash,
  titleEn: prep.titleEn || undefined,
  titlePinyin: prep.titlePinyin || undefined,
  pipeline: 'sonnet-translate+adversarial-review (status=draft；须人工抽查 low-conf 后升 reviewed)',
  sentences: outSentences,
}

log(`《${book}》完成：${outSentences.length}/${prep.sentences.length} 句译出，审校 issues ${allIssues.length} 条`)
return { book, translated: outSentences.length, total: prep.sentences.length, issues: allIssues, sidecar }
