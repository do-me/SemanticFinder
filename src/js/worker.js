import { pipeline, AutoTokenizer } from '@xenova/transformers';

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

// summary model
let summary_generator;
//let summary_tokenizer;


let chatModel = 'Xenova/LaMini-Flan-T5-783M';

async function token_to_text(beams){
    //let chatTokenizer = await AutoTokenizer.from_pretrained(chatModel);
    let decoded_text =  chat_tokenizer.decode(beams[0].output_token_ids, {
        skip_special_tokens: true
    });
    console.log(decoded_text);
    return decoded_text
}


/**
 * @param {string} text
 * @returns {Promise<EmbeddingVector>}
 */
async function embed(text) {
    if (text in embeddingsDict) {
        return embeddingsDict[text];
    }
    const e0 = await embedder(text, { pooling: 'mean', normalize: true });
    embeddingsDict[text] = e0.data;
    return e0.data;
}

async function getTokens(text) {
    return await tokenizer(text).input_ids.data;
}

async function chat(text,max_new_tokens=100) {
    const thisChat = await chat_generator(text, {
        max_new_tokens: max_new_tokens,
        return_prompt: false,
        callback_function: async function (beams) {
            //console.log(beams);
            const decodedText = token_to_text(beams)
            console.log(decodedText);
        }
    });
    return thisChat
}

async function summary(text,max_new_tokens=100) {
    let thisSummary = await summary_generator(text, {
        max_new_tokens: max_new_tokens,
    })
    return thisSummary
}

self.onmessage = async (event) => {
    const message = event.data;
    let text;
    let embedding;
    switch (message.type) {
        case 'load':
            embeddingsDict = {}; // clear dict
            tokenizer = await AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick
            embedder = await pipeline('feature-extraction', message.model_name,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'download',
                            data
                        });
                    }
                });
            break;
        case 'load_summary':
            summary_generator = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6',
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'summary_download',
                            data
                        });
                    }
                });
            break;
        case 'load_chat':
            console.log("loading chat")
            chat_generator = await pipeline('text2text-generation', chatModel,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'chat_download',
                            data
                        });
                    }
                });
            chat_tokenizer = await AutoTokenizer.from_pretrained(chatModel) // no progress callbacks -- assume its quick
            break;
        case 'query':
            text = message.text;
            embedding = await embed(text);
            self.postMessage({
                type: 'query',
                embedding
            });
            break;
        case 'similarity':
            text = message.text;
            embedding = await embed(text);
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
