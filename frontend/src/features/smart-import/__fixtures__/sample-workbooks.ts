export const cleanCsvRows = [
  ['RFC', 'Nombre', 'Email', 'Telefono', 'Monto', 'Vencimiento', 'Concepto', 'Asesor'],
  ['ABC010101ABC', 'Acme Servicios SA de CV', 'cobranza@acme.mx', '6641234567', '$12,450.50', '15/04/2026', 'Honorarios mensuales', 'Ana'],
  ['LOPE8001019Q8', 'Luis Lopez Perez', 'luis@example.com', '+52 664 765 4321', '3200', '2026-04-30', 'Declaracion anual', 'Mario'],
  ['XYZ991231AA1', 'XYZ Comercial', 'admin@xyz.mx', '(664) 111-2233', '9800.00', '30-04-2026', 'Contabilidad abril', 'Ana'],
];

export const weirdHeadersCsvRows = [
  ['R.F.C.', 'Razon Social / Cliente', 'correo electronico', 'Cel / WhatsApp', '$ Adeudo', 'Fecha limite de pago', 'Detalle servicio'],
  ['ABC010101ABC', 'Acme Servicios SA de CV', 'cobranza@acme.mx', '+52 (664) 123-4567', '$12,450.50 MXN', '15 abr 2026', 'Honorarios mensuales'],
  ['LOPE8001019Q8', 'Luis Lopez Perez', 'luis@example.com', '6647654321', '3,200.00', '2026/04/30', 'Declaracion anual'],
  ['XYZ991231AA1', 'XYZ Comercial', 'admin@xyz.mx', '6641112233', '9800', '30-04-2026', 'Contabilidad abril'],
];

export const xlsxThreeSheets = [
  {
    sheetId: 'sheet-notes',
    name: 'Notas',
    rows: [
      ['Archivo exportado desde sistema externo'],
      ['No modificar manualmente'],
    ],
  },
  {
    sheetId: 'sheet-clients',
    name: 'Clientes',
    rows: [
      ['RFC', 'Cliente', 'Correo', 'Telefono'],
      ['ABC010101ABC', 'Acme Servicios SA de CV', 'cobranza@acme.mx', '6641234567'],
      ['LOPE8001019Q8', 'Luis Lopez Perez', 'luis@example.com', '6647654321'],
    ],
  },
  {
    sheetId: 'sheet-operations',
    name: 'Operaciones',
    rows: [
      ['RFC cliente', 'Razon social', 'Monto pendiente', 'Fecha vencimiento', 'Concepto'],
      ['ABC010101ABC', 'Acme Servicios SA de CV', '$12,450.50', '15/04/2026', 'Honorarios mensuales'],
      ['LOPE8001019Q8', 'Luis Lopez Perez', '3200', '2026-04-30', 'Declaracion anual'],
      ['XYZ991231AA1', 'XYZ Comercial', '9800.00', '30-04-2026', 'Contabilidad abril'],
    ],
  },
];

export const titleRowsBeforeHeadersRows = [
  ['Reporte de cobranza - Abril 2026'],
  ['Generado por sistema externo'],
  [],
  ['RFC', 'Nombre del Cliente', 'Monto total', 'Fecha de Vencimiento', 'Descripcion'],
  ['ABC010101ABC', 'Acme Servicios SA de CV', '$12,450.50', '15/04/2026', 'Honorarios mensuales'],
  ['LOPE8001019Q8', 'Luis Lopez Perez', '3200', '2026-04-30', 'Declaracion anual'],
  ['XYZ991231AA1', 'XYZ Comercial', '9800.00', '30-04-2026', 'Contabilidad abril'],
];

export const multilevelHeaderRows = [
  ['Cliente', '', 'Contacto', '', 'Operacion', '', ''],
  ['RFC', 'Razon Social', 'Email', 'Telefono', 'Monto', 'Vencimiento', 'Descripcion'],
  ['ABC010101ABC', 'Acme Servicios SA de CV', 'cobranza@acme.mx', '6641234567', '$12,450.50', '15/04/2026', 'Honorarios mensuales'],
  ['LOPE8001019Q8', 'Luis Lopez Perez', 'luis@example.com', '6647654321', '3200', '2026-04-30', 'Declaracion anual'],
];

export const mixedClientOperationRows = [
  ['Cliente RFC', 'Cliente nombre', 'Regimen fiscal', 'Email', 'Operacion tipo', 'Descripcion operacion', 'Monto', 'Fecha vence', 'Estatus', 'Excluir'],
  ['ABC010101ABC', 'Acme Servicios SA de CV', '601 General de Ley', 'cobranza@acme.mx', 'FISCAL', 'Honorarios mensuales', '$12,450.50', '15/04/2026', 'PENDIENTE', 'no'],
  ['LOPE8001019Q8', 'Luis Lopez Perez', '626 RESICO', 'luis@example.com', 'DECLARACION', 'Declaracion anual', '3200', '2026-04-30', 'PAGADO', 'false'],
  ['XYZ991231AA1', 'XYZ Comercial', '601', 'admin@xyz.mx', 'CONTABLE', 'Contabilidad abril', '9800.00', '30-04-2026', 'VENCIDO', '0'],
];
