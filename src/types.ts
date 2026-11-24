/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string;
  description: string;
  doctorName: string;
  value: number;
  category: string; // 'Consultas' | 'Procedimentos' | 'Materiais' | 'Laboratório' | 'Aluguel' | 'Salários' | 'Impostos' | 'Marketing' | 'Manutenção' | 'Outros'
  type: 'receita' | 'despesa';
  supplier?: string;
  subcategory?: string;
  paymentMethod?: 'Dinheiro' | 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto' | 'Outros';
  status?: 'pago' | 'pendente';
  dueDate?: string;
}

export interface CashRegisterClosure {
  id: string;
  date: string;
  initialBalance: number;
  totalIncomeMoney: number;
  totalIncomePix: number;
  totalIncomeCard: number;
  totalExpenseMoney: number;
  expectedBalanceMoney: number;
  actualBalanceMoney: number;
  differenceMoney: number;
  sangria: number;
  closedBy: string;
  closedAt: string;
  notes?: string;
}

export interface Doctor {
  id: string;
  name: string;
  avatar: string;
  role: string;
  monthlyTarget: number;
  currentEarnings: number;
  specialty: string;
  cro: string;
  email: string;
  evaluations?: number; // Avaliações por mês
  closures?: number;     // Fechamentos por mês
}

export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
  expirationDate?: string; // YYYY-MM-DD
  batchNumber?: string;    // Nº do Lote
  supplier?: string;       // Fornecedor
  location?: string;       // Localização / Armário
}

export interface TeamGoal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  assignedTo: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'Ativo' | 'Em plantão' | 'Ausente';
}

export interface LabProcedure {
  id: string;
  patientName: string;
  procedureType: 'Prótese' | 'Coroa' | 'Faceta' | 'Implante' | 'Onlay/Inlay' | 'Placa Alinhadora/Miorrelaxante' | 'Outro';
  laboratoryName: string;
  sentDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  doctorName: string;
  status: 'A Enviar' | 'No Laboratório' | 'Recebido' | 'Instalado' | 'Ajuste';
  value: number;
  notes?: string;
  shade?: string;
}

