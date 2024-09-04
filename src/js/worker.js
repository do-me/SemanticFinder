import { pipeline, AutoTokenizer } from '@huggingface/transformers';
import pako from 'pako';
import init, { tSNE } from "wasm-bhtsne";
import { marked } from 'marked';

init();
// env.useBrowserCache = false; // for testing

/**
 * @type {Object<string, EmbeddingVector>}
 */
let embeddingsDict = {};

/**
 * @type {Pipeline}
 */
// embedding models
let embedder;
let tokenizer;

// chat model
let chat_generator;
let chat_tokenizer;
let chat_model_name;

// summary model
let summary_generator;
let summary_tokenizer;

let queryEmbedding;
let currentNullVector = [];

function minimalEightCharHash(str) {
    let hash = 5381;

    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }

    // Convert to 8-character hexadecimal string
    const hexHash = (hash >>> 0).toString(16);
    return hexHash.slice(0, 8).padStart(8, '0');
}

function minimalRandomEightCharHash() {
    const characters = '0123456789abcdef';
    let hash = '';

    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        hash += characters[randomIndex];
    }

    return hash;
}


async function token_to_text(beams, tokenizer_type) {
    //let chatTokenizer = await AutoTokenizer.from_pretrained(chatModel);
    let decoded_text = tokenizer_type.decode(beams[0].output_token_ids, {
        skip_special_tokens: true
    });
    //console.log(decoded_text);
    return decoded_text
}

/**
 * @param {string} text
 * @returns {Promise<EmbeddingVector>}
 */
async function embed(text, embedNewText=true) {
        if (text in embeddingsDict) {
            return embeddingsDict[text];
        }

        if (embedNewText==false){
            if (currentNullVector != []){
                embeddingsDict[text] = currentNullVector;
                return currentNullVector
            }
            else {
                const tempVec = await embedder("test", { pooling: 'mean', normalize: true });
                currentNullVector = [...tempVec.data].fill(0.00001);
                embeddingsDict[text] = currentNullVector;
                return currentNullVector
            }
        }

        const e0 = await embedder(text, { pooling: 'mean', normalize: true });

        const roundDecimalsDown = (num) => parseFloat(num.toFixed(3));

        embeddingsDict[text] = e0.data.map(roundDecimalsDown);
        //console.log(embeddingsDict)
        return e0.data;

}

async function getTokens(text) {
    return await tokenizer(text).input_ids.data;
}

async function chat(text, max_new_tokens = 100) {
    return new Promise(async (resolve, reject) => {
        // hier Weiche einbauen für Qwen da tokenizer anders
        console.log(chat_model_name, max_new_tokens);

        if (chat_model_name.includes("Qwen")) {
            try {

                // Define the prompt and list of messages
                const messages = [
                    { "role": "system", "content": "You are a helpful assistant." },
                    { "role": "user", "content": text }
                ]

                const generatorText = chat_generator.tokenizer.apply_chat_template(messages, {
                    tokenize: false,
                    add_generation_prompt: false,
                });

                const thisChat = await chat_generator(generatorText, {
                    max_new_tokens: max_new_tokens,
                    do_sample: false,
                    callback_function: async function (beams) {
                        //const decodedText = await token_to_text(beams, chat_generator.tokenizer);
                        let decodedText = chat_generator.tokenizer.decode(beams[0].output_token_ids, { skip_special_tokens: false })

                        decodedText = decodedText.split("<|im_start|>")[3].replace("<|im_end|>","") // just return the model's output
                        decodedText = marked(decodedText)

                        self.postMessage({
                            type: 'chat',
                            chat_text: decodedText
                        });

                        resolve(decodedText); // Resolve the main promise with chat text
                    },
                });
            } catch (error) {
                reject(error);
            }
        }

        else {
            try {
                const thisChat = await chat_generator(text, {
                    max_new_tokens: max_new_tokens,
                    return_prompt: false,
                    callback_function: async function (beams) {
                        const decodedText = await token_to_text(beams, chat_tokenizer);
                        //console.log(decodedText);

                        self.postMessage({
                            type: 'chat',
                            chat_text: decodedText,
                        });

                        resolve(decodedText); // Resolve the main promise with chat text
                    },
                });
            } catch (error) {
                reject(error);
            }
        }
    });
}

async function summary(text, max_new_tokens = 100) {
    return new Promise(async (resolve, reject) => {
        try {
            const thisSummary = await summary_generator(text, {
                max_new_tokens: max_new_tokens,
                return_prompt: false,
                callback_function: async function (beams) {
                    const decodedText = await token_to_text(beams, summary_tokenizer);
                    //console.log(beams)

                    self.postMessage({
                        type: 'summary',
                        summary_text: decodedText,
                    });

                    resolve(decodedText); // Resolve the main promise with chat text
                },
            });
        } catch (error) {
            reject(error);
        }
    });
}

// tested, trivial calculation takes 200ms for 100k embeddings of size 384 or 700 ms with size 1000
const calculateAverageEmbedding = (embeddingsAsArray) => {
    const allEmbeddings = Object.values(embeddingsAsArray);

    if (allEmbeddings.length === 0) {
        return null; // handle the case when the input object is empty
    }

    const sumEmbeddings = allEmbeddings.reduce((acc, embedding) => {
        return acc.map((value, index) => value + embedding[index]);
    }, new Array(allEmbeddings[0].length).fill(0));

    const averageEmbedding = sumEmbeddings.map(value => value / allEmbeddings.length);

    return averageEmbedding;
};

/* 
const calculateAverageEmbedding = (embeddingsAsArray) => {
  const allEmbeddings = Object.values(embeddingsAsArray);

  if (allEmbeddings.length === 0) {
    return null; // handle the case when the input object is empty
  }

  const start = performance.now();

  const sumEmbeddings = allEmbeddings.reduce((acc, embedding) => {
    return acc.map((value, index) => value + embedding[index]);
  }, new Array(allEmbeddings[0].length).fill(0));

  const averageEmbedding = sumEmbeddings.map(value => value / allEmbeddings.length);

  const end = performance.now();
  console.log('Execution time:', end - start, 'milliseconds');

  return averageEmbedding;
};

// Generate random embeddings for testing
const generateRandomEmbedding = (size) => {
  return Array.from({ length: size }, () => Math.random());
};

// Generate test data with 10,000 strings and embeddings of size 1000
const generateTestEmbeddings = (numStrings, embeddingSize) => {
  const testData = {};
  for (let i = 1; i <= numStrings; i++) {
    const key = `string${i}`;
    const embedding = generateRandomEmbedding(embeddingSize);
    testData[key] = embedding;
  }
  return testData;
};

// Test the calculateAverageEmbedding function with generated data
const testEmbeddingsAsArray = generateTestEmbeddings(100000, 1000);
const averageEmbedding = calculateAverageEmbedding(testEmbeddingsAsArray);

console.log('Average Embedding:', averageEmbedding);
*/

function convert_to_underscores(inputString) {
    // Replace spaces with underscores
    var stringWithUnderscores = lowercaseString.replace(/\s/g, '_');

    return stringWithUnderscores;
}
function createRandomMatrix(rows, columns) {
    return Array.from({ length: rows }, () =>
        Array.from({ length: columns }, () => Math.random())
    );
}
// Function to update embeddingsDict
const updateEmbeddingsDict = (newData) => {
    embeddingsDict = newData;
    postMessage({ type: 'updateEmbeddingsDict', data: embeddingsDict });
};

function convertFloat32ArraysToArrays(arrayOfFloat32Arrays) {
    return arrayOfFloat32Arrays.reduce((accumulator, currentFloat32Array) => {
        // Convert Float32Array to a regular JavaScript array using Array.from
        const jsArray = Array.from(currentFloat32Array);

        // Add the converted array to the accumulator
        accumulator.push(jsArray);

        return accumulator;
    }, []);
}

function calculateCosineSimilarity(embedding) {
    let dotProduct = 0;
    let queryMagnitude = 0;
    let embeddingMagnitude = 0;
    const queryEmbeddingLength = queryEmbedding.length;

    for (let i = 0; i < queryEmbeddingLength; i++) {
        dotProduct += queryEmbedding[i] * embedding[i];
        queryMagnitude += queryEmbedding[i] ** 2;
        embeddingMagnitude += embedding[i] ** 2;
    }

    return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude));
}

// Expose a function to manually update embeddingsDict
self.updateEmbeddingsDictManually = updateEmbeddingsDict;

self.onmessage = async (event) => {
    const message = event.data;
    //console.log(message)
    let roundDecimals;
    let embeddingsAsArray;
    let exportDict;
    let gzippedData;
    let text;
    let embedding;

    // Other cases in your existing switch statement
    switch (message.type) {
        case 'logEmbeddingsDict':
            console.log(embeddingsDict);
            break
        case 'tsne':
            const start = performance.now();
            const valuesFloat32Array = Array.from(Object.values(embeddingsDict));
            let valuesArray = convertFloat32ArraysToArrays(valuesFloat32Array);
            const valuesArrayLength = valuesArray.length;
            //console.log(valuesArrayLength);
            // Check if the length is below 61 to set perplexity to a different value, needs slight refactoring to 
            // get rid of this workaround

            let compressed_vectors;
            if (valuesArrayLength < 61) {
                const vectorLength = valuesArray[0].length; // Assuming all vectors have the same length
                const vectorsToAdd = 61 - valuesArrayLength;

                console.log("added: ", vectorsToAdd)
                // Add random vectors to the array
                for (let i = 0; i < vectorsToAdd; i++) {
                    const randomVector = Array.from({ length: vectorLength }, () => Math.random());
                    valuesArray.push(randomVector);
                }

                const tsne_encoder = new tSNE(valuesArray);
                compressed_vectors = tsne_encoder.barnes_hut(message.data.iterations).slice(0, valuesArrayLength);//,theta=0.1);
            }
            else {
                const tsne_encoder = new tSNE(valuesArray);
                compressed_vectors = tsne_encoder.barnes_hut(message.data.iterations);

            }

            //console.log("Compressed Vectors:", compressed_vectors);
            const end = performance.now();
            console.log('BHtSNE Execution time:', Math.round(end - start), 'ms');

            //text = message.text;
            //embedding = await embed(text);

            const originalKeys = Object.keys(embeddingsDict);
            const originalEmbeddings = Object.values(embeddingsDict)

            // Assuming compressed_vectors is now an array of arrays
            let plotDataArray = [];

            for (let i = 0; i < originalKeys.length; i++) {
                let thisVec = compressed_vectors[i];
                let similarity = calculateCosineSimilarity(originalEmbeddings[i]);

                if (similarity >= message.data.dimensionalityReductionSimilarityThreshold) {
                    plotDataArray.push({ "x": thisVec[0], "y": thisVec[1], "label": originalKeys[i], "similarity": similarity });
                }
            }

            console.log(plotDataArray)

            // Now reconstructedDict will have the original format
            //console.log(plotDataArray);

            //loadScatterplot(plotDataArray);

            self.postMessage({
                type: 'tsne',
                plotDataArray
            });
            break

        case 'importEmbeddingsDict':
            embeddingsDict = message.data;
            break
        case 'exportEmbeddingsDict':
            roundDecimals = (num) => parseFloat(num.toFixed(parseInt(message.data.meta.exportDecimals)));

            embeddingsAsArray = Object.fromEntries(
                Object.entries(embeddingsDict).map(([key, values]) => [key, Object.values(values).map(roundDecimals)])
            );

            const meanEmbedding = calculateAverageEmbedding(embeddingsAsArray)
            // adding mean embedding so all indexed docs on HF could be ingested in a "proper" vector DB!
            exportDict = {
                "meta": message.data.meta, "text": message.data.text,
                "index": embeddingsAsArray,
                "mean_embedding": meanEmbedding
            }

            exportDict.meta.chunks = Object.keys(embeddingsAsArray).length;

            console.log("Document average embedding", meanEmbedding);
            console.log("Metadata", exportDict.meta);

            gzippedData = pako.gzip(JSON.stringify(exportDict), { to: 'string' });

            const tempFilename = `${message.data.meta.textTitle.replace(/\s/g, '_')}_${minimalRandomEightCharHash()}.json.gz`
            // Send the gzipped data as a response
            self.postMessage({ type: 'embeddingsDict', data: gzippedData, filename: tempFilename });
            break;

        case 'load':
            embeddingsDict = {}; // clear dict
            tokenizer = await AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick
            embedder = await pipeline('feature-extraction', message.model_name,
                {
                    quantized: message.quantized,
                    device: "webgpu",
                    dtype: "fp32",
                    progress_callback: data => {
                        self.postMessage({
                            type: 'download',
                            data
                        });
                    }

                });
            break;
        case 'load_summary':
            summary_tokenizer = await AutoTokenizer.from_pretrained(message.model_name)
            summary_generator = await pipeline('summarization', message.model_name,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'summary_download',
                            data
                        });
                    }
                    //quantized: message.quantized // currently not possible, models unquantized way too large!
                });
            break;
        case 'load_text2text-generation':
            console.log("loading chat");
            chat_model_name = message.model_name;
            chat_tokenizer = await AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick
            chat_generator = await pipeline('text2text-generation', message.model_name,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'chat_download',
                            data
                        });
                    }
                    //quantized: message.quantized // currently not possible, models unquantized way too large!
                });
            break;
        case 'load_text-generation':
            console.log("loading chat");
            chat_model_name = message.model_name;
            chat_tokenizer = await AutoTokenizer.from_pretrained(message.model_name) // no progress callbacks -- assume its quick
            chat_generator = await pipeline('text-generation', message.model_name,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'chat_download',
                            data
                        });
                    }
                    //quantized: message.quantized // currently not possible, models unquantized way too large!
                });
            console.log("chat loaded");
            break;
        case 'query':
            text = message.text;
            embedding = await embed(text);
            queryEmbedding = embedding;
            currentNullVector = [...Object.values(embeddingsDict)[0]].fill(0.00001);
            self.postMessage({
                type: 'query',
                embedding
            });
            break;
        case 'similarity':
            text = message.text;
            embedding = await embed(text, message.inferencingActive);
            self.postMessage({
                type: 'similarity',
                text,
                embedding
            });
            break;
        case 'getTokens':
            text = message.text;
            self.postMessage({
                type: 'tokens',
                text,
                tokens: await getTokens(text)
            });
            break;
        case 'summary':
            text = message.text;
            let summary_text = await summary(text, message.max_new_tokens);
            self.postMessage({
                type: 'summary',
                summary_text
            });
            break;
        case 'chat':
            text = message.text;
            let chat_text = await chat(text, message.max_new_tokens);
            self.postMessage({
                type: 'chat',
                chat_text
            });
            break;

        default:
    }
};
