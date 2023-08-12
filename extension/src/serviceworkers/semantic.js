// Define caching parameters
import {CustomCache} from "../utils/cache.js";
import {pipeline, env} from '@xenova/transformers';
import {prettyLog} from "../utils/utils.js";

env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = new CustomCache('transformers-cache');
env.allowLocalModels = false;


// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

// these should go in EmbedPipeline prob
let embeddingsDict = {};
let currID = "";

class EmbedPipeline {
    static task = 'feature-extraction';
    static model = 'Supabase/gte-small';
    static instance = null;

    static async getInstance() {
        if (this.instance === null) { // no await?
            this.instance = await pipeline(this.task, this.model,
                {
                    progress_callback: async data => {
                        await chrome.runtime.sendMessage({type: "download", data: data});
                    }
                }
            );
        }
        await chrome.runtime.sendMessage({type: "download", data: {status: "complete"}})

        return this.instance;
    }
}

// Important: Return true to indicate that the response is asynchronous.
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    switch (request.type) {
        case "load":
            await load();
            break;
        case "clearLocalStorage":
            chrome.storage.local.clear(() => {
            });
            break;
        case "pruneEmbeddings":
            await pruneStoredEmbeddings(10);
            break;
    }
});


async function load() {
    await EmbedPipeline.getInstance();
}

async function embed(text, use_dict = true) {
    if (use_dict && text in embeddingsDict) {
        return embeddingsDict[text];
    }

    let embedder = await EmbedPipeline.getInstance();
    let e0 = await embedder(text, {pooling: 'mean', normalize: true});
    if (use_dict) {
        embeddingsDict[text] = e0["data"];
    }
    return e0["data"];
}


// do on clean-up / unmount
async function pruneStoredEmbeddings(k) {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, function (allData) {
            let embeddingKeys = Object.keys(allData).filter(key => allData[key].is_embeddings === true);

            console.log("All embedding keys found:", embeddingKeys);  // This logs all the embedding keys

            // Sort these embedding keys based on frecency scores
            let sortedKeys = embeddingKeys.sort((a, b) => allData[b].frecency_score - allData[a].frecency_score);

            let topKKeys = sortedKeys.slice(0, k);
            let keysToRemove = sortedKeys.filter(key => !topKKeys.includes(key));
            console.log(`Removing the following keys: ${keysToRemove}`);

            // Remove the non-top k embeddings from storage.
            if (keysToRemove.length > 0) {
                chrome.storage.local.remove(keysToRemove, () => {
                    console.log(`Successfully removed ${keysToRemove.length} keys.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}



export async function storeEmbeddings() {
    const buffer = new TextEncoder().encode(JSON.stringify(embeddingsDict));

    const body = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e.target.error);
        reader.readAsDataURL(new Blob([buffer], {type: 'application/json'}));
    });

    try {
        await chrome.storage.local.set({
            [currID]: {
                _body: body,
                frecency_score: computeFrecencyScore(currID),
                is_embeddings: true
            }
        });
        prettyLog("stored " + currID, Object.keys(embeddingsDict).length + " items");

    } catch (err) {
        console.warn('An error occurred while writing the embeddings to cache:', err)
    }
}

async function verifyLoad() {
    for (let text in embeddingsDict) {
        let e0 = await embed(text, true);
        let e1 = await embed(text, false);
        let sim = cosineSimilarity(e0, e1);
        if (sim <  0.99) {
            prettyLog("load differs", sim, "red");
        }
    }
}

export async function loadEmbeddings(ID) {
    if (Object.keys(embeddingsDict).length !== 0 && ID === currID) {
        return;
    }
    currID = ID;
    const data = await chrome.storage.local.get([currID]);
    if (data[ID] && data[ID].is_embeddings) {
        prettyLog("attempting load", ID);
        const body = data[ID]._body;

        const jsonString = await new Promise((resolve, reject) => {
            const byteCharacters = atob(body.split(',')[1]);
            const byteNumbers = Array.from(byteCharacters).map(char => char.charCodeAt(0));
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/json'});
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(blob);
        });

        const parsedData = JSON.parse(jsonString);

        // Convert the object-with-integer-keys representation into Float32Array
        for (let textKey in parsedData) {
            if (parsedData.hasOwnProperty(textKey)) {
                let arrayData = Object.values(parsedData[textKey]);
                embeddingsDict[textKey] = new Float32Array(arrayData);
            }
        }

        prettyLog("loaded " + ID, Object.keys(embeddingsDict).length + " items");
        // await verifyLoad();
    }
}


// todo: implement & move to utils
function computeFrecencyScore(ID) {
    return 4; // lol!
}


export async function similarity(text1, text2) {
    let e0 = await embed(text1);
    let e1 = await embed(text2);

    return cosineSimilarity(e0, e1);
}

function cosineSimilarity(v1, v2) {
    if (v1.length !== v2.length) {
        return -1;
    }
    let dotProduct = 0;
    let v1_mag = 0;
    let v2_mag = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
        v1_mag += v1[i] ** 2;
        v2_mag += v2[i] ** 2;
    }
    return dotProduct / (Math.sqrt(v1_mag) * Math.sqrt(v2_mag));
}
