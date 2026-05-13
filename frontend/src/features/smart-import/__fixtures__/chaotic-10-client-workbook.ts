import type { WorkbookSheetSummary } from '../domain/types';

export const chaotic10ClientWorkbook: WorkbookSheetSummary[] = [
  {
    sheetId: 'notas-previas',
    name: 'Notas',
    rows: [
      ['Exportacion manual desde sistema contable externo'],
      ['Las filas utiles estan en la hoja Cobranza Mayo'],
      ['No usar esta hoja para importacion'],
    ],
  },
  {
    sheetId: 'cobranza-caotica',
    name: 'Cobranza Mayo',
    rows: [
      ['Despacho contable - cartera activa'],
      ['Corte interno: mayo 2026'],
      [],
      ['Cliente', 'RFC', 'Celular', 'Adeudo', 'Limite', 'Servicio', 'Correo', 'Asesor', 'Detalle'],
      ['Servicios Aurora SC', 'AURM8503157P2', '+52 664 101 2244', '$14,200.00 MXN', '2026-06-15', 'Contabilidad', 'pagos@aurora.mx', 'Ana Ruiz', 'Poliza mensual y declaraciones'],
      ['Aurora Servicios SC', 'AURL8503157P2', '', '$14,200.00', '15/06/2026', 'Contabilidad', 'admin.aurora@example.mx', 'Ana Ruiz', 'Cliente parecido sin telefono'],
      ['Delta Operaciones SA de CV', 'DOPC900101AB1', '664-222-3344', '$8,750.50', '17 jun 2026', 'Fiscal', 'cobranza@delta.mx', 'Mario Leon', 'Declaracion mensual IVA'],
      ['Norte Digital MX', 'NDM120229K83', '(664) 333 4455', '$21,000', '2026/06/20', 'Nomina', 'finanzas@nortedigital.mx', 'Ana Ruiz', 'Timbrado y nomina quincenal'],
      ['Ramos y Asociados', 'RAA760412QZ4', '6644445566', '$6,300.00', '20-06-2026', 'Auditoria', 'contacto@ramos.mx', 'Sofia Paz', 'Revision documental'],
      ['Comercial Dominguez', 'DOMC910802M6A', '+52 (664) 555 6677', '$4,980.25', '21/06/2026', 'Fiscal', '', 'Mario Leon', 'Sin correo registrado'],
      ['Industrias Mar Azul', 'IMA990731F12', '6646667788', '$32,500.00 MXN', '2026.06.22', 'Contabilidad', 'tesoreria@marazul.mx', 'Ana Ruiz', 'Cierre contable mensual'],
      ['Consultoria Prisma', 'CPR010203H45', '6647778899', '$9,100', '22 jun 2026', 'Legal', 'admin@prisma.mx', 'Sofia Paz', 'Contrato y cumplimiento'],
      ['Grupo Delta SA', 'GDE870101TY9', '6648889900', '$8,750.50', '23/06/2026', 'Fiscal', 'pagos@grupodelta.mx', 'Mario Leon', 'Nombre parecido a Delta Operaciones'],
      ['Taller Fiscal Lopez', 'TFL700505P11', '6649990011', '$3,450.75', '2026-06-24', 'Declaracion', 'lopez@tallerfiscal.mx', 'Ana Ruiz', 'Declaracion anual persona fisica'],
    ],
  },
];
