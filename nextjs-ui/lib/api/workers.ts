import { apiClient } from './client';

export interface WorkerStatus {
    hostname: string;
    status: 'active' | 'idle' | 'unresponsive';
    active_tasks_count: number;
    completed_tasks_count: number;
    concurrency: number;
    uptime: number;
    cpu_usage_percent: number;
    memory_usage_percent: number;
}

export interface WorkerLogsResponse {
    hostname: string;
    logs: string[];
}

export interface WorkerRestartResponse {
    success: boolean;
    message: string;
}

export const workersApi = {
    listWorkers: async (): Promise<WorkerStatus[]> => {
        const response = await apiClient.get<WorkerStatus[]>('/api/v1/workers');
        return response.data;
    },

    getWorkerLogs: async (hostname: string, lines: number = 100): Promise<WorkerLogsResponse> => {
        const response = await apiClient.get<WorkerLogsResponse>(`/api/v1/workers/${hostname}/logs`, {
            params: { lines },
        });
        return response.data;
    },

    restartWorker: async (hostname: string): Promise<WorkerRestartResponse> => {
        const response = await apiClient.post<WorkerRestartResponse>(`/api/v1/workers/${hostname}/restart`);
        return response.data;
    },
};
