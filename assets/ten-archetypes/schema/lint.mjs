#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_DIR = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.join(SCHEMA_DIR, "redline.rules.json");
const VALID_EXAMPLE_PATHS = [
  path.join(SCHEMA_DIR, "fixtures", "valid-character.json"),
  path.join(SCHEMA_DIR, "fixtures", "valid-faction-character.json")
];
const FIXTURES_DIR = path.join(SCHEMA_DIR, "fixtures");

const args = process.argv.slice(2);
const options = {
  strictReview: args.includes("--strict-review"),
  selfTest: args.includes("--self-test"),
  noSelfTest: args.includes("--no-self-test"),
  help: args.includes("--help") || args.includes("-h")
};
const targetArgs = args.filter((arg) => !arg.startsWith("--") && arg !== "-h");
const unknownFlags = args.filter(
  (arg) => arg.startsWith("-") && !["--strict-review", "--self-test", "--no-self-test", "--help", "-h"].includes(arg)
);

if (options.help) {
  console.log(`Usage:
  node lint.mjs                         validate valid example + run redline self-tests
  node lint.mjs <file-or-dir> [...]     validate character JSON
  node lint.mjs --self-test             run only the fixture self-tests

Options:
  --self-test       also run fixtures when explicit targets are supplied
  --no-self-test    skip fixtures in the no-argument default run
  --strict-review   make REVIEW findings affect the exit code
  -h, --help        show this help`);
  process.exit(0);
}

if (unknownFlags.length > 0) {
  console.error(`Unknown option(s): ${unknownFlags.join(", ")}`);
  process.exit(2);
}

const rulesDocument = await readJson(RULES_PATH);
const ruleMap = new Map(rulesDocument.rules.map((rule) => [rule.id, rule]));
const sourcePaths = Object.fromEntries(
  Object.entries(rulesDocument.sourcePaths).map(([key, relativePath]) => [key, path.resolve(SCHEMA_DIR, relativePath)])
);
const referenceData = await loadReferenceData();

const defaultRun = targetArgs.length === 0 && !options.selfTest;
const runTargets = options.selfTest && targetArgs.length === 0
  ? []
  : targetArgs.length > 0
    ? targetArgs.map((entry) => path.resolve(process.cwd(), entry))
    : VALID_EXAMPLE_PATHS;
const runSelfTests = !options.noSelfTest && (defaultRun || options.selfTest);

console.log("常明城人物 schema / redline lint");
console.log(`事实源：manifest ${referenceData.manifestCharacters.length} 人；registry ${referenceData.registryBooks.size} 部；引文按需读取 texts/*.json`);

let targetIssues = [];
let targetEntries = [];
let inputFailures = [];

if (runTargets.length > 0) {
  console.log("\n[人物数据校验]");
  try {
    targetEntries = await loadTargets(runTargets);
    if (targetEntries.length === 0) {
      inputFailures.push("没有找到可识别的人物 JSON（应为 character 对象、character 数组或 {characters:[...]}）。");
    } else {
      targetIssues = await lintEntries(targetEntries, { includeStructure: true });
      printIssues(targetIssues);
      const errorCount = targetIssues.filter((issue) => issue.severity === "error").length;
      const reviewCount = targetIssues.filter((issue) => issue.severity === "review").length;
      if (errorCount === 0 && reviewCount === 0) {
        console.log(`PASS  ${targetEntries.length} 个人物；无 ERROR / REVIEW`);
      } else {
        console.log(`人物数据：${targetEntries.length} 人；ERROR ${errorCount}；REVIEW ${reviewCount}`);
      }
    }
  } catch (error) {
    inputFailures.push(error instanceof Error ? error.message : String(error));
  }
  for (const failure of inputFailures) {
    console.log(`ERROR [INPUT] ${failure}`);
  }
}

let selfTestResult = { total: 0, passed: 0, failures: [] };
if (runSelfTests) {
  console.log("\n[红线失败自证]");
  selfTestResult = await runFixtureSelfTests();
  console.log(`自证：${selfTestResult.passed}/${selfTestResult.total} fixtures 符合预期`);
}

const targetErrors = targetIssues.filter((issue) => issue.severity === "error").length + inputFailures.length;
const targetReviews = targetIssues.filter((issue) => issue.severity === "review").length;
const selfTestFailures = selfTestResult.total - selfTestResult.passed;
const failed = targetErrors > 0 || selfTestFailures > 0 || (options.strictReview && targetReviews > 0);

console.log("\n[结论]");
console.log(
  failed
    ? `FAIL  ERROR ${targetErrors}；REVIEW ${targetReviews}；自证失败 ${selfTestFailures}`
    : `PASS  ERROR 0；REVIEW ${targetReviews}；自证失败 0`
);
process.exitCode = failed ? 1 : 0;

async function loadReferenceData() {
  const [manifest, registry] = await Promise.all([
    readJson(sourcePaths.manifest),
    readJson(sourcePaths.registry)
  ]);
  if (!Array.isArray(manifest.characters)) {
    throw new Error(`manifest 缺少 characters[]：${sourcePaths.manifest}`);
  }
  if (!Array.isArray(registry.books)) {
    throw new Error(`registry 缺少 books[]：${sourcePaths.registry}`);
  }

  const manifestById = new Map();
  for (const character of manifest.characters) {
    if (manifestById.has(character.id)) {
      throw new Error(`manifest 出现重复 id：${character.id}`);
    }
    manifestById.set(character.id, character);
  }
  const registryBooks = new Map();
  for (const book of registry.books) {
    if (registryBooks.has(book.id)) {
      throw new Error(`registry 出现重复 book id：${book.id}`);
    }
    registryBooks.set(book.id, book);
  }
  return {
    manifestCharacters: manifest.characters,
    manifestById,
    registryBooks,
    textCache: new Map(),
    annotatedCache: new Map()
  };
}

async function loadTargets(paths) {
  const files = [];
  const explicitFiles = new Set();
  for (const targetPath of paths) {
    const targetStat = await stat(targetPath);
    if (targetStat.isDirectory()) {
      files.push(...await collectJsonFiles(targetPath));
    } else {
      files.push(targetPath);
      explicitFiles.add(targetPath);
    }
  }

  const entries = [];
  for (const file of files.sort()) {
    if (file.endsWith(".fixture.json")) continue;
    const document = await readJson(file);
    if (isCharacter(document)) {
      entries.push({ character: document, source: displayPath(file) });
    } else if (Array.isArray(document) && document.every(isCharacter)) {
      document.forEach((character, index) => entries.push({ character, source: `${displayPath(file)}[${index}]` }));
    } else if (isObject(document) && Array.isArray(document.characters) && document.characters.every(isCharacter)) {
      document.characters.forEach((character, index) => entries.push({ character, source: `${displayPath(file)}#characters[${index}]` }));
    } else if (explicitFiles.has(file)) {
      throw new Error(`无法识别人物文档：${displayPath(file)}`);
    }
  }
  return entries;
}

async function collectJsonFiles(directory) {
  const results = [];
  for (const dirent of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      results.push(...await collectJsonFiles(child));
    } else if (dirent.isFile() && dirent.name.endsWith(".json")) {
      results.push(child);
    }
  }
  return results;
}

async function lintEntries(entries, { onlyRules = null, includeStructure = false } = {}) {
  const enabled = onlyRules ? new Set(onlyRules) : null;
  const issues = [];
  const wants = (ruleId) => enabled === null || enabled.has(ruleId);

  if (includeStructure) {
    for (const entry of entries) issues.push(...validateCoreStructure(entry));
  }
  if (wants("CM-RL-001")) {
    for (const entry of entries) issues.push(...checkManifestIdentity(entry));
  }
  if (wants("CM-RL-002")) {
    for (const entry of entries) issues.push(...checkStemTopology(entry));
  }
  if (wants("CM-RL-003")) {
    for (const entry of entries) issues.push(...checkTenGodPerspective(entry));
  }
  if (wants("CM-RL-004")) {
    for (const entry of entries) issues.push(...checkSelfStatement(entry));
  }
  if (wants("CM-RL-005")) {
    issues.push(...checkYinYangGender(entries));
  }
  if (wants("CM-RL-006")) {
    for (const entry of entries) issues.push(...await checkClassicCitations(entry));
  }
  if (wants("CM-RL-007")) {
    for (const entry of entries) issues.push(...checkExclusiveHighlight(entry));
  }
  return issues;
}

function validateCoreStructure(entry) {
  const { character, source } = entry;
  const issues = [];
  const requiredPaths = [
    "/schemaVersion",
    "/id",
    "/kind",
    "/identity/nameZh",
    "/affiliations",
    "/profile/roleZh",
    "/profile/epithetZh",
    "/profile/selfStatementZh",
    "/profile/summaryZh",
    "/profile/giftZh",
    "/profile/shadowZh",
    "/profile/scarZh",
    "/profile/unfinishedZh",
    "/visualLock/presentation/genderPresentation",
    "/visualLock/presentation/ageBand",
    "/visualLock/presentation/isDerivedFromPolarity",
    "/visualLock/silhouetteZh",
    "/visualLock/lockedTraitsZh",
    "/visualLock/wardrobeZh",
    "/visualLock/palette",
    "/visualLock/props",
    "/visualLock/prompt",
    "/voice/summaryZh",
    "/voice/sentenceLength",
    "/voice/directness",
    "/voice/questionFrequency",
    "/voice/preferredPatternsZh",
    "/voice/avoidPatternsZh",
    "/voice/sampleLinesZh",
    "/canon/status",
    "/canon/factsZh",
    "/canon/prohibitionsZh",
    "/canon/irreplaceableHighlightZh",
    "/canon/signatureActionKey",
    "/canon/signatureActionPhraseZh",
    "/canon/unresolvedZh",
    "/relations/worldEdges",
    "/relations/interpretations",
    "/classics",
    "/provenance/status",
    "/provenance/sourceFiles"
  ];
  for (const pointer of requiredPaths) {
    if (getByPointer(character, pointer) === undefined) {
      issues.push(issue("error", "SCHEMA", source, pointer, "缺少 character.schema.json 核心必填字段"));
    }
  }
  if (character.schemaVersion !== "sinan/character@2") {
    issues.push(issue("error", "SCHEMA", source, "/schemaVersion", "必须等于 sinan/character@2"));
  }
  if (!Array.isArray(character.affiliations) || character.affiliations.length === 0) {
    issues.push(issue("error", "SCHEMA", source, "/affiliations", "必须是非空数组"));
  }
  if (!Array.isArray(character.classics) || character.classics.length === 0) {
    issues.push(issue("error", "SCHEMA", source, "/classics", "必须是非空数组"));
  }
  if (getByPointer(character, "/visualLock/presentation/isDerivedFromPolarity") !== false) {
    issues.push(issue("error", "SCHEMA", source, "/visualLock/presentation/isDerivedFromPolarity", "必须显式为 false"));
  }
  if (character.kind === "heavenly-stem") {
    for (const pointer of ["/identity/stem", "/identity/stemPinyin", "/identity/element", "/identity/polarity", "/relations/stemTopology"]) {
      if (getByPointer(character, pointer) === undefined) {
        issues.push(issue("error", "SCHEMA", source, pointer, "heavenly-stem 必填"));
      }
    }
    if (!character.affiliations?.some((item) => item?.factionId === "mingli-zong")) {
      issues.push(issue("error", "SCHEMA", source, "/affiliations", "heavenly-stem 必须归属 mingli-zong"));
    }
  } else if (character.kind === "faction-character") {
    if (!isObject(character.factionRole)) {
      issues.push(issue("error", "SCHEMA", source, "/factionRole", "faction-character 必填"));
    }
    if (character.relations?.stemTopology !== undefined) {
      issues.push(issue("error", "SCHEMA", source, "/relations/stemTopology", "跨派人物不得使用十干专用拓扑"));
    }
  } else {
    issues.push(issue("error", "SCHEMA", source, "/kind", "只允许 heavenly-stem 或 faction-character"));
  }
  return issues;
}

function checkManifestIdentity(entry) {
  const { character, source } = entry;
  if (character.kind !== "heavenly-stem") return [];
  const issues = [];
  const manifestCharacter = referenceData.manifestById.get(character.id);
  if (!manifestCharacter) {
    return [issue("error", "CM-RL-001", source, "/id", `十干 id=${jsonValue(character.id)} 未在 manifest.json 命中`)];
  }
  const base = rulesDocument.canonical.stems[character.id];
  const comparisons = [
    ["/identity/stem", character.identity?.stem, manifestCharacter.gan, "stem / manifest.gan"],
    ["/identity/nameZh", character.identity?.nameZh, manifestCharacter.name, "nameZh / manifest.name"],
    ["/identity/element", character.identity?.element, manifestCharacter.element, "element / manifest.element"],
    ["/identity/stemPinyin", character.identity?.stemPinyin, base?.pinyin, "stemPinyin / stem 基础表"],
    ["/identity/polarity", character.identity?.polarity, base?.polarity, "polarity / stem 基础表"]
  ];
  for (const [pointer, actual, expected, label] of comparisons) {
    if (actual !== expected) {
      issues.push(issue("error", "CM-RL-001", source, pointer, `${label}=${jsonValue(actual)}，锁定值为 ${jsonValue(expected)}`));
    }
  }
  return issues;
}

function checkStemTopology(entry) {
  const { character, source } = entry;
  if (character.kind !== "heavenly-stem") return [];
  const topology = character.relations?.stemTopology;
  if (!isObject(topology)) {
    return [issue("error", "CM-RL-002", source, "/relations/stemTopology", "缺少十干关系拓扑")];
  }
  const expected = deriveTopology(character.id);
  if (!expected) {
    return [issue("error", "CM-RL-002", source, "/id", "无法从 manifest 与规则表推导此十干")];
  }
  const issues = [];
  for (const field of ["peer", "generates", "generatedBy", "controls", "controlledBy"]) {
    if (!arraysEqual(topology[field], expected[field])) {
      issues.push(issue(
        "error",
        "CM-RL-002",
        source,
        `/relations/stemTopology/${field}`,
        `实际 ${jsonValue(topology[field])}，推导应为 ${jsonValue(expected[field])}`
      ));
    }
  }
  for (const field of ["combines", "clashes"]) {
    const actualEdges = Array.isArray(topology[field]) ? topology[field] : [];
    const expectedEdges = expected[field];
    if (actualEdges.length !== expectedEdges.length) {
      issues.push(issue("error", "CM-RL-002", source, `/relations/stemTopology/${field}`, `边数 ${actualEdges.length}，推导应为 ${expectedEdges.length}`));
      continue;
    }
    actualEdges.forEach((edge, index) => {
      const wanted = expectedEdges[index];
      for (const property of ["type", "targetId", "resultElement"]) {
        if (edge?.[property] !== wanted[property]) {
          issues.push(issue(
            "error",
            "CM-RL-002",
            source,
            `/relations/stemTopology/${field}/${index}/${property}`,
            `实际 ${jsonValue(edge?.[property])}，推导应为 ${jsonValue(wanted[property])}`
          ));
        }
      }
    });
  }
  return issues;
}

function deriveTopology(selfId) {
  const self = referenceData.manifestById.get(selfId);
  if (!self) return null;
  const generation = rulesDocument.canonical.elementGeneration;
  const control = rulesDocument.canonical.elementControl;
  const order = rulesDocument.canonical.stemOrder;
  const idsForElement = (element) => order.filter((id) => referenceData.manifestById.get(id)?.element === element);
  const inverseElement = (mapping, target) => Object.keys(mapping).find((source) => mapping[source] === target);
  const combine = rulesDocument.canonical.combinePairs.find((pair) => pair.members.includes(selfId));
  const clash = rulesDocument.canonical.clashPairs.find((pair) => pair.includes(selfId));
  const otherOf = (pair) => pair.find((id) => id !== selfId);
  return {
    peer: idsForElement(self.element).filter((id) => id !== selfId),
    generates: idsForElement(generation[self.element]),
    generatedBy: idsForElement(inverseElement(generation, self.element)),
    controls: idsForElement(control[self.element]),
    controlledBy: idsForElement(inverseElement(control, self.element)),
    combines: combine ? [{ type: "combine", targetId: otherOf(combine.members), resultElement: combine.resultElement }] : [],
    clashes: clash ? [{ type: "clash", targetId: otherOf(clash), resultElement: null }] : []
  };
}

function checkTenGodPerspective(entry) {
  const { character, source } = entry;
  if (character.kind !== "heavenly-stem") return [];
  const topology = character.relations?.stemTopology;
  if (!isObject(topology)) {
    return [issue("error", "CM-RL-003", source, "/relations/stemTopology", "缺少可校验的合冲边")];
  }
  const issues = [];
  for (const field of ["combines", "clashes"]) {
    const edges = Array.isArray(topology[field]) ? topology[field] : [];
    edges.forEach((edge, index) => {
      const selfExpected = deriveTenGod(character.id, edge?.targetId);
      const targetExpected = deriveTenGod(edge?.targetId, character.id);
      if (!selfExpected || !targetExpected) {
        issues.push(issue("error", "CM-RL-003", source, `/relations/stemTopology/${field}/${index}`, "关系端点无法用于十神推导"));
        return;
      }
      if (edge.tenGodFromSelf !== selfExpected.label) {
        issues.push(issue(
          "error",
          "CM-RL-003",
          source,
          `/relations/stemTopology/${field}/${index}/tenGodFromSelf`,
          `${character.id}→${edge.targetId} 实际 ${jsonValue(edge.tenGodFromSelf)}，按「${selfExpected.reason}」应为 ${jsonValue(selfExpected.label)}`
        ));
      }
      if (edge.tenGodFromTarget !== targetExpected.label) {
        issues.push(issue(
          "error",
          "CM-RL-003",
          source,
          `/relations/stemTopology/${field}/${index}/tenGodFromTarget`,
          `${edge.targetId}→${character.id} 实际 ${jsonValue(edge.tenGodFromTarget)}，按「${targetExpected.reason}」应为 ${jsonValue(targetExpected.label)}`
        ));
      }
    });
  }
  return issues;
}

function deriveTenGod(selfId, targetId) {
  const self = referenceData.manifestById.get(selfId);
  const target = referenceData.manifestById.get(targetId);
  const selfBase = rulesDocument.canonical.stems[selfId];
  const targetBase = rulesDocument.canonical.stems[targetId];
  if (!self || !target || !selfBase || !targetBase) return null;
  const generation = rulesDocument.canonical.elementGeneration;
  const control = rulesDocument.canonical.elementControl;
  let relationKey;
  let elementReason;
  if (self.element === target.element) {
    relationKey = "sameElement";
    elementReason = `${self.element}同类`;
  } else if (generation[self.element] === target.element) {
    relationKey = "selfGeneratesTarget";
    elementReason = `${self.element}生${target.element}`;
  } else if (generation[target.element] === self.element) {
    relationKey = "targetGeneratesSelf";
    elementReason = `${target.element}生${self.element}`;
  } else if (control[self.element] === target.element) {
    relationKey = "selfControlsTarget";
    elementReason = `${self.element}制${target.element}`;
  } else if (control[target.element] === self.element) {
    relationKey = "targetControlsSelf";
    elementReason = `${target.element}制${self.element}`;
  } else {
    return null;
  }
  const polarityKey = selfBase.polarity === targetBase.polarity ? "samePolarity" : "oppositePolarity";
  const label = rulesDocument.canonical.tenGodAlgorithm[relationKey][polarityKey];
  return {
    label,
    reason: `${elementReason}、阴阳${polarityKey === "samePolarity" ? "相同" : "相异"}`
  };
}

function checkSelfStatement(entry) {
  const text = entry.character.profile?.selfStatementZh;
  if (typeof text !== "string") {
    return [issue("error", "CM-RL-004", entry.source, "/profile/selfStatementZh", "缺少字符串自述句")];
  }
  const length = Array.from(text).length;
  return length <= 30
    ? []
    : [issue("error", "CM-RL-004", entry.source, "/profile/selfStatementZh", `共 ${length} 字（含标点、空格），上限 30 字`)];
}

function checkYinYangGender(entries) {
  const order = rulesDocument.canonical.stemOrder;
  const byId = new Map();
  for (const entry of entries) {
    if (entry.character.kind === "heavenly-stem" && order.includes(entry.character.id) && !byId.has(entry.character.id)) {
      byId.set(entry.character.id, entry);
    }
  }
  if (byId.size !== order.length) return [];
  const yang = order.map((id) => byId.get(id)).filter((entry) => rulesDocument.canonical.stems[entry.character.id].polarity === "阳");
  const yin = order.map((id) => byId.get(id)).filter((entry) => rulesDocument.canonical.stems[entry.character.id].polarity === "阴");
  const gender = (entry) => entry.character.visualLock?.presentation?.genderPresentation;
  const direct = yang.every((entry) => gender(entry) === "masculine") && yin.every((entry) => gender(entry) === "feminine");
  const inverse = yang.every((entry) => gender(entry) === "feminine") && yin.every((entry) => gender(entry) === "masculine");
  if (!direct && !inverse) return [];
  const pattern = direct ? "五阳全部 masculine、五阴全部 feminine" : "五阳全部 feminine、五阴全部 masculine";
  return [issue(
    "error",
    "CM-RL-005",
    "<complete-cast>",
    "/visualLock/presentation/genderPresentation",
    `完整十干群像形成机械二分：${pattern}；阴阳不得驱动视觉性别`
  )];
}

async function checkClassicCitations(entry) {
  const citations = entry.character.classics;
  if (!Array.isArray(citations)) {
    return [issue("error", "CM-RL-006", entry.source, "/classics", "classics 必须是结构化引文数组")];
  }
  const issues = [];
  for (let index = 0; index < citations.length; index += 1) {
    const citation = citations[index];
    const basePointer = `/classics/${index}`;
    if (!isObject(citation)) {
      issues.push(issue("error", "CM-RL-006", entry.source, basePointer, "引文必须是对象"));
      continue;
    }
    const { bookId, chapterId, quoteOrig, deepLink } = citation;
    if (typeof bookId !== "string" || !referenceData.registryBooks.has(bookId)) {
      issues.push(issue("error", "CM-RL-006", entry.source, `${basePointer}/bookId`, `${jsonValue(bookId)} 未在 registry.json books[].id 命中`));
      continue;
    }
    const registryBook = referenceData.registryBooks.get(bookId);
    if (registryBook.hasTextData !== true) {
      issues.push(issue("error", "CM-RL-006", entry.source, `${basePointer}/bookId`, `${bookId} 在 registry 中未标记 hasTextData=true`));
    }
    let textDocument;
    try {
      textDocument = await loadBookDocument(bookId, "text");
    } catch (error) {
      issues.push(issue("error", "CM-RL-006", entry.source, `${basePointer}/bookId`, `无法读取 texts/${bookId}.json：${error.message}`));
      continue;
    }
    if (textDocument.id !== bookId) {
      issues.push(issue("error", "CM-RL-006", entry.source, `${basePointer}/bookId`, `texts 文件内 id=${jsonValue(textDocument.id)}，应为 ${jsonValue(bookId)}`));
    }
    const chapter = Array.isArray(textDocument.chapters)
      ? textDocument.chapters.find((candidate) => candidate.id === chapterId)
      : null;
    if (!chapter) {
      issues.push(issue("error", "CM-RL-006", entry.source, `${basePointer}/chapterId`, `${jsonValue(chapterId)} 未在 texts/${bookId}.json chapters[].id 命中`));
    } else {
      const corpus = Array.isArray(chapter.fragments)
        ? chapter.fragments.map((fragment) => fragment?.text).filter((text) => typeof text === "string").join("")
        : "";
      if (typeof quoteOrig !== "string" || quoteOrig.length === 0 || !corpus.includes(quoteOrig)) {
        issues.push(issue(
          "error",
          "CM-RL-006",
          entry.source,
          `${basePointer}/quoteOrig`,
          `未在 texts/${bookId}.json#${chapterId} 逐字命中（不做繁简、标点、空白或 Unicode 归一化）`
        ));
      }
    }
    const expectedLink = `https://dao.leonardchow.work/dian/#/read/${bookId}/${chapterId}`;
    if (deepLink !== expectedLink) {
      issues.push(issue("error", "CM-RL-006", entry.source, `${basePointer}/deepLink`, `实际 ${jsonValue(deepLink)}，规范深链为 ${jsonValue(expectedLink)}`));
    }
    if (citation.annotatedSentenceIds !== undefined) {
      issues.push(...await checkAnnotatedRefs(entry.source, basePointer, citation));
    }
  }
  return issues;
}

async function checkAnnotatedRefs(source, basePointer, citation) {
  const issues = [];
  if (!Array.isArray(citation.annotatedSentenceIds)) {
    return [issue("error", "CM-RL-006", source, `${basePointer}/annotatedSentenceIds`, "必须是句号数组")];
  }
  let annotated;
  try {
    annotated = await loadBookDocument(citation.bookId, "annotated");
  } catch (error) {
    return [issue("error", "CM-RL-006", source, `${basePointer}/annotatedSentenceIds`, `声明了逐句定位，但无法读取 annotated/${citation.bookId}.json` )];
  }
  const chapter = annotated.chapters?.find((candidate) => candidate.id === citation.chapterId);
  if (!chapter) {
    return [issue("error", "CM-RL-006", source, `${basePointer}/annotatedSentenceIds`, `annotated 中不存在 chapterId=${citation.chapterId}`)];
  }
  const selected = [];
  for (const sentenceId of citation.annotatedSentenceIds) {
    const sentence = chapter.sentences?.find((candidate) => candidate.i === sentenceId);
    if (!sentence) {
      issues.push(issue("error", "CM-RL-006", source, `${basePointer}/annotatedSentenceIds`, `annotated 中不存在句号 i=${sentenceId}`));
    } else {
      selected.push(sentence.orig);
    }
  }
  if (selected.length > 0 && !selected.join("").includes(citation.quoteOrig)) {
    issues.push(issue("error", "CM-RL-006", source, `${basePointer}/annotatedSentenceIds`, "所列逐句 orig 未覆盖 quoteOrig"));
  }
  return issues;
}

async function loadBookDocument(bookId, kind) {
  if (!/^[a-z][a-z0-9._-]*$/.test(bookId)) throw new Error("非法 bookId");
  const cache = kind === "text" ? referenceData.textCache : referenceData.annotatedCache;
  if (cache.has(bookId)) return cache.get(bookId);
  const directory = kind === "text" ? sourcePaths.textsDir : sourcePaths.annotatedDir;
  const document = await readJson(path.join(directory, `${bookId}.json`));
  cache.set(bookId, document);
  return document;
}

function checkExclusiveHighlight(entry) {
  const { character, source } = entry;
  const actions = rulesDocument.canonical.exclusiveHighlightActions;
  const issues = [];
  const key = character.canon?.signatureActionKey;
  if (actions[key] && actions[key].ownerId !== character.id) {
    issues.push(issue(
      "error",
      "CM-RL-007",
      source,
      "/canon/signatureActionKey",
      `${jsonValue(key)}（${actions[key].verbZh}）专属 ${actions[key].ownerId}，当前角色 ${character.id} 越界`
    ));
  }
  const highlight = character.canon?.irreplaceableHighlightZh;
  if (typeof highlight !== "string") return issues;
  for (const [actionKey, action] of Object.entries(actions)) {
    if (action.ownerId === character.id) continue;
    let scanText = highlight;
    for (const explicit of action.explicitNonMatches ?? []) {
      scanText = scanText.replaceAll(explicit, "");
    }
    for (const pattern of action.reviewPatterns) {
      const match = new RegExp(pattern, "u").exec(scanText);
      if (match) {
        issues.push(issue(
          "review",
          "CM-RL-007",
          source,
          "/canon/irreplaceableHighlightZh",
          `疑似使用 ${action.ownerId} 专属动作 ${jsonValue(actionKey)}（${action.verbZh}），命中 ${jsonValue(match[0])}；限高光字段，需人工复核`
        ));
        break;
      }
    }
  }
  return issues;
}

async function runFixtureSelfTests() {
  const files = (await readdir(FIXTURES_DIR))
    .filter((name) => name.endsWith(".fixture.json"))
    .sort();
  const result = { total: files.length, passed: 0, failures: [] };
  for (const fileName of files) {
    const fixturePath = path.join(FIXTURES_DIR, fileName);
    try {
      const fixture = await readJson(fixturePath);
      const entries = await materializeFixture(fixture, fixturePath);
      const fixtureIssues = await lintEntries(entries, {
        onlyRules: fixture.onlyRules,
        includeStructure: false
      });
      const expectedOutcome = fixture.expectedOutcome ?? "fail";
      let passed;
      let mismatch = "";
      if (expectedOutcome === "pass") {
        passed = fixtureIssues.length === 0;
        if (!passed) mismatch = `预期无问题，实际 ${fixtureIssues.length} 条`;
      } else {
        const expectations = Array.isArray(fixture.expect) ? fixture.expect : [];
        const unmatched = expectations.filter((expected) => !fixtureIssues.some((actual) => issueMatches(actual, expected)));
        passed = fixtureIssues.length > 0 && unmatched.length === 0;
        if (!passed) mismatch = `未命中预期：${unmatched.map((item) => `${item.ruleId}:${item.messageIncludes ?? "*"}`).join(", ") || "没有产生问题"}`;
      }
      if (passed) {
        result.passed += 1;
        console.log(`${expectedOutcome === "pass" ? "EXPECTED PASS" : "EXPECTED FAIL"}  ${fileName} — ${fixture.description}`);
        for (const found of fixtureIssues) printIssue(found, "  ");
      } else {
        result.failures.push({ fileName, mismatch });
        console.log(`SELFTEST FAIL  ${fileName} — ${mismatch}`);
        for (const found of fixtureIssues) printIssue(found, "  ");
      }
    } catch (error) {
      result.failures.push({ fileName, mismatch: error.message });
      console.log(`SELFTEST ERROR ${fileName} — ${error.message}`);
    }
  }
  return result;
}

async function materializeFixture(fixture, fixturePath) {
  if (fixture.$fixture !== "sinan/redline-fixture@1") {
    throw new Error("$fixture 必须为 sinan/redline-fixture@1");
  }
  let characters;
  if (typeof fixture.base === "string") {
    const basePath = path.resolve(path.dirname(fixturePath), fixture.base);
    const baseDocument = await readJson(basePath);
    characters = Array.isArray(baseDocument)
      ? structuredClone(baseDocument)
      : isObject(baseDocument) && Array.isArray(baseDocument.characters)
        ? structuredClone(baseDocument.characters)
        : [structuredClone(baseDocument)];
  } else if (Array.isArray(fixture.characters)) {
    characters = structuredClone(fixture.characters);
  } else {
    throw new Error("fixture 必须提供 base 或 characters[]");
  }
  for (const mutation of fixture.mutations ?? []) {
    const target = mutation.characterId
      ? characters.find((character) => character.id === mutation.characterId)
      : characters[mutation.characterIndex ?? 0];
    if (!target) throw new Error(`mutation 找不到目标：${jsonValue(mutation.characterId ?? mutation.characterIndex)}`);
    applyMutation(target, mutation);
  }
  return characters.map((character, index) => ({
    character,
    source: `${path.basename(fixturePath)}#characters[${index}]`
  }));
}

function applyMutation(target, mutation) {
  if (typeof mutation.path !== "string" || !mutation.path.startsWith("/")) {
    throw new Error("mutation.path 必须是 JSON Pointer");
  }
  const parts = mutation.path.slice(1).split("/").map(unescapePointer);
  const property = parts.pop();
  let parent = target;
  for (const part of parts) {
    if (!isObject(parent) && !Array.isArray(parent)) throw new Error(`mutation 路径不存在：${mutation.path}`);
    parent = parent[part];
  }
  if (mutation.op === "delete") {
    if (Array.isArray(parent)) parent.splice(Number(property), 1);
    else delete parent[property];
  } else {
    parent[property] = structuredClone(mutation.value);
  }
}

function issueMatches(actual, expected) {
  return (!expected.ruleId || actual.ruleId === expected.ruleId)
    && (!expected.severity || actual.severity === expected.severity)
    && (!expected.messageIncludes || actual.message.includes(expected.messageIncludes));
}

function issue(severity, ruleId, source, pointer, message) {
  return { severity, ruleId, source, pointer, message };
}

function printIssues(issues) {
  for (const found of issues) printIssue(found);
}

function printIssue(found, prefix = "") {
  console.log(`${prefix}${found.severity.toUpperCase()} [${found.ruleId}] ${found.source}${found.pointer} — ${found.message}`);
}

function getByPointer(value, pointer) {
  if (pointer === "") return value;
  return pointer.slice(1).split("/").map(unescapePointer).reduce((current, part) => current?.[part], value);
}

function unescapePointer(value) {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function arraysEqual(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function isCharacter(value) {
  return isObject(value) && (value.schemaVersion === "sinan/character@2" || (typeof value.id === "string" && typeof value.kind === "string"));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonValue(value) {
  return JSON.stringify(value);
}

function displayPath(filePath) {
  const relative = path.relative(process.cwd(), filePath);
  return relative.startsWith("..") ? filePath : relative || ".";
}

async function readJson(filePath) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`无法读取 ${filePath}：${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON 解析失败 ${filePath}：${error.message}`);
  }
}
