/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Doctor, Transaction, SupplyItem, TeamGoal, TeamMember } from './types';

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dra. Camila Souza',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    role: 'Ortodontista & Implantodontista',
    monthlyTarget: 20000,
    currentEarnings: 18000,
    specialty: 'Implantodontia',
    cro: 'CRO-SP 12345',
    email: 'camila.souza@clinica.com',
    evaluations: 25,
    closures: 18
  },
  {
    id: 'doc-2',
    name: 'Dra. Beatriz Lima',
    avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
    role: 'Odontopediatra & Estética',
    monthlyTarget: 15000,
    currentEarnings: 14000,
    specialty: 'Odontopediatria',
    cro: 'CRO-SP 67890',
    email: 'beatriz.lima@clinica.com',
    evaluations: 20,
    closures: 15
  },
  {
    id: 'doc-3',
    name: 'Dra. Fernanda Costa',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    role: 'Clínica Geral & Endodontista',
    monthlyTarget: 15000,
    currentEarnings: 10000,
    specialty: 'Endodontia',
    cro: 'CRO-SP 54321',
    email: 'fernanda.costa@clinica.com',
    evaluations: 24,
    closures: 12
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Camila Souza treatment revenues (Total R$ 18.000)
  {
    id: 't-1',
    date: '2026-03-05',
    description: 'Implante Dentário de Titânio',
    doctorName: 'Dra. Camila Souza',
    value: 8000,
    category: 'Procedimentos',
    type: 'receita'
  },
  {
    id: 't-2',
    date: '2026-03-12',
    description: 'Prótese Dentária Fixa',
    doctorName: 'Dra. Camila Souza',
    value: 6000,
    category: 'Procedimentos',
    type: 'receita'
  },
  {
    id: 't-3',
    date: '2026-03-19',
    description: 'Tratamento de Canal Endodôntico',
    doctorName: 'Dra. Camila Souza',
    value: 4000,
    category: 'Consultas',
    type: 'receita'
  },

  // Beatriz Lima treatment revenues (Total R$ 14.000)
  {
    id: 't-4',
    date: '2026-03-03',
    description: 'Clareamento Dental Caseiro + Consultório',
    doctorName: 'Dra. Beatriz Lima',
    value: 3500,
    category: 'Procedimentos',
    type: 'receita'
  },
  {
    id: 't-5',
    date: '2026-03-10',
    description: 'Restaurações Estéticas em Resina',
    doctorName: 'Dra. Beatriz Lima',
    value: 4500,
    category: 'Procedimentos',
    type: 'receita'
  },
  {
    id: 't-6',
    date: '2026-03-22',
    description: 'Aparelho Ortodôntico Estético',
    doctorName: 'Dra. Beatriz Lima',
    value: 6000,
    category: 'Procedimentos',
    type: 'receita'
  },

  // Fernanda Costa treatment revenues (Total R$ 10.000)
  {
    id: 't-7',
    date: '2026-03-02',
    description: 'Limpeza Profilaxia Completa (x10)',
    doctorName: 'Dra. Fernanda Costa',
    value: 3000,
    category: 'Consultas',
    type: 'receita'
  },
  {
    id: 't-8',
    date: '2026-03-15',
    description: 'Facetas de Resina Direta (x2)',
    doctorName: 'Dra. Fernanda Costa',
    value: 7000,
    category: 'Procedimentos',
    type: 'receita'
  },

  // Material expenses (Total R$ 8.400 across 12 entries)
  {
    id: 't-exp-1',
    date: '2026-03-01',
    description: 'Resina Composta Estética 3M',
    doctorName: 'Administração',
    value: 1200,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-2',
    date: '2026-03-03',
    description: 'Anestésicos Lidocaína 2% (DFL)',
    doctorName: 'Administração',
    value: 900,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-3',
    date: '2026-03-04',
    description: 'Luvas de Procedimento Nitrílicas',
    doctorName: 'Administração',
    value: 1500,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-4',
    date: '2026-03-07',
    description: 'Agulhas Gengivais Extra-curtas',
    doctorName: 'Administração',
    value: 400,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-5',
    date: '2026-03-09',
    description: 'Máscaras Descartáveis Cirúrgicas',
    doctorName: 'Administração',
    value: 600,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-6',
    date: '2026-03-11',
    description: 'Babadores de Papel Impermeáveis',
    doctorName: 'Administração',
    value: 350,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-7',
    date: '2026-03-14',
    description: 'Brocas de Tungstênio Alta Rotação',
    doctorName: 'Administração',
    value: 850,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-8',
    date: '2026-03-17',
    description: 'Cimento Provisório Temp-Bond',
    doctorName: 'Administração',
    value: 700,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-9',
    date: '2026-03-18',
    description: 'Fitas Matriz de Poliéster e Cunhas',
    doctorName: 'Administração',
    value: 300,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-10',
    date: '2026-03-20',
    description: 'Sugadores Descartáveis de Saliva',
    doctorName: 'Administração',
    value: 500,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-11',
    date: '2026-03-24',
    description: 'Selante de Fóssulas e Fissuras Flúor',
    doctorName: 'Administração',
    value: 650,
    category: 'Materiais',
    type: 'despesa'
  },
  {
    id: 't-exp-12',
    date: '2026-03-26',
    description: 'Ácido Fosfórico Gel 37%',
    doctorName: 'Administração',
    value: 450,
    category: 'Materiais',
    type: 'despesa'
  }
];

export const INITIAL_SUPPLY_ITEMS: SupplyItem[] = [
  {
    id: 'sup-1',
    name: 'Resina Composta Estética 3M Z350',
    category: 'Consumíveis',
    stock: 15,
    minStock: 20,
    unit: 'seringas',
    price: 85.00,
    expirationDate: '2026-11-20',
    batchNumber: 'LT-3M-8821',
    supplier: 'Dental Cremer',
    location: 'Gaveta A1 - Prateleira 2'
  },
  {
    id: 'sup-2',
    name: 'Anestésico Lidocaína 2% c/ Epinefrina',
    category: 'Anestésicos',
    stock: 80,
    minStock: 100,
    unit: 'tubetes',
    price: 3.50,
    expirationDate: '2026-08-25', // Expiring soon
    batchNumber: 'LID-2026-04',
    supplier: 'DFL Indústria',
    location: 'Geladeira Odontológica'
  },
  {
    id: 'sup-3',
    name: 'Luvas de Procedimento Nitrílicas (Tam M)',
    category: 'Descartáveis',
    stock: 8,
    minStock: 15,
    unit: 'caixas',
    price: 48.00,
    expirationDate: '2027-05-20',
    batchNumber: 'NIT-99120',
    supplier: 'Supermax',
    location: 'Armário Central - Prateleira 3'
  },
  {
    id: 'sup-4',
    name: 'Brocas Esféricas Carbide FG (Alta Rotação)',
    category: 'Instrumentos',
    stock: 24,
    minStock: 12,
    unit: 'unidades',
    price: 18.00,
    expirationDate: '2028-10-10',
    batchNumber: 'BR-2025-01',
    supplier: 'KG Sorensen',
    location: 'Gaveta B2 - Instrumentais'
  },
  {
    id: 'sup-5',
    name: 'Sugador de Saliva Descartável Estéril',
    category: 'Descartáveis',
    stock: 10,
    minStock: 10,
    unit: 'pacotes (c/ 100)',
    price: 15.00,
    expirationDate: '2026-06-30', // Expired
    batchNumber: 'SUG-2024-88',
    supplier: 'Maquira',
    location: 'Armário de Descartáveis'
  },
  {
    id: 'sup-6',
    name: 'Máscara Cirúrgica Tripla c/ Elástico',
    category: 'Descartáveis',
    stock: 4,
    minStock: 10,
    unit: 'caixas (c/ 50)',
    price: 25.00,
    expirationDate: '2027-01-30',
    batchNumber: 'MSC-2025-12',
    supplier: 'Descarpack',
    location: 'Armário Central - Prateleira 1'
  },
  {
    id: 'sup-7',
    name: 'Agulha Gengival Curta 30G (Unodent)',
    category: 'Agulhas',
    stock: 150,
    minStock: 100,
    unit: 'unidades',
    price: 1.20,
    expirationDate: '2026-09-05',
    batchNumber: 'AG-30G-771',
    supplier: 'Unodent',
    location: 'Gaveta C1'
  },
  {
    id: 'sup-8',
    name: 'Algodão Hidrófilo em Rolo',
    category: 'Descartáveis',
    stock: 35,
    minStock: 25,
    unit: 'rolos',
    price: 12.00,
    expirationDate: '2027-11-20',
    batchNumber: 'ALG-2025-09',
    supplier: 'Cremer',
    location: 'Armário Central - Prateleira 4'
  }
];

export const INITIAL_TEAM_GOALS: TeamGoal[] = [
  {
    id: 'g-1',
    title: 'Atingir faturamento do mês',
    targetValue: 50000,
    currentValue: 42000,
    deadline: '2026-03-31',
    assignedTo: 'Toda a Equipe'
  },
  {
    id: 'g-2',
    title: 'Manter gasto de materiais abaixo de 18% do faturamento',
    targetValue: 9000,
    currentValue: 8400,
    deadline: '2026-03-31',
    assignedTo: 'Equipe de Compras'
  },
  {
    id: 'g-3',
    title: 'Atingir meta individual de faturamento - Dra. Camila',
    targetValue: 20000,
    currentValue: 18000,
    deadline: '2026-03-31',
    assignedTo: 'Dra. Camila Souza'
  }
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Dra. Ana Silva',
    role: 'Gestora Clínica & CRO',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgOcaKXbC2BnctMv-VBSJjPs0j2mbd7Kh_qKzZQWny6xz18hRk0OSMTO_ZzrfcWSaRytgzZv10D_n2wqMDeNXv7kFULqa_94wuwdq1K2a_QYIOTIQCrEt-NBMY9hdrzGCNnsIi_8oneYXRMZokZ4kwmHw6BqVNWCVtJMKErOYkRKmxXfsO3ZxD8xOsyiUieTb6ix-I_V5yGFN50z_i5aLvFQC0XqfxZDh1hHsg6z3C1BTWRIZineoCwnShWyQZypwzqoIv_Q3dtnkv',
    status: 'Ativo'
  },
  {
    id: 'tm-2',
    name: 'Dra. Camila Souza',
    role: 'Ortodontista',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    status: 'Em plantão'
  },
  {
    id: 'tm-3',
    name: 'Dra. Beatriz Lima',
    role: 'Odontopediatra',
    avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
    status: 'Ausente'
  },
  {
    id: 'tm-4',
    name: 'Dra. Fernanda Costa',
    role: 'Endodontista',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    status: 'Ativo'
  },
  {
    id: 'tm-5',
    name: 'Mariana Santos',
    role: 'Secretária Executiva',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    status: 'Ativo'
  },
  {
    id: 'tm-6',
    name: 'Thiago Oliveira',
    role: 'Auxiliar em Saúde Bucal (ASB)',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    status: 'Ativo'
  }
];
