import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const mlApi = {
    // ─── Model Catalog ──────────────────────────────────
    getModels: async () => {
        const { data } = await api.get('/ml/models');
        return data;
    },
    dropModel: async (modelName: string) => {
        const { data } = await api.delete(`/ml/model/${encodeURIComponent(modelName)}`);
        return data;
    },

    // ─── Link Prediction ────────────────────────────────
    trainLinkPrediction: async (folderId: string, pipelineName: string, modelName: string) => {
        const { data } = await api.post('/ml/link-prediction/train', null, {
            params: { folder_id: folderId, pipeline_name: pipelineName, model_name: modelName },
        });
        return data;
    },
    predictLinks: async (folderId: string, modelName: string, threshold = 0.5, topN = 50) => {
        const { data } = await api.get('/ml/link-prediction/predict', {
            params: { folder_id: folderId, model_name: modelName, threshold, top_n: topN },
        });
        return data;
    },

    // ─── Node Classification ────────────────────────────
    trainNodeClassification: async (pipelineName: string, modelName: string) => {
        const { data } = await api.post('/ml/node-classification/train', null, {
            params: { pipeline_name: pipelineName, model_name: modelName },
        });
        return data;
    },
    predictNodeClasses: async (modelName: string, topN = 100) => {
        const { data } = await api.get('/ml/node-classification/predict', {
            params: { model_name: modelName, top_n: topN },
        });
        return data;
    },

    // ─── Node Embeddings ────────────────────────────────
    generateEmbeddings: async (folderId: string, method: 'fastRP' | 'node2vec' = 'fastRP', dim = 128) => {
        const { data } = await api.get('/ml/embeddings/generate', {
            params: { folder_id: folderId, method, dim, top_k: 200 },
        });
        return data;
    },

    // ─── Node Similarity ────────────────────────────────
    nodeSimilarity: async (folderId: string, topK = 10, cutoff = 0.1) => {
        const { data } = await api.get('/ml/node-similarity', {
            params: { folder_id: folderId, top_k: topK, cutoff },
        });
        return data;
    },
};
