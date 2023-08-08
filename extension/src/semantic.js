// Define caching parameters
import {CustomCache} from "./cache.js";
import { pipeline, env } from '@xenova/transformers';

env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = new CustomCache('transformers-cache');
env.allowLocalModels = false;


// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

let embeddingsDict = {};


class EmbedPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance() {
        if (this.instance === null) { // no await?
            this.instance = await pipeline(this.task, this.model,
                {
                    progress_callback: data => {
                        // console.log('progress_callback triggered', data);
                        chrome.runtime.sendMessage({type: "download", data: data});

                    }
                }
            );
        }
        chrome.runtime.sendMessage({type: "download", data: {status: "done"}})

        return this.instance;
    }
}

export async function load() {
    await EmbedPipeline.getInstance();
}

async function embed(text) {
    if (text in embeddingsDict) {
        return embeddingsDict[text];
    }

    let embedder = await EmbedPipeline.getInstance();

    let e0 = await embedder(text, { pooling: 'mean', normalize: true });
    embeddingsDict[text] = e0["data"];
    return e0["data"];
}


export async function similarity(text1, text2) {
    let e0 = await embed(text1);
    let e1 = await embed(text2);
    return cosineSimilarity(e0, e1);
}

function cosineSimilarity(v1, v2) {
    if (v1.length !== v2.length) { return -1; }
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
