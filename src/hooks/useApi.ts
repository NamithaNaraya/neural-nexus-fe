/**
 * React Query Hooks
 * 
 * Custom hooks for data fetching with React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { GraphNode, GraphLink } from '@/store/graphStore';

// === Types ===

interface Folder {
    id: string;
    name: string;
    description?: string;
    fileCount: number;
    nodeCount: number;
    createdAt: string;
    updatedAt: string;
}

interface File {
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    status: 'pending' | 'processing' | 'ready_for_review' | 'completed' | 'failed';
    nodeCount: number;
    relationshipCount: number;
    createdAt: string;
    processedAt?: string;
    errorMessage?: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

interface QueryResponse {
    answer: string;
    citations: Array<{
        nodeId: string;
        nodeName: string;
        relevance: number;
    }>;
    followUpQuestions?: string[];
}

// === Folder Hooks ===

export function useFolders() {
    return useQuery({
        queryKey: ['folders'],
        queryFn: () => api.get<Folder[]>(endpoints.folders.list),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useFolder(folderId: string) {
    return useQuery({
        queryKey: ['folder', folderId],
        queryFn: () => api.get<Folder>(endpoints.folders.get(folderId)),
        enabled: !!folderId,
    });
}

export function useCreateFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            api.post<Folder>(endpoints.folders.create, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

export function useDeleteFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (folderId: string) =>
            api.delete(endpoints.folders.delete(folderId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

// === File Hooks ===

export function useFiles(folderId: string) {
    return useQuery({
        queryKey: ['files', folderId],
        queryFn: () => api.get<File[]>(endpoints.files.list(folderId)),
        enabled: !!folderId,
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useFileStatus(fileId: string) {
    return useQuery({
        queryKey: ['file-status', fileId],
        queryFn: () => api.get<File>(endpoints.files.status(fileId)),
        enabled: !!fileId,
        refetchInterval: (data) => {
            // Poll until processing is complete
            if (data?.status === 'processing') return 2000;
            return false;
        },
    });
}

export function useUploadFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ folderId, file }: { folderId: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder_id', folderId);
            return api.upload<{ fileId: string }>(endpoints.files.upload, formData);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['files', variables.folderId] });
        },
    });
}

// === Graph Hooks ===

export function useFolderGraph(folderId: string) {
    return useQuery({
        queryKey: ['graph', 'folder', folderId],
        queryFn: () => api.get<GraphData>(endpoints.graph.folder(folderId)),
        enabled: !!folderId,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

export function useFileGraph(fileId: string) {
    return useQuery({
        queryKey: ['graph', 'file', fileId],
        queryFn: () => api.get<GraphData>(endpoints.graph.file(fileId)),
        enabled: !!fileId,
        staleTime: 1000 * 60 * 2,
    });
}

export function useGraphSearch(query: string, folderId?: string) {
    return useQuery({
        queryKey: ['graph', 'search', query, folderId],
        queryFn: () => api.get<GraphNode[]>(endpoints.graph.search, {
            q: query,
            ...(folderId && { folder_id: folderId }),
        }),
        enabled: query.length >= 2,
        staleTime: 1000 * 30, // 30 seconds
    });
}

// === Query Hooks ===

export function useAskQuestion() {
    return useMutation({
        mutationFn: (data: { question: string; scope?: { type: string; nodeIds?: string[] } }) =>
            api.post<QueryResponse>(endpoints.query.ask, data),
    });
}

// === Analytics Hooks ===

export function useCentrality(algorithm: string, folderId: string) {
    return useQuery({
        queryKey: ['analytics', 'centrality', algorithm, folderId],
        queryFn: () => api.get(endpoints.analytics.centrality(algorithm), {
            folder_id: folderId,
        }),
        enabled: !!folderId,
    });
}

export function useCommunity(algorithm: string, folderId: string) {
    return useQuery({
        queryKey: ['analytics', 'community', algorithm, folderId],
        queryFn: () => api.get(endpoints.analytics.community(algorithm), {
            folder_id: folderId,
        }),
        enabled: !!folderId,
    });
}

// === Health Hook ===

export function useHealthCheck() {
    return useQuery({
        queryKey: ['health'],
        queryFn: () => api.get(endpoints.health.detailed),
        refetchInterval: 30000, // Every 30 seconds
    });
}
