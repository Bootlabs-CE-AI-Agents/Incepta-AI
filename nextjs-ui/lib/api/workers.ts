import { apiClient } from './client';

export type WorkerStatusEnum = 'active' | 'idle' | 'unresponsive';

export interface WorkerStatus {
    hostname: string;
    status: WorkerStatusEnum;
    uptime_seconds: number;
    active_tasks: number;
    completed_tasks: number;
    cpu_percent: number;
    memory_percent: number;
    throughput_per_minute: number;
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
