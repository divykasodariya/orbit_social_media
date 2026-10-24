const STOP_WORDS = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
]);

/**
 * 1. Lowercase
 * 2. Remove punctuation
 * 3. Tokenize
 * 4. Remove stop words
 */
export const preprocessText = (text) => {
    if (!text) return [];
    
    return text
        .toLowerCase()
        // Replace punctuation with spaces
        .replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_`~()]/g, ' ')
        // Remove extra spaces
        .replace(/\\s{2,}/g, ' ')
        .split(' ')
        .map(word => word.trim())
        .filter(word => word.length > 0 && !STOP_WORDS.has(word));
};

/**
 * Calculate Term Frequencies for a single document
 */
export const calculateTF = (tokens) => {
    const tf = {};
    const totalTokens = tokens.length;
    
    if (totalTokens === 0) return tf;

    tokens.forEach(token => {
        tf[token] = (tf[token] || 0) + 1;
    });

    for (let token in tf) {
        tf[token] = tf[token] / totalTokens;
    }

    return tf;
};

/**
 * Calculate Inverse Document Frequencies for a corpus
 * @param {Array<Array<string>>} corpus - Array of tokenized documents
 */
export const calculateIDF = (corpus) => {
    const idf = {};
    const totalDocs = corpus.length;

    if (totalDocs === 0) return idf;

    // Set of unique words across entire corpus
    const uniqueWords = new Set();
    corpus.forEach(tokens => {
        tokens.forEach(token => uniqueWords.add(token));
    });

    for (let word of uniqueWords) {
        // Count how many documents contain this word
        let docsWithWord = 0;
        corpus.forEach(tokens => {
            if (tokens.includes(word)) docsWithWord++;
        });

        // IDF = log(Total Docs / Docs containing word)
        // Adding 1 to avoid division by zero and smooth the values
        idf[word] = Math.log10((totalDocs) / (docsWithWord + 1)) + 1;
    }

    return idf;
};

/**
 * Compute the TF-IDF vector for a document based on global IDF
 */
export const calculateTFIDF = (tf, idf) => {
    const tfidf = {};
    for (let word in tf) {
        if (idf[word]) {
            tfidf[word] = tf[word] * idf[word];
        }
    }
    return tfidf;
};

/**
 * Calculate Cosine Similarity between two TF-IDF vectors.
 * A · B / (||A|| ||B||)
 */
export const cosineSimilarity = (vectorA, vectorB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allWords = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

    for (let word of allWords) {
        const valA = vectorA[word] || 0;
        const valB = vectorB[word] || 0;

        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
