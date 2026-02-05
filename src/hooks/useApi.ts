/**
 * React Query Hooks
 * 
 * Custom hooks for data fetching with React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import type { GraphNode, GraphLink } from '@/store/graphStore';

// === Types ===

interface FolderData {
    id: string;
    name: string;
    description?: string;
    file_count: number;
    node_count: number;
    created_at: string;
    updated_at: string;
}

interface FileData {
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    status: 'pending' | 'processing' | 'ready_for_review' | 'completed' | 'failed';
    node_count: number;
    relationship_count: number;
    created_at: string;
    processed_at?: string;
    error_message?: string;
}

interface UploadResponse {
    file_id: string;
    filename: string;
    folder_id: string;
    status: string;
    message: string;
}


interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
    relationships?: GraphLink[]; // Alias for links (backend compatibility)
    total_nodes?: number;
    total_links?: number;
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
        queryFn: () => api.get<FolderData[]>(endpoints.folders.list),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useFolder(folderId: string) {
    return useQuery({
        queryKey: ['folder', folderId],
        queryFn: () => api.get<FolderData>(endpoints.folders.get(folderId)),
        enabled: !!folderId,
    });
}

export function useCreateFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            api.post<FolderData>(endpoints.folders.create, data),
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
        onMutate: async (folderId) => {
            // Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['folders'] });

            // Snapshot the previous value
            const previousFolders = queryClient.getQueryData<FolderData[]>(['folders']);

            // Optimistically update to the new value
            queryClient.setQueryData<FolderData[]>(['folders'], (old) =>
                old ? old.filter((folder) => folder.id !== folderId) : []
            );

            // Return a context object with the snapshotted value
            return { previousFolders };
        },
        onError: (err, newTodo, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousFolders) {
                queryClient.setQueryData(['folders'], context.previousFolders);
            }
        },
        onSettled: () => {
            // Always refetch after error or success to ensure we're in sync
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

export function useUpdateFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ folderId, data }: { folderId: string; data: { name?: string; description?: string } }) =>
            api.put(endpoints.folders.update(folderId), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

export function useShareFolder() {
    return useMutation({
        mutationFn: ({ folderId, userEmail, permission }: { folderId: string; userEmail: string; permission: string }) =>
            api.post(`/folders/${folderId}/permissions`, { user_email: userEmail, permission }),
    });
}

// === File Hooks ===

export function useFiles(folderId: string) {
    return useQuery({
        queryKey: ['files', folderId],
        queryFn: () => api.get<FileData[]>(endpoints.files.list(folderId)),
        enabled: !!folderId,
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useFileStatus(fileId: string) {
    return useQuery({
        queryKey: ['file-status', fileId],
        queryFn: () => api.get<FileData>(endpoints.files.status(fileId)),
        enabled: !!fileId,
        refetchInterval: (query) => {
            // Poll until processing is complete
            const data = query.state.data;
            if (data?.status === 'processing') return 2000;
            return false;
        },
    });
}

export function useUploadFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ folderId, file }: { folderId: string; file: Blob }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder_id', folderId);
            return api.upload<UploadResponse>(endpoints.files.upload, formData);
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

export function useNodeExpansion() {
    return useMutation({
        mutationFn: ({ nodeId, depth = 1 }: { nodeId: string; depth?: number }) =>
            api.get<GraphData>(endpoints.graph.expand(nodeId), { depth }),
    });
}

export function useShortestPath() {
    return useMutation({
        mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
            api.get<{ path_exists: boolean; node_ids: string[]; link_ids: string[]; length: number }>(
                endpoints.graph.path(sourceId, targetId)
            ),
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
