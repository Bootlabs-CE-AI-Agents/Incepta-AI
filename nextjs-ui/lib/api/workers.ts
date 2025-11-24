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

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    task_id: string | null;
}

export interface WorkerLogsResponse {
    hostname: string;
    logs: LogEntry[];
}

export interface WorkerRestartResponse {
    success: boolean;
    message: string;
}

export interface ThroughputDataPoint {
    timestamp: string;
    tasks_completed: number;
    avg_task_duration_seconds: number;
}

export interface CurrentMetrics {
    cpu_percent: number;
    memory_percent: number;
    network_bytes_in: number;
    network_bytes_out: number;
}

// Story 21: CPU/Memory history data point for dual-axis chart
export interface CpuMemoryDataPoint {
    timestamp: string;
    percent: number;
}

// Story 21: Worker configuration details (AC-4)
export interface WorkerConfig {
    os_name: string;
    python_version: string;
    celery_version: string;
    queues: string[];
    max_tasks_per_child: number | null;
    concurrency: number;
    pool_type: string;
}

export interface WorkerMetrics {
    hostname: string;
    current_metrics: CurrentMetrics;
    throughput_history: ThroughputDataPoint[];
    uptime_seconds: number;
    celery_version: string;
    python_version: string;
    // Story 21 extensions for performance chart (AC-2, AC-4, AC-5)
    cpu_history: CpuMemoryDataPoint[];
    memory_history: CpuMemoryDataPoint[];
    worker_config: WorkerConfig | null;
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

    getWorkerMetrics: async (hostname: string): Promise<WorkerMetrics> => {
        const response = await apiClient.get<WorkerMetrics>(`/api/v1/workers/${hostname}/metrics`);
        return response.data;
    },
};
