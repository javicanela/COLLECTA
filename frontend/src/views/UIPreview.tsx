import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Badge, 
  Input, 
  Modal 
} from '../components/ui';
import { Plus, Trash, ExternalLink, MessageCircle, FileText, Shield } from 'lucide-react';

const UIPreview: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold text-brand-primary tracking-tight">
          Collecta <span className="text-text">UI System</span>
        </h1>
        <p className="text-text2">Visual design tokens and components library for the Collecta frontend.</p>
      </header>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="green"><Plus size={18} className="mr-2"/> Principal</Button>
          <Button variant="ghost">Secondary (Ghost)</Button>
          <Button variant="red"><Trash size={18} className="mr-2"/> Eliminar</Button>
          <Button variant="blue"><ExternalLink size={18} className="mr-2"/> Info / Export</Button>
          <Button variant="orange"><MessageCircle size={18} className="mr-2"/> WhatsApp</Button>
          <Button variant="purple"><Shield size={18} className="mr-2"/> IA / Import</Button>
          <Button variant="gold"><FileText size={18} className="mr-2"/> Finanzas</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button size="sm">Small Button</Button>
          <Button size="xs" variant="purple">Extra Small</Button>
          <Button disabled>Disabled Action</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-2">Status Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge status="PAGADO" />
          <Badge status="VENCIDO" />
          <Badge status="HOY VENCE" />
          <Badge status="PENDIENTE" />
          <Badge status="ACTIVO" />
          <Badge status="SUSPENDIDO" />
          <Badge status="CUSTOM" />
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-6 max-w-2xl">
        <h2 className="text-2xl font-bold border-b border-border pb-2">Form Elements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Razon Social" 
            placeholder="Ej: Inmobiliaria del Norte SA" 
          />
          <Input 
            label="RFC (JetBrains Mono)" 
            mono 
            placeholder="ABCD123456EFG" 
          />
          <Input 
            label="Monto MXN" 
            mono 
            type="number" 
            placeholder="0.00" 
          />
          <Input 
            label="Asesor" 
            placeholder="Nombre del asesor..." 
            disabled 
            value="Automatic Asesor"
          />
        </div>
      </section>

      {/* Cards & Layouts */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-2">Cards & Modals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Metric Card">
            <div className="space-y-2">
              <span className="text-4xl font-mono font-bold text-gold">$124,500.00</span>
              <p className="text-sm text-text2">Total pending in current month.</p>
            </div>
          </Card>
          
          <Card title="Interactive Elements">
            <p className="text-sm text-text2 mb-6">Simple card with an action button inside.</p>
            <Button className="w-full" onClick={() => setIsModalOpen(true)}>
              Open Test Modal
            </Button>
          </Card>

          <Card title="Collecta Identity" className="flex flex-col items-center justify-center space-y-4">
             <div className="flex items-center text-3xl font-extrabold gap-1">
                <span className="text-brand-primary">Collecta</span>
             </div>
             <p className="text-[10px] text-text3 font-mono">EST. 2024</p>
          </Card>
        </div>
      </section>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Collecta Confirmation"
      >
        <div className="space-y-4">
          <p className="text-text2">Are you sure you want to test the modal functionality? This is just for UI demonstration purposes.</p>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="green" onClick={() => setIsModalOpen(false)}>Confirm Action</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UIPreview;
