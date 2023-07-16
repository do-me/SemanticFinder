import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';

/**
 * @type {PreTrainedTokenizer}
 */
let tokenizer;

export async function loadSemantic() {
    tokenizer = await AutoTokenizer.from_pretrained("Xenova/all-MiniLM-L6-v2");    
}

/**
 * @param {string} text 
 * @returns {Promise<Array<string>>}
 */
export async function getTokens(text) {
    return await tokenizer(text)["input_ids"]["data"];
}