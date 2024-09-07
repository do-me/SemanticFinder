/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/js/worker.js":
/*!**************************!*\
  !*** ./src/js/worker.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @huggingface/transformers */ \"./node_modules/@huggingface/transformers/dist/transformers.js\");\n/* harmony import */ var pako__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! pako */ \"./node_modules/pako/dist/pako.esm.mjs\");\n/* harmony import */ var wasm_bhtsne__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! wasm-bhtsne */ \"./node_modules/wasm-bhtsne/wasm_bhtsne.js\");\n/* harmony import */ var marked__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! marked */ \"./node_modules/marked/lib/marked.esm.js\");\n\n\n\n\n\n(0,wasm_bhtsne__WEBPACK_IMPORTED_MODULE_3__[\"default\"])();\n// env.useBrowserCache = false; // for testing\n\n/**\n * @type {Object<string, EmbeddingVector>}\n */\nlet embeddingsDict = {};\n\n/**\n * @type {Pipeline}\n */\n// embedding models\nlet embedder;\nlet tokenizer;\n\n// chat model\nlet chat_generator;\nlet chat_tokenizer;\nlet chat_model_name;\n\n// summary model\nlet summary_generator;\nlet summary_tokenizer;\n\nlet queryEmbedding;\nlet currentNullVector = [];\n\nfunction minimalEightCharHash(str) {\n    let hash = 5381;\n\n    for (let i = 0; i < str.length; i++) {\n        hash = (hash * 33) ^ str.charCodeAt(i);\n    }\n\n    // Convert to 8-character hexadecimal string\n    const hexHash = (hash >>> 0).toString(16);\n    return hexHash.slice(0, 8).padStart(8, '0');\n}\n\nfunction minimalRandomEightCharHash() {\n    const characters = '0123456789abcdef';\n    let hash = '';\n\n    for (let i = 0; i < 8; i++) {\n        const randomIndex = Math.floor(Math.random() * characters.length);\n        hash += characters[randomIndex];\n    }\n\n    return hash;\n}\n\n\nasync function token_to_text(beams, tokenizer_type) {\n    //let chatTokenizer = await AutoTokenizer.from_pretrained(chatModel);\n    let decoded_text = tokenizer_type.decode(beams[0].output_token_ids, {\n        skip_special_tokens: true\n    });\n    //console.log(decoded_text);\n    return decoded_text\n}\n\n/**\n * @param {string} text\n * @returns {Promise<EmbeddingVector>}\n */\nasync function embed(text, embedNewText=true) {\n        if (text in embeddingsDict) {\n            return embeddingsDict[text];\n        }\n\n        if (embedNewText==false){\n            if (currentNullVector != []){\n                embeddingsDict[text] = currentNullVector;\n                return currentNullVector\n            }\n            else {\n                const tempVec = await embedder(\"test\", { pooling: 'mean', normalize: true });\n                currentNullVector = [...tempVec.data].fill(0.00001);\n                embeddingsDict[text] = currentNullVector;\n                return currentNullVector\n            }\n        }\n\n        const e0 = await embedder(text, { pooling: 'mean', normalize: true });\n\n        const roundDecimalsDown = (num) => parseFloat(num.toFixed(3));\n\n        embeddingsDict[text] = e0.data.map(roundDecimalsDown);\n        //console.log(embeddingsDict)\n        return e0.data;\n\n}\n\nasync function getTokens(text) {\n    return await tokenizer(text).input_ids.data;\n}\n\nasync function chat(text, max_new_tokens = 100) {\n    return new Promise(async (resolve, reject) => {\n        // hier Weiche einbauen für Qwen da tokenizer anders\n        console.log(chat_model_name, max_new_tokens);\n\n        if (chat_model_name.includes(\"Qwen\")) {\n            try {\n\n                // Define the prompt and list of messages\n                const messages = [\n                    { \"role\": \"system\", \"content\": \"You are a helpful assistant.\" },\n                    { \"role\": \"user\", \"content\": text }\n                ]\n\n                const generatorText = chat_generator.tokenizer.apply_chat_template(messages, {\n                    tokenize: false,\n                    add_generation_prompt: false,\n                });\n\n                const thisChat = await chat_generator(generatorText, {\n                    max_new_tokens: max_new_tokens,\n                    do_sample: false,\n                    callback_function: async function (beams) {\n                        //const decodedText = await token_to_text(beams, chat_generator.tokenizer);\n                        let decodedText = chat_generator.tokenizer.decode(beams[0].output_token_ids, { skip_special_tokens: false })\n\n                        decodedText = decodedText.split(\"<|im_start|>\")[3].replace(\"<|im_end|>\",\"\") // just return the model's output\n                        decodedText = (0,marked__WEBPACK_IMPORTED_MODULE_2__.marked)(decodedText)\n\n                        self.postMessage({\n                            type: 'chat',\n                            chat_text: decodedText\n                        });\n\n                        resolve(decodedText); // Resolve the main promise with chat text\n                    },\n                });\n            } catch (error) {\n                reject(error);\n            }\n        }\n\n        else {\n            try {\n                const thisChat = await chat_generator(text, {\n                    max_new_tokens: max_new_tokens,\n                    return_prompt: false,\n                    callback_function: async function (beams) {\n                        const decodedText = await token_to_text(beams, chat_tokenizer);\n                        //console.log(decodedText);\n\n                        self.postMessage({\n                            type: 'chat',\n                            chat_text: decodedText,\n                        });\n\n                        resolve(decodedText); // Resolve the main promise with chat text\n                    },\n                });\n            } catch (error) {\n                reject(error);\n            }\n        }\n    });\n}\n\nasync function summary(text, max_new_tokens = 100) {\n    return new Promise(async (resolve, reject) => {\n        try {\n            const thisSummary = await summary_generator(text, {\n                max_new_tokens: max_new_tokens,\n                return_prompt: false,\n                callback_function: async function (beams) {\n                    const decodedText = await token_to_text(beams, summary_tokenizer);\n                    //console.log(beams)\n\n                    self.postMessage({\n                        type: 'summary',\n                        summary_text: decodedText,\n                    });\n\n                    resolve(decodedText); // Resolve the main promise with chat text\n                },\n            });\n        } catch (error) {\n            reject(error);\n        }\n    });\n}\n\n// tested, trivial calculation takes 200ms for 100k embeddings of size 384 or 700 ms with size 1000\nconst calculateAverageEmbedding = (embeddingsAsArray) => {\n    const allEmbeddings = Object.values(embeddingsAsArray);\n\n    if (allEmbeddings.length === 0) {\n        return null; // handle the case when the input object is empty\n    }\n\n    const sumEmbeddings = allEmbeddings.reduce((acc, embedding) => {\n        return acc.map((value, index) => value + embedding[index]);\n    }, new Array(allEmbeddings[0].length).fill(0));\n\n    const averageEmbedding = sumEmbeddings.map(value => value / allEmbeddings.length);\n\n    return averageEmbedding;\n};\n\n/* \nconst calculateAverageEmbedding = (embeddingsAsArray) => {\n  const allEmbeddings = Object.values(embeddingsAsArray);\n\n  if (allEmbeddings.length === 0) {\n    return null; // handle the case when the input object is empty\n  }\n\n  const start = performance.now();\n\n  const sumEmbeddings = allEmbeddings.reduce((acc, embedding) => {\n    return acc.map((value, index) => value + embedding[index]);\n  }, new Array(allEmbeddings[0].length).fill(0));\n\n  const averageEmbedding = sumEmbeddings.map(value => value / allEmbeddings.length);\n\n  const end = performance.now();\n  console.log('Execution time:', end - start, 'milliseconds');\n\n  return averageEmbedding;\n};\n\n// Generate random embeddings for testing\nconst generateRandomEmbedding = (size) => {\n  return Array.from({ length: size }, () => Math.random());\n};\n\n// Generate test data with 10,000 strings and embeddings of size 1000\nconst generateTestEmbeddings = (numStrings, embeddingSize) => {\n  const testData = {};\n  for (let i = 1; i <= numStrings; i++) {\n    const key = `string${i}`;\n    const embedding = generateRandomEmbedding(embeddingSize);\n    testData[key] = embedding;\n  }\n  return testData;\n};\n\n// Test the calculateAverageEmbedding function with generated data\nconst testEmbeddingsAsArray = generateTestEmbeddings(100000, 1000);\nconst averageEmbedding = calculateAverageEmbedding(testEmbeddingsAsArray);\n\nconsole.log('Average Embedding:', averageEmbedding);\n*/\n\nfunction convert_to_underscores(inputString) {\n    // Replace spaces with underscores\n    var stringWithUnderscores = lowercaseString.replace(/\\s/g, '_');\n\n    return stringWithUnderscores;\n}\nfunction createRandomMatrix(rows, columns) {\n    return Array.from({ length: rows }, () =>\n        Array.from({ length: columns }, () => Math.random())\n    );\n}\n// Function to update embeddingsDict\nconst updateEmbeddingsDict = (newData) => {\n    embeddingsDict = newData;\n    postMessage({ type: 'updateEmbeddingsDict', data: embeddingsDict });\n};\n\nfunction convertFloat32ArraysToArrays(arrayOfFloat32Arrays) {\n    return arrayOfFloat32Arrays.reduce((accumulator, currentFloat32Array) => {\n        // Convert Float32Array to a regular JavaScript array using Array.from\n        const jsArray = Array.from(currentFloat32Array);\n\n        // Add the converted array to the accumulator\n        accumulator.push(jsArray);\n\n        return accumulator;\n    }, []);\n}\n\nfunction calculateCosineSimilarity(embedding) {\n    let dotProduct = 0;\n    let queryMagnitude = 0;\n    let embeddingMagnitude = 0;\n    const queryEmbeddingLength = queryEmbedding.length;\n\n    for (let i = 0; i < queryEmbeddingLength; i++) {\n        dotProduct += queryEmbedding[i] * embedding[i];\n        queryMagnitude += queryEmbedding[i] ** 2;\n        embeddingMagnitude += embedding[i] ** 2;\n    }\n\n    return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude));\n}\n\n// Expose a function to manually update embeddingsDict\nself.updateEmbeddingsDictManually = updateEmbeddingsDict;\n\nself.onmessage = async (event) => {\n    const message = event.data;\n    //console.log(message)\n    let roundDecimals;\n    let embeddingsAsArray;\n    let exportDict;\n    let gzippedData;\n    let text;\n    let embedding;\n\n    // Other cases in your existing switch statement\n    switch (message.type) {\n        case 'logEmbeddingsDict':\n            console.log(embeddingsDict);\n            break\n        case 'tsne':\n            const start = performance.now();\n            const valuesFloat32Array = Array.from(Object.values(embeddingsDict));\n            let valuesArray = convertFloat32ArraysToArrays(valuesFloat32Array);\n            const valuesArrayLength = valuesArray.length;\n            //console.log(valuesArrayLength);\n            // Check if the length is below 61 to set perplexity to a different value, needs slight refactoring to \n            // get rid of this workaround\n\n            let compressed_vectors;\n            if (valuesArrayLength < 61) {\n                const vectorLength = valuesArray[0].length; // Assuming all vectors have the same length\n                const vectorsToAdd = 61 - valuesArrayLength;\n\n                console.log(\"added: \", vectorsToAdd)\n                // Add random vectors to the array\n                for (let i = 0; i < vectorsToAdd; i++) {\n                    const randomVector = Array.from({ length: vectorLength }, () => Math.random());\n                    valuesArray.push(randomVector);\n                }\n\n                const tsne_encoder = new wasm_bhtsne__WEBPACK_IMPORTED_MODULE_3__.tSNE(valuesArray);\n                compressed_vectors = tsne_encoder.barnes_hut(message.data.iterations).slice(0, valuesArrayLength);//,theta=0.1);\n            }\n            else {\n                const tsne_encoder = new wasm_bhtsne__WEBPACK_IMPORTED_MODULE_3__.tSNE(valuesArray);\n                compressed_vectors = tsne_encoder.barnes_hut(message.data.iterations);\n\n            }\n\n            //console.log(\"Compressed Vectors:\", compressed_vectors);\n            const end = performance.now();\n            console.log('BHtSNE Execution time:', Math.round(end - start), 'ms');\n\n            //text = message.text;\n            //embedding = await embed(text);\n\n            const originalKeys = Object.keys(embeddingsDict);\n            const originalEmbeddings = Object.values(embeddingsDict)\n\n            // Assuming compressed_vectors is now an array of arrays\n            let plotDataArray = [];\n\n            for (let i = 0; i < originalKeys.length; i++) {\n                let thisVec = compressed_vectors[i];\n                let similarity = calculateCosineSimilarity(originalEmbeddings[i]);\n\n                if (similarity >= message.data.dimensionalityReductionSimilarityThreshold) {\n                    plotDataArray.push({ \"x\": thisVec[0], \"y\": thisVec[1], \"label\": originalKeys[i], \"similarity\": similarity });\n                }\n            }\n\n            console.log(plotDataArray)\n\n            // Now reconstructedDict will have the original format\n            //console.log(plotDataArray);\n\n            //loadScatterplot(plotDataArray);\n\n            self.postMessage({\n                type: 'tsne',\n                plotDataArray\n            });\n            break\n\n        case 'importEmbeddingsDict':\n            embeddingsDict = message.data;\n            break\n        case 'exportEmbeddingsDict':\n            roundDecimals = (num) => parseFloat(num.toFixed(parseInt(message.data.meta.exportDecimals)));\n\n            embeddingsAsArray = Object.fromEntries(\n                Object.entries(embeddingsDict).map(([key, values]) => [key, Object.values(values).map(roundDecimals)])\n            );\n\n            const meanEmbedding = calculateAverageEmbedding(embeddingsAsArray)\n            // adding mean embedding so all indexed docs on HF could be ingested in a \"proper\" vector DB!\n            exportDict = {\n                \"meta\": message.data.meta, \"text\": message.data.text,\n                \"index\": embeddingsAsArray,\n                \"mean_embedding\": meanEmbedding\n            }\n\n            exportDict.meta.chunks = Object.keys(embeddingsAsArray).length;\n\n            console.log(\"Document average embedding\", meanEmbedding);\n            console.log(\"Metadata\", exportDict.meta);\n\n            gzippedData = pako__WEBPACK_IMPORTED_MODULE_1__[\"default\"].gzip(JSON.stringify(exportDict), { to: 'string' });\n\n            const tempFilename = `${message.data.meta.textTitle.replace(/\\s/g, '_')}_${minimalRandomEightCharHash()}.json.gz`\n            // Send the gzipped data as a response\n            self.postMessage({ type: 'embeddingsDict', data: gzippedData, filename: tempFilename });\n            break;\n\n        case 'load':\n            embeddingsDict = {}; // clear dict\n            tokenizer = await _huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick\n            embedder = await (0,_huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.pipeline)('feature-extraction', message.model_name,\n                {\n                    quantized: message.quantized,\n                    device: \"webgpu\",\n                    dtype: \"fp32\",\n                    progress_callback: data => {\n                        self.postMessage({\n                            type: 'download',\n                            data\n                        });\n                    }\n\n                });\n            break;\n        case 'load_summary':\n            summary_tokenizer = await _huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.AutoTokenizer.from_pretrained(message.model_name)\n            summary_generator = await (0,_huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.pipeline)('summarization', message.model_name,\n                {\n                    progress_callback: data => {\n                        self.postMessage({\n                            type: 'summary_download',\n                            data\n                        });\n                    }\n                    //quantized: message.quantized // currently not possible, models unquantized way too large!\n                });\n            break;\n        case 'load_text2text-generation':\n            console.log(\"loading chat\");\n            chat_model_name = message.model_name;\n            chat_tokenizer = await _huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick\n            chat_generator = await (0,_huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.pipeline)('text2text-generation', message.model_name,\n                {\n                    progress_callback: data => {\n                        self.postMessage({\n                            type: 'chat_download',\n                            data\n                        });\n                    }\n                    //quantized: message.quantized // currently not possible, models unquantized way too large!\n                });\n            break;\n        case 'load_text-generation':\n            console.log(\"loading chat\");\n            chat_model_name = message.model_name;\n            chat_tokenizer = await _huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.AutoTokenizer.from_pretrained(message.model_name) // no progress callbacks -- assume its quick\n            chat_generator = await (0,_huggingface_transformers__WEBPACK_IMPORTED_MODULE_0__.pipeline)('text-generation', message.model_name,\n                {\n                    progress_callback: data => {\n                        self.postMessage({\n                            type: 'chat_download',\n                            data\n                        });\n                    }\n                    //quantized: message.quantized // currently not possible, models unquantized way too large!\n                });\n            console.log(\"chat loaded\");\n            break;\n        case 'query':\n            text = message.text;\n            embedding = await embed(text);\n            queryEmbedding = embedding;\n            currentNullVector = [...Object.values(embeddingsDict)[0]].fill(0.00001);\n            self.postMessage({\n                type: 'query',\n                embedding\n            });\n            break;\n        case 'similarity':\n            text = message.text;\n            embedding = await embed(text, message.inferencingActive);\n            self.postMessage({\n                type: 'similarity',\n                text,\n                embedding\n            });\n            break;\n        case 'getTokens':\n            text = message.text;\n            self.postMessage({\n                type: 'tokens',\n                text,\n                tokens: await getTokens(text)\n            });\n            break;\n        case 'summary':\n            text = message.text;\n            let summary_text = await summary(text, message.max_new_tokens);\n            self.postMessage({\n                type: 'summary',\n                summary_text\n            });\n            break;\n        case 'chat':\n            text = message.text;\n            let chat_text = await chat(text, message.max_new_tokens);\n            self.postMessage({\n                type: 'chat',\n                chat_text\n            });\n            break;\n\n        default:\n    }\n};\n\n\n//# sourceURL=webpack://semanticfinder/./src/js/worker.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_wasm-bhtsne_wasm_bhtsne_js-node_modules_huggingface_transformers_dist_tr-22136a"], () => (__webpack_require__("./src/js/worker.js")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = self.location + "";
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			"src_js_worker_js": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunksemanticfinder"] = self["webpackChunksemanticfinder"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			return __webpack_require__.e("vendors-node_modules_wasm-bhtsne_wasm_bhtsne_js-node_modules_huggingface_transformers_dist_tr-22136a").then(next);
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	
/******/ })()
;