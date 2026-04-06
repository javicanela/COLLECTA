import React, { useState } from 'react';
import { X, Save, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useClientStore } from '../../stores/useClientStore';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose }) => {
  const { createClient, isLoading } = useClientStore();
  const [formData, setFormData] = useState({
    nombre: '',
    rfc: '',
    email: '',
    telefono: '',
    regimen: '',
    asesor: '',
    categoria: 'Nuevo',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient(formData);
      onClose();
      setFormData({
        nombre: '',
        rfc: '',
        email: '',
        telefono: '',
        regimen: '',
        asesor: '',
        categoria: 'Nuevo',
      });
    } catch (err) {
      console.error('Error creating client:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-[#111927] border border-[#1f2937] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] sm:max-h-none flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1f2937] bg-[#111927] shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <UserIcon className="text-primary" size={20} />
            <span className="hidden sm:inline">Nuevo Registro de Contribuyente</span>
            <span className="sm:hidden">Nuevo Cliente</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Input 
              label="Nombre o Razón Social" 
              placeholder="Ej. Juan Pérez o Empresa S.A."
              required
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
            />
            <Input 
              label="RFC" 
              placeholder="XAXX010101XXX"
              mono
              required
              value={formData.rfc}
              onChange={e => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
            />
            <Input 
              label="Email" 
              type="email"
              placeholder="cliente@ejemplo.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <Input 
              label="Teléfono" 
              placeholder="5512345678"
              value={formData.telefono}
              onChange={e => setFormData({ ...formData, telefono: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Régimen Fiscal</label>
              <select 
                className="input text-sm"
                value={formData.regimen}
                onChange={e => setFormData({ ...formData, regimen: e.target.value })}
              >
                <option value="">Seleccionar régimen...</option>
                <option value="601">General de Ley Personas Morales</option>
                <option value="603">Personas Morales con Fines no Lucrativos</option>
                <option value="605">Sueldos y Salarios</option>
                <option value="606">Arrendamiento</option>
                <option value="626">RESICO</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Asesor Responsable</label>
              <select 
                className="input text-sm"
                value={formData.asesor}
                onChange={e => setFormData({ ...formData, asesor: e.target.value })}
              >
                <option value="">Sin asignar</option>
                <option value="JAVI">Javi Canela</option>
                <option value="MARTHA">Martha Vega</option>
                <option value="ROBERTO">Roberto Ruiz</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Segmentación de Cliente</label>
              <div className="grid grid-cols-2 sm:flex gap-2">
                {['NUEVO', 'RECURRENTE', 'VIP', 'DEUDOR'].map(cat => (
                  <label key={cat} className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="categoria" 
                      className="peer hidden" 
                      value={cat}
                      checked={formData.categoria === cat}
                      onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                    />
                    <div className={`text-center py-2 px-3 rounded-lg border border-[#1f2937] text-xs font-bold transition-all peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:text-primary hover:bg-[#1f2937]`}>
                      {cat}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="green" type="submit" className="flex items-center justify-center gap-2 w-full sm:w-auto" disabled={isLoading}>
              <Save size={18} />
              {isLoading ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
