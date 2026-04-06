import { useState, useRef, useCallback, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Plantilla {
  key: string;
  nombre: string;
  valor: string;
}

interface PlantillaModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantilla?: Plantilla | null;
  onSave: (key: string, nombre: string, valor: string) => void;
}

export function PlantillaModal({ isOpen, onClose, plantilla, onSave }: PlantillaModalProps) {
  const [nombre, setNombre] = useState(plantilla?.nombre || '');
  const [cuerpo, setCuerpo] = useState(plantilla?.valor || '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNombre(plantilla?.nombre || '');
      setCuerpo(plantilla?.valor || '');
    }
  }, [isOpen, plantilla]);

  const variables = [
    '{NOMBRE_DESPACHO}', '{CLIENTE}', '{MONTO}', '{CONCEPTO}',
    '{FECHA}', '{DIAS}', '{BENEFICIARIO}', '{BANCO}',
    '{CLABE}', '{DEPTO}', '{TEL_DESPACHO}', '{EMAIL_DESPACHO}'
  ];

  const insertVariable = useCallback((v: string) => {
    const ta = taRef.current;
    if (!ta) {
      setCuerpo(prev => prev + v);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = cuerpo.substring(0, start) + v + cuerpo.substring(end);
    setCuerpo(newVal);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + v.length;
    }, 0);
  }, [cuerpo]);
  
  const preview = cuerpo
    .replace(/{NOMBRE_DESPACHO}/g, 'Collecta')
    .replace(/{CLIENTE}/g, 'Colegio de Anestesiólogos')
    .replace(/{MONTO}/g, '$2,100.00')
    .replace(/{CONCEPTO}/g, 'Declaración Anual 2024')
    .replace(/{FECHA}/g, '15/ene/2026')
    .replace(/{DIAS}/g, '12')
    .replace(/{BENEFICIARIO}/g, 'Juan Pérez')
    .replace(/{BANCO}/g, 'BBVA')
    .replace(/{CLABE}/g, '012345678901234567')
    .replace(/{DEPTO}/g, 'Contabilidad')
    .replace(/{TEL_DESPACHO}/g, '+52 664 123 4567')
    .replace(/{EMAIL_DESPACHO}/g, 'contacto@collecta.mx');

  const handleSave = () => {
    const key = plantilla?.key || `plantilla_${Date.now()}`;
    onSave(key, nombre, cuerpo);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={plantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
      size="lg"
    >
      <div className="space-y-4">
        <Input 
          label="Nombre de Plantilla" 
          value={nombre} 
          onChange={e => setNombre(e.target.value)} 
          placeholder="Ej: Recordatorio de Pago"
        />
        
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
            Cuerpo del Mensaje
          </label>
          <textarea
            ref={taRef}
            value={cuerpo}
            onChange={e => setCuerpo(e.target.value)}
            rows={6}
            className="w-full rounded-xl p-3 text-sm outline-none transition-all"
            style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-text)'
            }}
            placeholder="Escribe el mensaje aquí..."
          />
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {variables.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="text-xs px-2 py-1 rounded-lg font-mono transition-colors hover:bg-violet-100"
              style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--brand-violet)' }}
            >
              {v}
            </button>
          ))}
        </div>
        
        <div className="p-4 rounded-xl" style={{ background: '#075e54' }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Vista Previa</p>
          <p className="text-sm text-white whitespace-pre-wrap font-medium">{preview || 'El preview aparecerá aquí...'}</p>
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!nombre || !cuerpo}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
