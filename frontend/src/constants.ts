export const MACRO_DISTRIBUTIONS = {
    balanced: { name: 'Balanced', p: 0.30, c: 0.40, f: 0.30, label: '30/40/30' },
    low_carb: { name: 'Low Carb', p: 0.40, c: 0.20, f: 0.40, label: '40/20/40' },
    high_protein: { name: 'High Protein', p: 0.50, c: 0.25, f: 0.25, label: '50/25/25' },
    keto: { name: 'Keto-Style', p: 0.25, c: 0.05, f: 0.70, label: '25/5/70' }
};

export type MacroDistType = keyof typeof MACRO_DISTRIBUTIONS;
