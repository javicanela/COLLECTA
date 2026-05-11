import type { ReactNode } from 'react';
import { Mail, MessageSquare, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import {
  getActionLabel,
  getRiskCopy,
  type AgentActionPolicy,
  type AgentChannel,
} from './AgentControlCenter';

interface ActionPolicyMatrixProps {
  policies: AgentActionPolicy[];
}

export function ActionPolicyMatrix({ policies }: ActionPolicyMatrixProps) {
  const approvalPolicies = policies.filter((policy) => policy.approvalRequired);
  const automaticPolicies = policies.filter((policy) => policy.automatic);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.5)]">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2 text-slate-900">
          <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          <h2 className="text-base font-semibold">Matriz de politica</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Que ejecuta solo el agente y que exige aprobacion del operador.
        </p>
      </div>

      {policies.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ShieldCheck size={34} strokeWidth={1.7} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Sin politicas registradas</p>
          <p className="mt-1 text-sm text-slate-500">El backend no devolvio reglas para clasificar acciones.</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <PolicyColumn
            title={`Requiere aprobacion (${approvalPolicies.length})`}
            description="Acciones retenidas para revision humana"
            policies={approvalPolicies}
            icon={<ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />}
          />
          <PolicyColumn
            title={`Automatico (${automaticPolicies.length})`}
            description="Acciones que el agente puede preparar sin bloqueo"
            policies={automaticPolicies}
            icon={<Zap size={16} strokeWidth={1.8} aria-hidden="true" />}
          />
        </div>
      )}
    </section>
  );
}

function PolicyColumn({
  title,
  description,
  policies,
  icon,
}: {
  title: string;
  description: string;
  policies: AgentActionPolicy[];
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2 text-slate-900">
          <span className="text-slate-500">{icon}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      {policies.length === 0 ? (
        <p className="px-3 py-6 text-sm text-slate-500">No hay reglas en esta categoria.</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {policies.map((policy) => (
            <PolicyRow key={policy.actionType} policy={policy} />
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyRow({ policy }: { policy: AgentActionPolicy }) {
  const risk = getRiskCopy(policy.risk);

  return (
    <div className="px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          {getChannelIcon(policy.channel)}
          {getActionLabel(policy.actionType)}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${risk.className}`}>
          {risk.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{policy.reason}</p>
      <p className="mt-1 font-mono text-[11px] uppercase text-slate-400">{policy.channel}</p>
    </div>
  );
}

function getChannelIcon(channel: AgentChannel) {
  if (channel === 'WHATSAPP') {
    return <MessageSquare size={12} strokeWidth={1.8} aria-hidden="true" />;
  }

  if (channel === 'EMAIL') {
    return <Mail size={12} strokeWidth={1.8} aria-hidden="true" />;
  }

  return <ShieldCheck size={12} strokeWidth={1.8} aria-hidden="true" />;
}
