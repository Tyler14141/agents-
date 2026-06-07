import type {
  AgendaSubmission,
  BudgetLine,
  CodeCase,
  Exception,
  Inquiry,
  KnowledgeArticle,
  Parcel,
  Receipt,
  RecordsRequest,
  Resident,
  TaxAccount,
  UtilityAccount,
} from '../types';

// ---------------------------------------------------------------------------
// Mock systems of record for the Town of Presque Isle (matching the TRIO Web
// screenshots: Harris Local Government, Presque Isle, ME). All figures are
// fabricated for demonstration.
// ---------------------------------------------------------------------------

export const MUNICIPALITY = {
  name: 'Town of Presque Isle',
  state: 'ME',
  fiscalYear: 'FY2026',
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
];

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
];

// Budgetary — selected General Fund lines with budget-to-actual at ~92% of FY.
export const BUDGET_LINES: BudgetLine[] = [
  { id: 'B-1', account: '01-4150-110', department: 'Administration', description: 'Salaries — Full Time', budget: 412000, actual: 379400, encumbered: 0 },
  { id: 'B-2', account: '01-4150-220', department: 'Administration', description: 'Software & Licensing', budget: 38000, actual: 51200, encumbered: 2400 },
  { id: 'B-3', account: '01-4220-430', department: 'Public Works', description: 'Vehicle Repair & Maintenance', budget: 95000, actual: 121800, encumbered: 6500 },
  { id: 'B-4', account: '01-4220-262', department: 'Public Works', description: 'Fuel — Diesel & Gas', budget: 78000, actual: 69400, encumbered: 0 },
  { id: 'B-5', account: '01-4130-340', department: 'Finance', description: 'Audit & Professional Services', budget: 42000, actual: 41100, encumbered: 0 },
  { id: 'B-6', account: '01-4910-810', department: 'Recreation', description: 'Program Supplies', budget: 22000, actual: 9800, encumbered: 0 },
  { id: 'B-7', account: '01-4240-291', department: 'Code Enforcement', description: 'Training & Certification', budget: 6000, actual: 1200, encumbered: 0 },
  { id: 'B-8', account: '01-4320-360', department: 'Utilities', description: 'Street Lighting — Electricity', budget: 64000, actual: 58900, encumbered: 0 },
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
