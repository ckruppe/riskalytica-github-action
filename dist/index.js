import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ var __webpack_modules__ = ({

/***/ 454:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {


// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  D: () => (/* binding */ OrtCompressor)
});

;// CONCATENATED MODULE: external "zlib"
const external_zlib_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("zlib");
var external_zlib_default = /*#__PURE__*/__nccwpck_require__.n(external_zlib_namespaceObject);
;// CONCATENATED MODULE: ./node_modules/ortcompressor/dist/esm/_virtual/_rollupPluginBabelHelpers.js
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}


//# sourceMappingURL=_rollupPluginBabelHelpers.js.map

;// CONCATENATED MODULE: ./node_modules/ortcompressor/dist/esm/BinaryWriter.js


class BinaryWriter {
  constructor() {
    _defineProperty(this, "parts", []);
  }
  writeRaw(buffer) {
    this.parts.push(buffer);
  }
  writeUint16(value) {
    this.parts.push(Buffer.from(Uint16Array.of(value).buffer));
  }
  writeString(value) {
    const encoded = Buffer.from(value, 'utf-8');
    this.writeUint16(encoded.length);
    this.writeRaw(encoded);
  }
  toBuffer() {
    return Buffer.concat(this.parts);
  }
}


//# sourceMappingURL=BinaryWriter.js.map

;// CONCATENATED MODULE: ./node_modules/ortcompressor/dist/esm/stringUtils.js
const EMOJI_PATTERN = /[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2580-\u27BF]|\uD83E[\uDD10-\uDDFF]/gu;
const normalizeString = value => value ?? '';
const tokenize = value => {
  const normalized = normalizeString(value);
  const stripped = normalized.replace(EMOJI_PATTERN, '');
  return stripped.split(/\s+/u).filter(Boolean);
};


//# sourceMappingURL=stringUtils.js.map

;// CONCATENATED MODULE: ./node_modules/ortcompressor/dist/esm/StringTable.js



class StringTable {
  constructor(entries) {
    _defineProperty(this, "indexMap", void 0);
    _defineProperty(this, "entries", void 0);
    this.entries = entries;
    this.indexMap = new Map(entries.map((value, index) => [value, index]));
  }
  get length() {
    return this.entries.length;
  }
  static fromAnalyzerResult(result) {
    const collector = new Set();
    StringTable.collectProjectStrings(collector, result.projects);
    StringTable.collectPackageStrings(collector, result.packages);
    StringTable.collectIssueStrings(collector, result.issues ?? {});
    StringTable.collectGraphStrings(collector, result.dependency_graphs);
    const entries = Array.from(collector).filter(Boolean);
    return new StringTable(entries);
  }
  static collectProjectStrings(collector, projects) {
    for (const project of projects) {
      collector.add(project.id);
      for (const scope of project.scope_names) {
        collector.add(scope);
      }
    }
  }
  static collectPackageStrings(collector, packages) {
    for (const pkg of packages) {
      collector.add(pkg.id);
      collector.add(normalizeString(pkg.homepage_url));
      collector.add(normalizeString(pkg.declared_licenses_processed?.spdx_expression));
      for (const token of tokenize(pkg.description)) {
        collector.add(token);
      }
    }
  }
  static collectIssueStrings(collector, issues) {
    for (const [project, subIssues] of Object.entries(issues ?? {})) {
      collector.add(project);
      for (const issue of subIssues) {
        for (const token of tokenize(issue.message)) {
          collector.add(token);
        }
      }
    }
  }
  static collectGraphStrings(collector, graphs) {
    for (const [tool, graph] of Object.entries(graphs)) {
      collector.add(tool);
      if (graph.packages) {
        for (const pkg of graph.packages) {
          collector.add(pkg);
        }
      }
      if (graph.scopes) {
        for (const scope of Object.keys(graph.scopes)) {
          collector.add(scope);
        }
      }
    }
  }
  indexOf(value) {
    return this.indexMap.get(value) ?? 0;
  }
  getEntries() {
    return this.entries;
  }
}


//# sourceMappingURL=StringTable.js.map

;// CONCATENATED MODULE: ./node_modules/ortcompressor/dist/esm/OrtCompressor.js





const COMPRESSION_LEVEL = 9;
const FORMAT_MAGIC$1 = 'ORTP';
const FORMAT_VERSION = 3;
const NODE_FLAG_NONE$1 = 0;
const NODE_FLAG_PKG = 1;
const NODE_FLAG_FRAGMENT$1 = 2;
const EMPTY_COUNT = 0;
class OrtCompressor {
  static compress(input) {
    const {
      result
    } = input.analyzer;
    const stringTable = StringTable.fromAnalyzerResult(result);
    const writer = new BinaryWriter();
    OrtCompressor.writeHeader(writer, stringTable);
    OrtCompressor.writeProjects(writer, stringTable, result);
    OrtCompressor.writePackages(writer, stringTable, result);
    OrtCompressor.writeIssues(writer, stringTable, result);
    OrtCompressor.writeDependencyGraphs(writer, stringTable, result);
    writer.writeUint16(EMPTY_COUNT);
    return external_zlib_default().deflateSync(writer.toBuffer(), {
      level: COMPRESSION_LEVEL
    });
  }
  static writeHeader(writer, stringTable) {
    writer.writeRaw(Buffer.from(FORMAT_MAGIC$1));
    writer.writeRaw(Buffer.from([FORMAT_VERSION, 0x00]));
    writer.writeRaw(Buffer.from([0x00, 0x00]));
    writer.writeUint16(stringTable.length);
    for (const entry of stringTable.getEntries()) {
      writer.writeString(entry);
    }
  }
  static writeProjects(writer, stringTable, result) {
    writer.writeUint16(result.projects.length);
    for (const project of result.projects) {
      writer.writeUint16(stringTable.indexOf(project.id));
      writer.writeUint16(project.scope_names.length);
      for (const scope of project.scope_names) {
        writer.writeUint16(stringTable.indexOf(scope));
      }
    }
  }
  static writePackages(writer, stringTable, result) {
    writer.writeUint16(result.packages.length);
    for (const pkg of result.packages) {
      writer.writeUint16(stringTable.indexOf(pkg.id));
      writer.writeUint16(stringTable.indexOf(normalizeString(pkg.homepage_url)));
      writer.writeUint16(stringTable.indexOf(normalizeString(pkg.declared_licenses_processed?.spdx_expression)));
      const tokens = tokenize(pkg.description);
      writer.writeUint16(tokens.length);
      for (const token of tokens) {
        writer.writeUint16(stringTable.indexOf(token));
      }
    }
  }
  static writeIssues(writer, stringTable, result) {
    const issueEntries = Object.entries(result.issues ?? {});
    writer.writeUint16(issueEntries.length);
    for (const [project, subIssues] of issueEntries) {
      writer.writeUint16(stringTable.indexOf(project));
      writer.writeUint16(subIssues.length);
      for (const issue of subIssues) {
        const tokens = tokenize(issue.message);
        writer.writeUint16(tokens.length);
        for (const token of tokens) {
          writer.writeUint16(stringTable.indexOf(token));
        }
      }
    }
  }
  static writeDependencyGraphs(writer, stringTable, result) {
    const graphEntries = Object.entries(result.dependency_graphs);
    writer.writeUint16(graphEntries.length);
    for (const [tool, graph] of graphEntries) {
      writer.writeUint16(stringTable.indexOf(tool));
      if (graph.packages) {
        OrtCompressor.writePopulatedGraph(writer, stringTable, graph);
      } else {
        OrtCompressor.writeEmptyGraph(writer);
      }
    }
  }
  static writePopulatedGraph(writer, stringTable, graph) {
    const packages = graph.packages ?? [];
    const nodes = graph.nodes ?? [];
    const edges = graph.edges ?? [];
    const scopes = graph.scopes ?? {};
    writer.writeUint16(packages.length);
    for (const pkg of packages) {
      writer.writeUint16(stringTable.indexOf(pkg));
    }
    writer.writeUint16(nodes.length);
    for (const node of nodes) {
      OrtCompressor.writeNodeFlag(writer, node);
    }
    writer.writeUint16(edges.length);
    for (const edge of edges) {
      writer.writeUint16(edge.from);
      writer.writeUint16(edge.to);
    }
    const scopeEntries = Object.entries(scopes);
    writer.writeUint16(scopeEntries.length);
    for (const [scope, roots] of scopeEntries) {
      writer.writeUint16(stringTable.indexOf(scope));
      writer.writeUint16(roots.length);
      for (const root of roots) {
        OrtCompressor.writeScopeRootFlag(writer, root);
      }
    }
  }
  static writeEmptyGraph(writer) {
    writer.writeUint16(EMPTY_COUNT);
    writer.writeUint16(EMPTY_COUNT);
    writer.writeUint16(EMPTY_COUNT);
    writer.writeUint16(EMPTY_COUNT);
  }
  static writeNodeFlag(writer, node) {
    if (node.fragment !== undefined) {
      writer.writeUint16(NODE_FLAG_FRAGMENT$1);
      writer.writeUint16(node.fragment);
    } else if (node.pkg === undefined) {
      writer.writeUint16(NODE_FLAG_NONE$1);
    } else {
      writer.writeUint16(NODE_FLAG_PKG);
      writer.writeUint16(node.pkg);
    }
  }
  static writeScopeRootFlag(writer, root) {
    if (root.fragment !== undefined) {
      writer.writeUint16(NODE_FLAG_FRAGMENT$1);
      writer.writeUint16(root.fragment);
    } else if (root.root === undefined) {
      writer.writeUint16(NODE_FLAG_NONE$1);
    } else {
      writer.writeUint16(NODE_FLAG_PKG);
      writer.writeUint16(root.root);
    }
  }
}


//# sourceMappingURL=OrtCompressor.js.map


/***/ }),

/***/ 450:
/***/ ((module, __unused_webpack___webpack_exports__, __nccwpck_require__) => {

__nccwpck_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __nccwpck_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__nccwpck_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __nccwpck_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__nccwpck_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var ortcompressor__WEBPACK_IMPORTED_MODULE_2__ = __nccwpck_require__(454);



function fail(message, extra = '') {
    console.error(message);
    if (extra)
        console.error(extra);
    process.exit(1);
}
function readJsonFile(filePath) {
    try {
        return JSON.parse(node_fs__WEBPACK_IMPORTED_MODULE_0___default().readFileSync(filePath, 'utf8'));
    }
    catch (error) {
        fail(`Failed to read JSON file: ${filePath}`, String(error));
    }
}
function resolveHorusecConfig(projectRoot) {
    const candidates = [
        node_path__WEBPACK_IMPORTED_MODULE_1___default().join(projectRoot, 'horusec-config.json'),
        node_path__WEBPACK_IMPORTED_MODULE_1___default().join(projectRoot, '.horusec', 'config.json'),
    ];
    for (const candidate of candidates) {
        if (node_fs__WEBPACK_IMPORTED_MODULE_0___default().existsSync(candidate))
            return candidate;
    }
    return null;
}
function resolveProjectName(projectRoot, configPath) {
    const fallback = node_path__WEBPACK_IMPORTED_MODULE_1___default().basename(projectRoot);
    if (!configPath)
        return fallback;
    const config = readJsonFile(configPath);
    const projectName = config.horusecCliRepositoryName ?? fallback;
    return String(projectName).trim() || fallback;
}
function renderPrComment(projectName, violations) {
    const hasViolations = violations.length > 0;
    let body = '<!-- license-report-comment -->\n';
    body += '## License compliance report\n\n';
    body += `**Project:** ${projectName}  \n`;
    body += `**Violations:** ${violations.length}\n\n`;
    if (!hasViolations) {
        body += 'No unapproved licenses found.\n';
    }
    else {
        body += 'The following dependencies use licenses that are not approved:\n\n';
        body += '| Dependency | Version | License | Npm Link |\n';
        body += '|---|---:|---|---|\n';
        for (const item of violations) {
            body += `| ${item.name} | ${item.installedVersion} | ${item.licenseType} | (NPM)[${item.link}] |\n`;
        }
    }
    return body;
}
async function main() {
    const apiUri = process.env.API_URI;
    const apiToken = process.env.API_TOKEN;
    const analyzerResultPath = process.env.ORT_ANALYZER_RESULT_PATH;
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const githubOutput = process.env.GITHUB_OUTPUT;
    const runnerTemp = process.env.RUNNER_TEMP || '.';
    if (!apiUri)
        fail('Missing API_URI');
    if (!apiToken)
        fail('Missing API_TOKEN');
    if (!analyzerResultPath) {
        fail('Missing ORT_ANALYZER_RESULT_PATH');
    }
    if (!node_fs__WEBPACK_IMPORTED_MODULE_0___default().existsSync(analyzerResultPath)) {
        fail(`ORT analyzer result file not found: ${analyzerResultPath}`);
    }
    // ── Resolve project name from Horusec config ───────────────
    const horusecConfigPath = resolveHorusecConfig(projectRoot);
    const projectName = resolveProjectName(projectRoot, horusecConfigPath);
    console.log(`Resolved project name: ${projectName}`);
    if (horusecConfigPath) {
        console.log(`Using Horusec config: ${horusecConfigPath}`);
    }
    else {
        console.log('No Horusec config found, falling back to repo directory name');
    }
    // ── Compress analyzer result ────────────────────────────────
    const input = JSON.parse(node_fs__WEBPACK_IMPORTED_MODULE_0___default().readFileSync(analyzerResultPath, 'utf-8'));
    const gzipped = ortcompressor__WEBPACK_IMPORTED_MODULE_2__/* .OrtCompressor */ .D.compress(input);
    const body = new FormData();
    body.append('repositoryName', projectName);
    body.append('dependencies', new Blob([gzipped]), 'compressed.ortpack');
    // ── Upload to API ───────────────────────────────────────────
    const response = await fetch(`${apiUri}api/analysis/dependencies`, {
        method: 'POST',
        headers: {
            'x-horusec-authorization': apiToken,
        },
        body,
    });
    if (!response.ok && response.status !== 417) {
        fail(`Upload failed: ${response.status} ${response.statusText}`, response.status);
    }
    console.log('Upload succeeded');
    let violations = [];
    if (response.status === 417) {
        try {
            violations = (await response.json());
        }
        catch {
            console.log('API response is not JSON or has no violations array — skipping PR comment');
        }
    }
    const hasViolations = violations.length > 0;
    // ── Generate PR comment markdown ────────────────────────────
    const commentBody = renderPrComment(projectName, violations);
    const commentFile = node_path__WEBPACK_IMPORTED_MODULE_1___default().join(runnerTemp, 'license-report.md');
    node_fs__WEBPACK_IMPORTED_MODULE_0___default().writeFileSync(commentFile, commentBody);
    // ── Write step outputs ──────────────────────────────────────
    if (githubOutput) {
        node_fs__WEBPACK_IMPORTED_MODULE_0___default().appendFileSync(githubOutput, `project_name=${projectName}\n`);
        node_fs__WEBPACK_IMPORTED_MODULE_0___default().appendFileSync(githubOutput, `has_violations=${hasViolations}\n`);
        node_fs__WEBPACK_IMPORTED_MODULE_0___default().appendFileSync(githubOutput, `violation_count=${violations.length}\n`);
        node_fs__WEBPACK_IMPORTED_MODULE_0___default().appendFileSync(githubOutput, `comment_path=${commentFile}\n`);
    }
    if (hasViolations) {
        fail(`Found ${violations.length} license violations`);
    }
}
await main();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 24:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:fs");

/***/ }),

/***/ 760:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:path");

/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __nccwpck_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	var threw = true;
/******/ 	try {
/******/ 		__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 		threw = false;
/******/ 	} finally {
/******/ 		if(threw) delete __webpack_module_cache__[moduleId];
/******/ 	}
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/async module */
/******/ (() => {
/******/ 	var webpackQueues = typeof Symbol === "function" ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 	var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 	var webpackError = typeof Symbol === "function" ? Symbol("webpack error") : "__webpack_error__";
/******/ 	var resolveQueue = (queue) => {
/******/ 		if(queue && queue.d < 1) {
/******/ 			queue.d = 1;
/******/ 			queue.forEach((fn) => (fn.r--));
/******/ 			queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 		}
/******/ 	}
/******/ 	var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 		if(dep !== null && typeof dep === "object") {
/******/ 			if(dep[webpackQueues]) return dep;
/******/ 			if(dep.then) {
/******/ 				var queue = [];
/******/ 				queue.d = 0;
/******/ 				dep.then((r) => {
/******/ 					obj[webpackExports] = r;
/******/ 					resolveQueue(queue);
/******/ 				}, (e) => {
/******/ 					obj[webpackError] = e;
/******/ 					resolveQueue(queue);
/******/ 				});
/******/ 				var obj = {};
/******/ 				obj[webpackQueues] = (fn) => (fn(queue));
/******/ 				return obj;
/******/ 			}
/******/ 		}
/******/ 		var ret = {};
/******/ 		ret[webpackQueues] = x => {};
/******/ 		ret[webpackExports] = dep;
/******/ 		return ret;
/******/ 	}));
/******/ 	__nccwpck_require__.a = (module, body, hasAwait) => {
/******/ 		var queue;
/******/ 		hasAwait && ((queue = []).d = -1);
/******/ 		var depQueues = new Set();
/******/ 		var exports = module.exports;
/******/ 		var currentDeps;
/******/ 		var outerResolve;
/******/ 		var reject;
/******/ 		var promise = new Promise((resolve, rej) => {
/******/ 			reject = rej;
/******/ 			outerResolve = resolve;
/******/ 		});
/******/ 		promise[webpackExports] = exports;
/******/ 		promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 		module.exports = promise;
/******/ 		body((deps) => {
/******/ 			currentDeps = wrapDeps(deps);
/******/ 			var fn;
/******/ 			var getResult = () => (currentDeps.map((d) => {
/******/ 				if(d[webpackError]) throw d[webpackError];
/******/ 				return d[webpackExports];
/******/ 			}))
/******/ 			var promise = new Promise((resolve) => {
/******/ 				fn = () => (resolve(getResult));
/******/ 				fn.r = 0;
/******/ 				var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 				currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 			});
/******/ 			return fn.r ? promise : getResult();
/******/ 		}, (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue)));
/******/ 		queue && queue.d < 0 && (queue.d = 0);
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat get default export */
/******/ (() => {
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__nccwpck_require__.n = (module) => {
/******/ 		var getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__nccwpck_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__nccwpck_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
/******/ 
/******/ // startup
/******/ // Load entry module and return exports
/******/ // This entry module used 'module' so it can't be inlined
/******/ var __webpack_exports__ = __nccwpck_require__(450);
/******/ __webpack_exports__ = await __webpack_exports__;
/******/ 
