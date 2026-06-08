import type {
  AgendaSubmission,
  BudgetLine,
  CodeCase,
  Employee,
  Exception,
  Inquiry,
  KnowledgeArticle,
  Parcel,
  PayRun,
  PayRunLine,
  RateSchedule,
  Receipt,
  RecordsRequest,
  Resident,
  RevenueLine,
  TaxAccount,
  UtilityAccount,
} from '../types';

// ---------------------------------------------------------------------------
// Mock systems of record for the City of Presque Isle, ME (matching the TRIO
// Web screenshots: Harris Local Government). Budget/payroll/utility figures are
// realistic and grounded in public data (see note below) but illustrative.
// ---------------------------------------------------------------------------

// Figures below are modeled on the City of Presque Isle, ME FY2026 approved
// budget and public records: ~$5.8M general fund / ~$12.9M all funds, 2020
// population 8,797, effective property-tax rate ~2.38% (≈ 24.5 mill). Line-item
// detail is realistic but illustrative. Sources:
//   presqueislemaine.gov 2026 Approved Budget; census.gov QuickFacts.
export const MUNICIPALITY = {
  name: 'City of Presque Isle',
  state: 'ME',
  fiscalYear: 'FY2026',
  population: 8797,
  millRate: 24.5, // per $1,000 of assessed value
  generalFundBudget: 5_800_000,
  allFundsBudget: 12_900_000,
  // Demo "today" — keeps generated content deterministic relative to the data.
  asOf: '2026-06-07',
  user: { name: 'Ben Caron', title: 'Finance / Front Counter', office: 'Presque Isle' },
};

export const RESIDENTS: Resident[] = [
  {
    id: 'R-1001',
    name: 'Harris Local Government',
    mailingAddress: '36 Park Street, Presque Isle, ME 04769',
    phone: '(207) 555-0142',
    email: 'ap@harrislg.example',
    language: 'en',
    utilityAccountId: 'U-5012',
    taxAccountId: 'T-3088',
  },
  {
    id: 'R-1002',
    name: 'Maria Delgado',
    mailingAddress: '14 Spruce Lane, Presque Isle, ME 04769',
    phone: '(207) 555-0188',
    email: 'mdelgado@example.com',
    language: 'es',
    utilityAccountId: 'U-5013',
    taxAccountId: 'T-3089',
  },
  {
    id: 'R-1003',
    name: 'Robert & Anne Thibodeau',
    mailingAddress: '7 Academy Street, Presque Isle, ME 04769',
    phone: '(207) 555-0119',
    email: 'rthibodeau@example.com',
    language: 'en',
    utilityAccountId: 'U-5014',
    taxAccountId: 'T-3090',
  },
  {
    id: 'R-1004',
    name: 'Northern Maine Realty LLC',
    mailingAddress: 'PO Box 220, Presque Isle, ME 04769',
    phone: '(207) 555-0203',
    email: 'billing@nmrealty.example',
    language: 'en',
    taxAccountId: 'T-3091',
  },
  {
    id: 'R-1005',
    name: 'Jean-Paul Ouellette',
    mailingAddress: '52 State Street, Presque Isle, ME 04769',
    phone: '(207) 555-0177',
    language: 'fr',
    utilityAccountId: 'U-5015',
    taxAccountId: 'T-3092',
  },
  { id: 'R-1006', name: 'Greenfield Apartments LLC', mailingAddress: '88 Main Street, Presque Isle, ME 04769', phone: '(207) 555-0220', language: 'en', utilityAccountId: 'U-5016' },
  { id: 'R-1007', name: 'Brian & Sara Levesque', mailingAddress: '21 Chapman Road, Presque Isle, ME 04769', phone: '(207) 555-0231', language: 'en', utilityAccountId: 'U-5017' },
  { id: 'R-1008', name: 'Aroostook Diner Inc', mailingAddress: '140 Main Street, Presque Isle, ME 04769', phone: '(207) 555-0244', language: 'en', utilityAccountId: 'U-5018' },
  { id: 'R-1009', name: 'Patricia Gagnon', mailingAddress: '9 Birch Street, Presque Isle, ME 04769', phone: '(207) 555-0259', language: 'en', utilityAccountId: 'U-5019' },
  { id: 'R-1010', name: 'Daniel Bouchard', mailingAddress: '33 Third Street, Presque Isle, ME 04769', phone: '(207) 555-0262', language: 'en', utilityAccountId: 'U-5020' },
  { id: 'R-1011', name: 'Kevin & Holly Michaud', mailingAddress: '5 Highland Avenue, Presque Isle, ME 04769', phone: '(207) 555-0274', language: 'en', utilityAccountId: 'U-5021' },
];

export const UTILITY_ACCOUNTS: UtilityAccount[] = [
  {
    id: 'U-5012',
    residentId: 'R-1001',
    serviceAddress: '36 Park Street',
    status: 'active',
    balance: 0,
    pastDueDays: 0,
    lastReadDate: '2026-05-28',
    usage: [
      { period: '2026-01', ccf: 9 },
      { period: '2026-02', ccf: 8 },
      { period: '2026-03', ccf: 9 },
      { period: '2026-04', ccf: 10 },
      { period: '2026-05', ccf: 9 },
    ],
  },
  {
    id: 'U-5013',
    residentId: 'R-1002',
    serviceAddress: '14 Spruce Lane',
    status: 'active',
    balance: 142.6,
    pastDueDays: 18,
    lastReadDate: '2026-05-27',
    usage: [
      { period: '2026-01', ccf: 6 },
      { period: '2026-02', ccf: 6 },
      { period: '2026-03', ccf: 7 },
      { period: '2026-04', ccf: 6 },
      { period: '2026-05', ccf: 41 }, // anomalous spike -> exception
    ],
  },
  {
    id: 'U-5014',
    residentId: 'R-1003',
    serviceAddress: '7 Academy Street',
    status: 'delinquent',
    balance: 318.45,
    pastDueDays: 64,
    lastReadDate: '2026-05-26',
    usage: [
      { period: '2026-01', ccf: 11 },
      { period: '2026-02', ccf: 12 },
      { period: '2026-03', ccf: 10 },
      { period: '2026-04', ccf: 11 },
      { period: '2026-05', ccf: 12 },
    ],
  },
  {
    id: 'U-5015',
    residentId: 'R-1005',
    serviceAddress: '52 State Street',
    status: 'final',
    balance: 27.9,
    pastDueDays: 0,
    lastReadDate: '2026-05-30',
    usage: [
      { period: '2026-02', ccf: 5 },
      { period: '2026-03', ccf: 5 },
      { period: '2026-04', ccf: 4 },
      { period: '2026-05', ccf: 2 }, // move-out, partial month
    ],
  },
  {
    id: 'U-5016', residentId: 'R-1006', serviceAddress: '88 Main Street (apartments)', status: 'active', balance: 0, pastDueDays: 0, lastReadDate: '2026-05-28',
    usage: [{ period: '2026-01', ccf: 58 }, { period: '2026-02', ccf: 61 }, { period: '2026-03', ccf: 59 }, { period: '2026-04', ccf: 62 }, { period: '2026-05', ccf: 60 }],
  },
  {
    id: 'U-5017', residentId: 'R-1007', serviceAddress: '21 Chapman Road', status: 'active', balance: 0, pastDueDays: 0, lastReadDate: '2026-05-27',
    usage: [{ period: '2026-01', ccf: 8 }, { period: '2026-02', ccf: 7 }, { period: '2026-03', ccf: 8 }, { period: '2026-04', ccf: 9 }, { period: '2026-05', ccf: 8 }],
  },
  {
    id: 'U-5018', residentId: 'R-1008', serviceAddress: '140 Main Street (diner)', status: 'active', balance: 213.75, pastDueDays: 12, lastReadDate: '2026-05-29',
    usage: [{ period: '2026-01', ccf: 92 }, { period: '2026-02', ccf: 88 }, { period: '2026-03', ccf: 95 }, { period: '2026-04', ccf: 97 }, { period: '2026-05', ccf: 94 }],
  },
  {
    id: 'U-5019', residentId: 'R-1009', serviceAddress: '9 Birch Street', status: 'delinquent', balance: 96.4, pastDueDays: 41, lastReadDate: '2026-05-26',
    usage: [{ period: '2026-01', ccf: 7 }, { period: '2026-02', ccf: 7 }, { period: '2026-03', ccf: 6 }, { period: '2026-04', ccf: 7 }, { period: '2026-05', ccf: 7 }],
  },
  {
    id: 'U-5020', residentId: 'R-1010', serviceAddress: '33 Third Street', status: 'active', balance: 0, pastDueDays: 0, lastReadDate: '2026-05-28',
    usage: [{ period: '2026-01', ccf: 10 }, { period: '2026-02', ccf: 11 }, { period: '2026-03', ccf: 9 }, { period: '2026-04', ccf: 10 }, { period: '2026-05', ccf: 10 }],
  },
  {
    id: 'U-5021', residentId: 'R-1011', serviceAddress: '5 Highland Avenue', status: 'active', balance: 0, pastDueDays: 0, lastReadDate: '2026-05-28',
    usage: [{ period: '2026-01', ccf: 10 }, { period: '2026-02', ccf: 11 }, { period: '2026-03', ccf: 9 }, { period: '2026-04', ccf: 10 }, { period: '2026-05', ccf: 0 }], // near-zero -> possible stopped meter / vacancy
  },
];

// Water/sewer rate schedule (per billing period).
export const RATE_SCHEDULE: RateSchedule = {
  waterBase: 28.5,
  sewerBase: 32.0,
  waterTiers: [
    { upToCcf: 10, perCcf: 4.2 },
    { upToCcf: 30, perCcf: 5.1 },
    { upToCcf: null, perCcf: 6.05 },
  ],
  sewerPerCcf: 5.8,
  effective: '2025-07-01',
};

export const TAX_ACCOUNTS: TaxAccount[] = [
  {
    id: 'T-3088',
    residentId: 'R-1001',
    parcelId: '04-B-12',
    assessedValue: 184000,
    annualTax: 3128,
    balance: 0,
    status: 'current',
    lastPayment: { date: '2026-04-22', amount: 1564 },
  },
  {
    id: 'T-3089',
    residentId: 'R-1002',
    parcelId: '06-A-04',
    assessedValue: 142500,
    annualTax: 2423,
    balance: 1211.5,
    status: 'current',
    lastPayment: { date: '2026-03-15', amount: 1211.5 },
  },
  {
    id: 'T-3090',
    residentId: 'R-1003',
    parcelId: '02-C-19',
    assessedValue: 167000,
    annualTax: 2839,
    balance: 2839,
    status: 'delinquent',
    lastPayment: { date: '2025-10-05', amount: 1419.5 },
  },
  {
    id: 'T-3091',
    residentId: 'R-1004',
    parcelId: '09-D-31',
    assessedValue: 410000,
    annualTax: 6970,
    balance: 6970,
    status: 'lien',
    lastPayment: { date: '2024-11-12', amount: 3485 },
  },
  {
    id: 'T-3092',
    residentId: 'R-1005',
    parcelId: '03-A-08',
    assessedValue: 121000,
    annualTax: 2057,
    balance: 0,
    status: 'current',
    lastPayment: { date: '2026-04-18', amount: 1028.5 },
  },
];

export const PARCELS: Parcel[] = [
  {
    id: '04-B-12',
    residentId: 'R-1001',
    situsAddress: '36 Park Street',
    landValue: 42000,
    buildingValue: 142000,
  },
  {
    id: '06-A-04',
    residentId: 'R-1002',
    situsAddress: '14 Spruce Lane',
    landValue: 38000,
    buildingValue: 104500,
    permitOpen: 'BP-2026-041 (deck addition)',
  },
  {
    id: '02-C-19',
    residentId: 'R-1003',
    situsAddress: '7 Academy Street',
    landValue: 45000,
    buildingValue: 122000,
  },
  {
    id: '09-D-31',
    residentId: 'R-1004',
    situsAddress: '120 Main Street',
    landValue: 160000,
    buildingValue: 250000,
    lastSale: { date: '2025-12-02', price: 455000 },
  },
];

export const RECEIPTS: Receipt[] = [
  { id: 'RC-9001', residentId: 'R-1001', date: '2026-06-05', module: 'Cash Receipts', description: 'Motor Vehicle — MVR3 20993897', amount: 159.88, tender: 'Cash' },
  { id: 'RC-9002', residentId: 'R-1002', date: '2026-06-04', module: 'Utility', description: 'Utility payment on account U-5013', amount: 80.0, tender: 'Check' },
  { id: 'RC-9003', residentId: 'R-1005', date: '2026-06-04', module: 'Tax', description: 'Property tax installment', amount: 1028.5, tender: 'Credit' },
  { id: 'RC-9004', residentId: 'R-1003', date: '2026-06-02', module: 'Cash Receipts', description: 'Dog license renewal', amount: 11.0, tender: 'Cash' },
  { id: 'RC-9005', date: '2026-06-02', module: 'Cash Receipts', description: 'Transfer station permit', amount: 25.0, tender: 'Cash' },
  { id: 'RC-9006', residentId: 'R-1003', date: '2026-06-06', module: 'Tax', description: 'Property tax — partial payment', amount: 500.0, tender: 'Check' },
  { id: 'RC-9007', residentId: 'R-1002', date: '2026-06-06', module: 'Cash Receipts', description: 'Building permit BP-2026-041 (deck)', amount: 75.0, tender: 'Credit' },
  { id: 'RC-9008', date: '2026-06-05', module: 'Cash Receipts', description: 'Vital records — birth certificate copy', amount: 15.0, tender: 'Cash' },
  { id: 'RC-9009', residentId: 'R-1004', date: '2026-06-03', module: 'Tax', description: 'Lien redemption — parcel 09-D-31', amount: 1500.0, tender: 'Check' },
  { id: 'RC-9010', residentId: 'R-1005', date: '2026-06-03', module: 'Utility', description: 'Utility final-bill payment U-5015', amount: 27.9, tender: 'Cash' },
  { id: 'RC-9011', date: '2026-06-03', module: 'Cash Receipts', description: 'Boat registration', amount: 47.0, tender: 'Credit' },
  { id: 'RC-9012', residentId: 'R-1001', date: '2026-06-01', module: 'Cash Receipts', description: 'Motor Vehicle re-registration', amount: 92.0, tender: 'Check' },
  { id: 'RC-9013', date: '2026-06-01', module: 'Cash Receipts', description: 'Dog license — new', amount: 11.0, tender: 'Cash' },
  { id: 'RC-9014', residentId: 'R-1002', date: '2026-05-29', module: 'Utility', description: 'Utility payment on account U-5013', amount: 60.0, tender: 'Credit' },
];

// Budgetary — FY2026 General Fund (~$5.8M), modeled on the City of Presque Isle.
// Year ~92% elapsed. A few lines are intentionally over/under for the agents.
export const BUDGET_LINES: BudgetLine[] = [
  // General Government
  { id: 'B-01', account: '01-4110-100', department: 'General Government', description: 'Mayor, Council & Boards', budget: 28000, actual: 22400, encumbered: 0 },
  { id: 'B-02', account: '01-4130-100', department: 'General Government', description: 'City Manager / Administration', budget: 232000, actual: 214000, encumbered: 0 },
  { id: 'B-03', account: '01-4140-100', department: 'Finance', description: 'Finance & Treasury', budget: 198000, actual: 182000, encumbered: 0 },
  { id: 'B-04', account: '01-4150-100', department: 'Clerk', description: 'City Clerk & Elections', budget: 138000, actual: 126000, encumbered: 4500 },
  { id: 'B-05', account: '01-4151-100', department: 'Assessing', description: 'Assessing', budget: 120000, actual: 109000, encumbered: 0 },
  { id: 'B-06', account: '01-4153-300', department: 'General Government', description: 'Legal & Professional Services', budget: 72000, actual: 78500, encumbered: 0 },
  { id: 'B-07', account: '01-4155-220', department: 'General Government', description: 'IT & Software Licensing', budget: 98000, actual: 118400, encumbered: 6500 },
  { id: 'B-08', account: '01-4196-520', department: 'General Government', description: 'Insurance & Risk', budget: 162000, actual: 162000, encumbered: 0 },
  // Public Safety
  { id: 'B-09', account: '01-4210-100', department: 'Police', description: 'Police Department', budget: 1395000, actual: 1286000, encumbered: 12000 },
  { id: 'B-10', account: '01-4215-100', department: 'Police', description: 'Dispatch / Communications', budget: 252000, actual: 231000, encumbered: 0 },
  { id: 'B-11', account: '01-4220-510', department: 'Fire', description: 'Fire & Ambulance — GF support', budget: 210000, actual: 210000, encumbered: 0 },
  { id: 'B-12', account: '01-4240-100', department: 'Code Enforcement', description: 'Code Enforcement & Health', budget: 94000, actual: 79000, encumbered: 0 },
  // Public Works
  { id: 'B-13', account: '01-4310-100', department: 'Public Works', description: 'Public Works & Highway', budget: 612000, actual: 561000, encumbered: 8000 },
  { id: 'B-14', account: '01-4312-380', department: 'Public Works', description: 'Winter Roads — Salt, Sand & OT', budget: 318000, actual: 372500, encumbered: 0 },
  { id: 'B-15', account: '01-4313-430', department: 'Public Works', description: 'Fleet Maintenance & Fuel', budget: 268000, actual: 251000, encumbered: 9500 },
  { id: 'B-16', account: '01-4320-360', department: 'Public Works', description: 'Street Lighting — Electricity', budget: 62000, actual: 56500, encumbered: 0 },
  { id: 'B-17', account: '01-4194-410', department: 'Public Works', description: 'Public Buildings & Grounds', budget: 158000, actual: 142000, encumbered: 5000 },
  { id: 'B-18', account: '01-4324-340', department: 'Public Works', description: 'Solid Waste & Recycling', budget: 132000, actual: 124000, encumbered: 0 },
  // Health, Welfare, Culture & Recreation
  { id: 'B-19', account: '01-4411-700', department: 'Health & Welfare', description: 'General Assistance', budget: 58000, actual: 41000, encumbered: 0 },
  { id: 'B-20', account: '01-4520-100', department: 'Recreation', description: 'Recreation & Parks', budget: 358000, actual: 196000, encumbered: 0 },
  { id: 'B-21', account: '01-4550-100', department: 'Library', description: 'Turner Memorial Library', budget: 332000, actual: 304000, encumbered: 0 },
  // Debt & Capital
  { id: 'B-22', account: '01-4710-900', department: 'Debt & Capital', description: 'Debt Service — Principal & Interest', budget: 372000, actual: 372000, encumbered: 0 },
  { id: 'B-23', account: '01-4900-800', department: 'Debt & Capital', description: 'Capital Reserve Transfers', budget: 131000, actual: 131000, encumbered: 0 },
];

// FY2026 General Fund revenues (~$5.8M to balance appropriations).
export const REVENUE_LINES: RevenueLine[] = [
  { id: 'R-01', account: '01-3010-000', source: 'Property tax commitment', budget: 3400000, actual: 3180000 },
  { id: 'R-02', account: '01-3020-000', source: 'Auto & boat excise tax', budget: 1150000, actual: 1062000 },
  { id: 'R-03', account: '01-3300-000', source: 'State revenue sharing', budget: 520000, actual: 480000 },
  { id: 'R-04', account: '01-3310-000', source: 'State road assistance (URIP)', budget: 95000, actual: 95000 },
  { id: 'R-05', account: '01-3320-000', source: 'Homestead & BETE reimbursement', budget: 210000, actual: 210000 },
  { id: 'R-06', account: '01-3400-000', source: 'Licenses, permits & fees', budget: 165000, actual: 151000 },
  { id: 'R-07', account: '01-3500-000', source: 'Interest, fines & miscellaneous', budget: 110000, actual: 104000 },
  { id: 'R-08', account: '01-3900-000', source: 'Transfer from fund balance / reserves', budget: 150000, actual: 0 },
];

export const EXCEPTIONS: Exception[] = [
  { id: 'X-1', module: 'Utility', severity: 'high', description: 'Account U-5013 (14 Spruce Lane) usage spiked to 41 CCF in May vs ~6 CCF baseline — probable leak or misread.', amount: undefined, relatedRecordId: 'U-5013', detectedAt: '2026-06-01' },
  { id: 'X-2', module: 'Tax', severity: 'high', description: 'Account T-3091 (Northern Maine Realty) in lien status; $6,970 outstanding, no payment since 2024-11-12.', amount: 6970, relatedRecordId: 'T-3091', detectedAt: '2026-06-01' },
  { id: 'X-3', module: 'Cash Receipts', severity: 'medium', description: 'Drawer for 2026-06-04 over by $12.00 vs posted receipts — needs reconciliation.', amount: 12.0, detectedAt: '2026-06-05' },
  { id: 'X-4', module: 'Payroll', severity: 'medium', description: 'Overtime on PW pay run 2026-06-05 is 38% above 12-period average; confirm storm-response coding.', amount: undefined, detectedAt: '2026-06-05' },
  { id: 'X-5', module: 'Tax', severity: 'low', description: 'Account T-3090 (7 Academy Street) delinquent 64 days; first lien notice window opens 2026-06-15.', amount: 2839, relatedRecordId: 'T-3090', detectedAt: '2026-06-03' },
  { id: 'X-6', module: 'Utility', severity: 'low', description: 'Final bill for U-5015 (52 State Street, move-out) of $27.90 unsent.', amount: 27.9, relatedRecordId: 'U-5015', detectedAt: '2026-06-02' },
];

export const INQUIRIES: Inquiry[] = [
  {
    id: 'IN-201',
    channel: 'phone',
    residentId: 'R-1002',
    contactName: 'Maria Delgado',
    receivedAt: '2026-06-06 09:12',
    subject: 'Water bill way higher than normal',
    body: 'My water bill this month is over $140 and it is usually around $40. Nothing changed at the house. Is this a mistake? I cannot pay this much right now.',
    status: 'new',
  },
  {
    id: 'IN-202',
    channel: 'email',
    residentId: 'R-1003',
    contactName: 'Robert Thibodeau',
    receivedAt: '2026-06-06 10:48',
    subject: 'Shutoff notice — can I make a payment plan?',
    body: 'I got a delinquency notice on my water account. I want to avoid a shutoff. Can I set up a payment arrangement and what do I owe in total including taxes?',
    status: 'new',
  },
  {
    id: 'IN-203',
    channel: 'walk-in',
    contactName: 'Walk-in resident',
    receivedAt: '2026-06-06 11:30',
    subject: 'How do I register my truck and what does it cost?',
    body: 'I just bought a used pickup and need to register it. What do I need to bring and roughly how much is it?',
    status: 'new',
  },
  {
    id: 'IN-204',
    channel: 'phone',
    residentId: 'R-1005',
    contactName: 'Jean-Paul Ouellette',
    receivedAt: '2026-06-05 15:05',
    subject: 'Closing utility account — moving out',
    body: 'Je déménage à la fin du mois. I am moving at the end of the month and need to close my water account at 52 State Street. What is my final balance?',
    status: 'new',
  },
  {
    id: 'IN-205',
    channel: 'email',
    residentId: 'R-1004',
    contactName: 'Northern Maine Realty LLC',
    receivedAt: '2026-06-05 16:40',
    subject: 'Tax lien letter received',
    body: 'We received a lien notice on parcel 09-D-31. Please confirm the total amount owed and how to resolve this before the tax sale.',
    status: 'new',
  },
];

export const KNOWLEDGE: KnowledgeArticle[] = [
  {
    id: 'KB-01',
    title: 'High water bill / possible leak',
    category: 'Utility Billing',
    keywords: ['water', 'bill', 'high', 'leak', 'usage', 'spike'],
    content:
      'When a resident reports an unusually high water bill, confirm the meter read on file, compare against prior usage, and check for continuous flow that may indicate a leak (commonly a running toilet). The Town can re-read the meter on request. If a leak is confirmed and repaired, the resident may apply for a one-time leak adjustment per the Utility Ordinance; provide the leak-adjustment form and require a copy of the repair receipt.',
    approvedBy: 'Utility Billing Manager',
    lastReviewed: '2026-03-01',
  },
  {
    id: 'KB-02',
    title: 'Payment arrangements and shutoff prevention',
    category: 'Utility Billing',
    keywords: ['payment', 'plan', 'arrangement', 'shutoff', 'delinquent', 'disconnect'],
    content:
      'Residents at risk of shutoff may request a payment arrangement before the disconnection date. Standard arrangements split the past-due balance over up to 3 months in addition to current charges, with the first installment due at signing. Arrangements must be set up in TRIO Utility Billing and require supervisor approval if the balance exceeds $300. A signed arrangement halts the shutoff process while payments are current.',
    approvedBy: 'Finance Director',
    lastReviewed: '2026-02-15',
  },
  {
    id: 'KB-03',
    title: 'Motor vehicle registration — requirements and fees',
    category: 'Motor Vehicles',
    keywords: ['register', 'registration', 'vehicle', 'truck', 'car', 'mvr3', 'excise'],
    content:
      'To register a vehicle, bring the title or previous registration, proof of insurance, and the bill of sale. Cost is excise tax (based on the vehicle MSRP and model year) plus state registration fees. Excise is calculated in TRIO Motor Vehicle when the MVR3 is generated; staff can quote an estimate from the vehicle details. Payment may be made by cash, check, or credit at the front counter.',
    approvedBy: 'Town Clerk',
    lastReviewed: '2026-01-20',
  },
  {
    id: 'KB-04',
    title: 'Closing a utility account (move-out / final bill)',
    category: 'Utility Billing',
    keywords: ['close', 'final', 'bill', 'move', 'moving', 'move-out', 'account'],
    content:
      'For a move-out, record the move-out date and obtain a final meter read. A final bill is generated in TRIO Utility Billing for usage through the move-out date plus any outstanding balance. Provide the forwarding address for the final bill and any deposit refund. Final balances are due within 30 days of the final bill date.',
    approvedBy: 'Utility Billing Manager',
    lastReviewed: '2026-03-01',
  },
  {
    id: 'KB-05',
    title: 'Property tax liens and tax sale process',
    category: 'Tax Collections',
    keywords: ['lien', 'tax', 'sale', 'delinquent', 'foreclosure', 'owed'],
    content:
      'Maine municipalities use the tax lien (matured tax lien) process for unpaid real estate taxes. After statutory notice, a lien certificate is recorded; if not redeemed within 18 months, the lien forecloses automatically. To resolve, the owner must pay the full lien amount including interest and costs. Confirm exact payoff figures with Tax Collections before quoting; do not waive interest without authorization.',
    approvedBy: 'Treasurer',
    lastReviewed: '2026-02-15',
  },
];

// ---- Clerk: meeting agenda + records requests --------------------------

export const NEXT_MEETING = {
  body: 'Town Council',
  date: '2026-06-15',
  noticeDueBy: '2026-06-11',
  location: 'Council Chambers, 12 Second Street',
};

export const AGENDA_SUBMISSIONS: AgendaSubmission[] = [
  { id: 'AG-01', department: 'Finance', title: 'FY2027 budget first reading', type: 'budget', submittedBy: 'B. Caron', receivedAt: '2026-06-04', needsVote: true },
  { id: 'AG-02', department: 'Public Works', title: 'Award salt/sand supply contract', type: 'contract', submittedBy: 'D. Plourde', receivedAt: '2026-06-05', needsVote: true },
  { id: 'AG-03', department: 'Administration', title: 'Reappoint planning board member', type: 'appointment', submittedBy: 'Town Manager', receivedAt: '2026-06-05', needsVote: true },
  { id: 'AG-04', department: 'Code Enforcement', title: 'Amend nuisance ordinance §7', type: 'ordinance', submittedBy: 'CEO', receivedAt: '2026-06-06', needsVote: true },
  { id: 'AG-05', department: 'Recreation', title: 'Summer program update (informational)', type: 'other', submittedBy: 'Rec Dir.', receivedAt: '2026-06-03', needsVote: false },
];

export const RECORDS_REQUESTS: RecordsRequest[] = [
  { id: 'FOAA-114', requester: 'Star-Herald (press)', receivedAt: '2026-06-02', dueBy: '2026-06-08', subject: 'Council meeting minutes & PW overtime records, Jan–May', status: 'in-progress', assignedTo: 'Clerk' },
  { id: 'FOAA-115', requester: 'Attorney — Levesque', receivedAt: '2026-05-28', dueBy: '2026-06-05', subject: 'Deed and tax history for parcel 09-D-31', status: 'overdue', assignedTo: 'Clerk' },
  { id: 'FOAA-116', requester: 'Resident — M. Delgado', receivedAt: '2026-06-06', dueBy: '2026-06-12', subject: 'Water billing records for 14 Spruce Lane', status: 'new' },
  { id: 'FOAA-117', requester: 'Northern Maine Realty LLC', receivedAt: '2026-06-06', dueBy: '2026-06-13', subject: 'Code enforcement file for 120 Main Street', status: 'new' },
];

// ---- Code Enforcement: cases ------------------------------------------

export const CODE_CASES: CodeCase[] = [
  { id: 'CE-2026-051', status: 'complaint', address: '22 Blake Street', type: 'Junk/debris', description: 'Neighbor complaint: accumulation of junk vehicles and debris in side yard.', openedAt: '2026-06-06', lastActivity: '2026-06-06', ageDays: 1 },
  { id: 'CE-2026-052', status: 'complaint', address: '9 Hardy Street', type: 'Tall grass/weeds', description: 'Online complaint: grass/weeds well over ordinance height limit.', openedAt: '2026-06-05', lastActivity: '2026-06-05', ageDays: 2 },
  { id: 'CE-2026-039', status: 'open', address: '120 Main Street', parcelId: '09-D-31', type: 'Unsafe structure', description: 'Vacant commercial building; broken windows and unsecured entry. Inspection needed.', openedAt: '2026-05-12', lastActivity: '2026-05-30', ageDays: 26 },
  { id: 'CE-2026-031', status: 'open', address: '7 Academy Street', parcelId: '02-C-19', type: 'Property maintenance', description: 'Peeling paint and failing porch rail; prior verbal notice given.', openedAt: '2026-04-28', lastActivity: '2026-05-20', ageDays: 40 },
  { id: 'CE-2026-018', status: 'notice-sent', address: '15 Chapman Road', type: 'Zoning', description: 'Home business exceeding permitted scope; formal notice sent, compliance deadline passed.', openedAt: '2026-03-30', lastActivity: '2026-05-18', ageDays: 69 },
];

// ---- Payroll: employees + current biweekly pay run -----------------------
// Municipal salaries are public record; names here are fictional. Pay amounts
// are computed from rate + hours (see payFor) rather than stored.

export const EMPLOYEES: Employee[] = [
  { id: 'E-100', name: 'Diane Levesque', department: 'Administration', position: 'City Manager', type: 'salary', rate: 116000, fte: 1, status: 'active', ytdGross: 96667 },
  { id: 'E-101', name: 'Ben Caron', department: 'Finance', position: 'Finance Director', type: 'salary', rate: 86000, fte: 1, status: 'active', ytdGross: 71667 },
  { id: 'E-102', name: 'Karen Michaud', department: 'Finance', position: 'Deputy Treasurer / Tax Collector', type: 'hourly', rate: 24.5, fte: 1, status: 'active', ytdGross: 42500 },
  { id: 'E-103', name: 'Lisa Pelletier', department: 'Clerk', position: 'City Clerk', type: 'salary', rate: 58000, fte: 1, status: 'active', ytdGross: 48333 },
  { id: 'E-104', name: 'Renee Cyr', department: 'Clerk', position: 'Deputy Clerk', type: 'hourly', rate: 20.0, fte: 1, status: 'active', ytdGross: 34667 },
  { id: 'E-105', name: 'David Soucy', department: 'Assessing', position: 'Assessor', type: 'salary', rate: 70000, fte: 1, status: 'active', ytdGross: 58333 },
  { id: 'E-106', name: 'Mark Bouchard', department: 'Code Enforcement', position: 'Code Enforcement Officer', type: 'salary', rate: 60000, fte: 1, status: 'active', ytdGross: 50000 },
  { id: 'E-107', name: 'Robert Gallagher', department: 'Police', position: 'Police Chief', type: 'salary', rate: 96000, fte: 1, status: 'active', ytdGross: 80000 },
  { id: 'E-108', name: 'Tyler Hebert', department: 'Police', position: 'Patrol Officer', type: 'hourly', rate: 28.5, fte: 1, status: 'active', ytdGross: 51480 },
  { id: 'E-109', name: 'Amy Dubois', department: 'Police', position: 'Patrol Officer', type: 'hourly', rate: 27.0, fte: 1, status: 'active', ytdGross: 47340 },
  { id: 'E-110', name: 'Sandra Ouellette', department: 'Police', position: 'Dispatcher', type: 'hourly', rate: 21.0, fte: 1, status: 'active', ytdGross: 36540 },
  { id: 'E-111', name: 'Paul Thibodeau', department: 'Public Works', position: 'Public Works Director', type: 'salary', rate: 80000, fte: 1, status: 'active', ytdGross: 66667 },
  { id: 'E-112', name: 'Gary Plourde', department: 'Public Works', position: 'Equipment Operator', type: 'hourly', rate: 23.0, fte: 1, status: 'active', ytdGross: 41400 },
  { id: 'E-113', name: 'Steve Albert', department: 'Public Works', position: 'Equipment Operator', type: 'hourly', rate: 22.5, fte: 1, status: 'active', ytdGross: 40500 },
  { id: 'E-114', name: 'Joanne Roy', department: 'Library', position: 'Library Director', type: 'salary', rate: 56000, fte: 1, status: 'active', ytdGross: 46667 },
  { id: 'E-115', name: 'Megan Bossie', department: 'Recreation', position: 'Recreation Director', type: 'salary', rate: 60000, fte: 1, status: 'active', ytdGross: 50000 },
];

export const PAY_RUN: PayRun = {
  id: 'PR-2026-12',
  periodStart: '2026-05-25',
  periodEnd: '2026-06-07',
  checkDate: '2026-06-12',
  frequency: 'Biweekly',
  status: 'open',
  lines: [
    { employeeId: 'E-100', regularHours: 80, otHours: 0 },
    { employeeId: 'E-101', regularHours: 80, otHours: 0 },
    { employeeId: 'E-102', regularHours: 80, otHours: 0 },
    { employeeId: 'E-103', regularHours: 80, otHours: 0 },
    { employeeId: 'E-104', regularHours: 80, otHours: 0 },
    { employeeId: 'E-105', regularHours: 80, otHours: 0 },
    { employeeId: 'E-106', regularHours: 80, otHours: 0 },
    { employeeId: 'E-107', regularHours: 80, otHours: 0 },
    { employeeId: 'E-108', regularHours: 80, otHours: 9 },
    { employeeId: 'E-109', regularHours: 80, otHours: 4 },
    { employeeId: 'E-110', regularHours: 80, otHours: 6 },
    { employeeId: 'E-111', regularHours: 80, otHours: 0 },
    { employeeId: 'E-112', regularHours: 80, otHours: 18 }, // storm response — flagged
    { employeeId: 'E-113', regularHours: 80, otHours: 14 }, // storm response — flagged
    { employeeId: 'E-114', regularHours: 80, otHours: 0 },
    { employeeId: 'E-115', regularHours: 80, otHours: 0 },
  ],
};

const DEDUCTION_RATE = 0.3; // est. withholding + FICA + MainePERS + benefits

/** Gross pay for an employee on a pay-run line (salary = annual/26). */
export function grossFor(emp: Employee, line: PayRunLine): number {
  if (emp.type === 'salary') return emp.rate / 26;
  return line.regularHours * emp.rate + line.otHours * emp.rate * 1.5;
}

export function otCostFor(emp: Employee, line: PayRunLine): number {
  return emp.type === 'hourly' ? line.otHours * emp.rate * 1.5 : 0;
}

/** Gross / deductions / net for a pay-run line. */
export function payFor(emp: Employee, line: PayRunLine): { gross: number; deductions: number; net: number } {
  const gross = grossFor(emp, line);
  const deductions = gross * DEDUCTION_RATE;
  return { gross, deductions, net: gross - deductions };
}

// ---- Utility billing helpers ---------------------------------------------

/** Estimated water+sewer bill for a given period consumption (CCF). */
export function estimateBill(ccf: number): number {
  const r = RATE_SCHEDULE;
  let water = r.waterBase;
  let remaining = ccf;
  let prevCap = 0;
  for (const tier of r.waterTiers) {
    const cap = tier.upToCcf ?? Infinity;
    const inTier = Math.max(0, Math.min(remaining, cap - prevCap));
    water += inTier * tier.perCcf;
    remaining -= inTier;
    prevCap = cap;
    if (remaining <= 0) break;
  }
  const sewer = r.sewerBase + ccf * r.sewerPerCcf;
  return Math.round((water + sewer) * 100) / 100;
}

/** Average prior-period consumption (excludes the latest read). */
export function utilityBaseline(acct: UtilityAccount): number {
  const prior = acct.usage.slice(0, -1);
  if (prior.length === 0) return acct.usage[0]?.ccf ?? 0;
  return prior.reduce((s, u) => s + u.ccf, 0) / prior.length;
}

/** Flag a usage anomaly vs the account's own baseline (skips move-out/final). */
export function utilityFlag(acct: UtilityAccount): 'high' | 'low' | null {
  if (acct.status === 'final') return null;
  const last = acct.usage[acct.usage.length - 1]?.ccf ?? 0;
  const base = utilityBaseline(acct);
  if (base <= 0) return null;
  if (last >= base * 3) return 'high';
  if (base >= 4 && last <= base * 0.25) return 'low';
  return null;
}
