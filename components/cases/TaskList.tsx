"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

// ============================================================
// Typer
// ============================================================

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "completed";
  priority: "low" | "normal" | "high";
  due_date: string | null;
  created_at: string;
}

interface TaskListProps {
  caseNumber: string;
  initialTasks: TaskRow[];
}

// ============================================================
// Prioritetsbadge
// ============================================================

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high:   "bg-red-500",
    normal: "bg-blue-500",
    low:    "bg-gray-400",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[priority] ?? colors.normal}`}
      aria-label={priority === "high" ? "Høy prioritet" : priority === "low" ? "Lav prioritet" : "Normal prioritet"}
    />
  );
}

// ============================================================
// Enkelt oppgaveinnslag
// ============================================================

function TaskItem({
  task,
  caseNumber,
  onToggle,
}: {
  task: TaskRow;
  caseNumber: string;
  onToggle: (id: string, newStatus: "open" | "completed") => void;
}) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    const newStatus: "open" | "completed" = task.status === "open" ? "completed" : "open";
    try {
      const res = await authFetch(
        `/api/cases/${encodeURIComponent(caseNumber)}/tasks`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: task.id, status: newStatus }),
        }
      );
      if (res.ok) onToggle(task.id, newStatus);
    } finally {
      setToggling(false);
    }
  }

  const isOverdue =
    task.status === "open" &&
    task.due_date &&
    new Date(task.due_date) < new Date();

  return (
    <li className="flex items-start gap-3 py-3">
      {/* Avkrysningsboks */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        aria-label={task.status === "open" ? "Merk som fullført" : "Merk som åpen"}
        className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center
                    transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                    ${task.status === "completed"
                      ? "bg-green-500 border-green-500"
                      : "border-gray-400 dark:border-slate-500 hover:border-brand-500"
                    }
                    ${toggling ? "opacity-50" : ""}`}
      >
        {task.status === "completed" && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PriorityDot priority={task.priority} />
          <p className={`text-sm font-medium leading-snug ${
            task.status === "completed"
              ? "line-through text-gray-400 dark:text-slate-500"
              : "text-gray-900 dark:text-white"
          }`}>
            {task.title}
          </p>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 ml-4">
            {task.description}
          </p>
        )}

        {task.due_date && (
          <p className={`text-xs mt-0.5 ml-4 ${
            isOverdue
              ? "text-red-600 dark:text-red-400 font-medium"
              : "text-gray-400 dark:text-slate-500"
          }`}>
            Frist: {new Date(task.due_date).toLocaleDateString("nb-NO")}
            {isOverdue && " (forfalt)"}
          </p>
        )}
      </div>
    </li>
  );
}

// ============================================================
// Nytt oppgave-skjema (inline)
// ============================================================

function NewTaskForm({
  caseNumber,
  onCreated,
  onCancel,
}: {
  caseNumber: string;
  onCreated: (task: TaskRow) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(
        `/api/cases/${encodeURIComponent(caseNumber)}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            priority,
            due_date: dueDate || undefined,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Kunne ikke opprette oppgave");
      }
      const task = await res.json() as TaskRow;
      onCreated(task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 pt-3 border-t border-gray-100 dark:border-slate-700">
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Oppgavetittel…"
        required
        autoFocus
        className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                   bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                   px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-400"
      />
      <div className="flex gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          aria-label="Prioritet"
          className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="high">Høy prioritet</option>
          <option value="normal">Normal</option>
          <option value="low">Lav prioritet</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Frist"
          className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-lg
                     text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700
                     hover:bg-gray-200 dark:hover:bg-slate-600 transition"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg
                     text-white bg-brand-600 hover:bg-brand-700
                     disabled:opacity-50 transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {loading ? "Lagrer…" : "Legg til"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// TaskList — komplett oppgaveliste med inline-opprettelse
// ============================================================

export default function TaskList({ caseNumber, initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const openTasks = tasks.filter((t) => t.status === "open");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  function handleToggle(id: string, newStatus: "open" | "completed") {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  }

  function handleCreated(task: TaskRow) {
    setTasks((prev) => [task, ...prev]);
    setShowForm(false);
  }

  return (
    <section aria-labelledby="tasks-heading">
      <div className="flex items-center justify-between mb-2">
        <h2 id="tasks-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
          Oppgaver
          {openTasks.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-slate-400">
              ({openTasks.length} åpne)
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="text-xs font-medium text-brand-600 dark:text-brand-400
                     hover:text-brand-700 dark:hover:text-brand-300
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
        >
          + Ny oppgave
        </button>
      </div>

      {showForm && (
        <NewTaskForm
          caseNumber={caseNumber}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {tasks.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 dark:text-slate-400 py-2">
          Ingen oppgaver ennå.
        </p>
      )}

      {openTasks.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-slate-700" aria-label="Åpne oppgaver">
          {openTasks.map((t) => (
            <TaskItem key={t.id} task={t} caseNumber={caseNumber} onToggle={handleToggle} />
          ))}
        </ul>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="text-xs text-gray-500 dark:text-slate-400
                       hover:text-gray-700 dark:hover:text-slate-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {showCompleted ? "Skjul" : "Vis"} fullførte ({completedTasks.length})
          </button>
          {showCompleted && (
            <ul className="divide-y divide-gray-100 dark:divide-slate-700 mt-1" aria-label="Fullførte oppgaver">
              {completedTasks.map((t) => (
                <TaskItem key={t.id} task={t} caseNumber={caseNumber} onToggle={handleToggle} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
