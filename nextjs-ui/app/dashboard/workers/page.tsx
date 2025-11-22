'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workersApi } from '@/lib/api/workers';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Activity, Server, Clock, CheckCircle, AlertCircle, Play, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WorkerLogsModal } from '@/components/workers/WorkerLogsModal';

export default function WorkersPage() {
    const queryClient = useQueryClient();
    const [logsModalOpen, setLogsModalOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

    const { data: workers, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['workers'],
        queryFn: workersApi.listWorkers,
        refetchInterval: 5000,
    });

    const restartMutation = useMutation({
        mutationFn: workersApi.restartWorker,
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['workers'] });
        },
        onError: (error) => {
            toast.error('Failed to restart worker');
            console.error(error);
        },
    });

    const handleRestart = (hostname: string) => {
        if (confirm(`Are you sure you want to restart worker ${hostname}?`)) {
            restartMutation.mutate(hostname);
        }
    };

    const handleViewLogs = (hostname: string) => {
        setSelectedWorker(hostname);
        setLogsModalOpen(true);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">Loading workers...</div>
            </DashboardLayout>
        );
    }

    if (isError) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-red-500">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                    Failed to load workers. Please check backend connection.
                    <Button onClick={() => refetch()} className="mt-4 block mx-auto">Retry</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Worker Nodes</h1>
                        <p className="text-muted-foreground">Monitor and manage Celery worker nodes</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Button onClick={() => refetch()} variant="secondary" size="sm">
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6">
                    {workers?.map((worker) => (
                        <div key={worker.hostname} className="glass-card p-6 rounded-lg border border-border/50">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${worker.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <Server className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{worker.hostname}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className={`inline-block w-2 h-2 rounded-full ${worker.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {worker.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleViewLogs(worker.hostname)}
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Logs
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleRestart(worker.hostname)}
                                        disabled={restartMutation.isPending}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Restart
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-muted/50 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <Activity className="h-3 w-3" /> Active Tasks
                                    </div>
                                    <div className="text-2xl font-mono">{worker.active_tasks_count}</div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Completed
                                    </div>
                                    <div className="text-2xl font-mono">{worker.completed_tasks_count}</div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <Play className="h-3 w-3" /> Concurrency
                                    </div>
                                    <div className="text-2xl font-mono">{worker.concurrency}</div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Uptime (s)
                                    </div>
                                    <div className="text-2xl font-mono">{worker.uptime}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {workers?.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No workers found. Ensure Celery is running.
                        </div>
                    )}
                </div>

                {/* Worker Logs Modal */}
                {selectedWorker && (
                    <WorkerLogsModal
                        hostname={selectedWorker}
                        isOpen={logsModalOpen}
                        onClose={() => {
                            setLogsModalOpen(false);
                            setSelectedWorker(null);
                        }}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
