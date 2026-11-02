'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Building,
  Calendar,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  businessId: string;
  business: {
    id: string;
    name: string;
  };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Create task inline state
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBizId, setNewBizId] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch businesses for task dropdown
  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses?limit=100');
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
        if (data.businesses?.length > 0) {
          setNewBizId(data.businesses[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchBusinesses();
  }, [filterStatus, filterPriority]);

  // Toggle completion
  const handleToggleComplete = async (task: Task) => {
    const isDone = task.status === 'DONE';
    const newStatus = isDone ? 'TODO' : 'DONE';

    // Instantly update UI state
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error(e);
      fetchTasks();
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
      fetchTasks();
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBizId) return;

    setCreating(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: newBizId,
          title: newTitle,
          description: newDesc,
          priority: newPriority,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Task added successfully!');
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        fetchTasks();
      }
    } catch (err: any) {
      setSuccessMsg('Error: ' + err.message);
    } finally {
      setCreating(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CheckSquare className="w-8 h-8 text-[#2563EB]" />
          <span>Daily Execution Tasks</span>
        </h1>
        <p className="text-[#A1A1AA] mt-1 text-sm">
          Plan, track, and execute daily agency sales outreach operations.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Tasks List */}
        <div className="xl:col-span-2 p-6 bg-[#111113] border border-[#27272A] rounded-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
            <h2 className="text-lg font-bold">Tasks List</h2>
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] rounded p-2 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              {/* Priority Filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] rounded p-2 focus:outline-none"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-[#A1A1AA] py-12 text-center">No tasks found matching parameters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] text-[#A1A1AA] font-bold">
                    <th className="pb-3 text-center w-8">Complete</th>
                    <th className="pb-3">Task Details</th>
                    <th className="pb-3">Business</th>
                    <th className="pb-3 text-center">Priority</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b1e]">
                  {tasks.map((task) => {
                    const isDone = task.status === 'DONE';
                    return (
                      <tr key={task.id} className={`hover:bg-[#1b1b1f]/30 ${isDone ? 'opacity-65' : ''}`}>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => handleToggleComplete(task)}
                            className="text-[#2563EB] hover:text-[#2563EB]/80 focus:outline-none"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                            ) : (
                              <Circle className="w-5 h-5 text-[#A1A1AA]" />
                            )}
                          </button>
                        </td>
                        <td className="py-4">
                          <p className={`font-bold text-[#FAFAFA] ${isDone ? 'line-through text-[#A1A1AA]' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[10px] text-[#A1A1AA] mt-0.5 max-w-[240px] truncate">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td className="py-4">
                          <Link
                            href={`/business/${task.businessId}`}
                            className="hover:underline font-semibold text-[#FAFAFA] flex items-center gap-1"
                          >
                            <Building className="w-3.5 h-3.5 text-[#A1A1AA]" />
                            <span className="truncate max-w-[130px]">{task.business?.name || 'Local Business'}</span>
                          </Link>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            task.priority === 'URGENT' || task.priority === 'HIGH' ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                            task.priority === 'MEDIUM' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                            'bg-[#2563EB]/15 text-[#2563EB]'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-4 text-[#A1A1AA] font-mono">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-[#A1A1AA] hover:text-[#EF4444]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Task Form */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg h-fit">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#2563EB]" />
            <span>Create Operation Task</span>
          </h2>
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Schedule meeting with decision maker"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full bg-[#09090B] border border-[#27272A] rounded p-2.5 text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5">Business Link</label>
              <select
                value={newBizId}
                onChange={(e) => setNewBizId(e.target.value)}
                required
                className="w-full bg-[#09090B] border border-[#27272A] rounded p-2.5 text-[#FAFAFA] focus:outline-none"
              >
                {businesses.length === 0 ? (
                  <option value="">No businesses in database</option>
                ) : (
                  businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5">Description</label>
              <textarea
                placeholder="Add optional notes..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="w-full bg-[#09090B] border border-[#27272A] rounded p-2.5 text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded p-2.5 text-[#FAFAFA]"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded p-2.5 text-[#FAFAFA]"
                />
              </div>
            </div>

            {successMsg && <p className="text-xs text-[#22C55E] mt-1 font-semibold">{successMsg}</p>}

            <button
              type="submit"
              disabled={creating || !newBizId}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/80 disabled:opacity-50 text-white font-bold rounded transition-colors flex items-center justify-center gap-1.5"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add Task</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
