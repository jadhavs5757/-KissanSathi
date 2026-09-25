import { query } from '../../config/database.js';

export async function seedSchemes() {
  console.log('🌱 Seeding verified government schemes...');

  const schemes = [
    {
      name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      description: 'Comprehensive crop insurance coverage against non-preventable natural risks from pre-sowing to post-harvest stages.',
      eligibility_summary: 'All farmers growing notified crops in notified areas including sharecroppers and tenant farmers. Both loanee and non-loanee farmers are eligible.',
      required_documents: JSON.stringify([
        'Aadhaar Card',
        'Land Ownership Documents (7/12 extract, Patta / Record of Rights) or Tenant Agreement',
        'Bank Account Passbook / Statement',
        'Sowing Certificate / Declaration from local Patwari/Revenue officer'
      ]),
      application_route: 'Apply via National Crop Insurance Portal (pmfby.gov.in), Common Service Centers (CSC), designated commercial/cooperative banks, or Agriculture Department office.',
      official_source_url: 'https://pmfby.gov.in',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-01-15T00:00:00Z').toISOString()
    },
    {
      name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
      description: 'Direct income support of ₹6,000 per year in three equal instalments of ₹2,000 to all landholding farmer families across the country.',
      eligibility_summary: 'All landholding farmer families who hold cultivable land in their names. Subject to exclusion criteria like institutional landholders, income tax payees, and constitutional post holders.',
      required_documents: JSON.stringify([
        'Aadhaar Card (e-KYC mandatory)',
        'Landholding documents proving land registry',
        'Active bank account linked with Aadhaar (NPCI mapped)',
        'Active mobile number'
      ]),
      application_route: 'Direct self-registration at pmkisan.gov.in (Farmer Corner) or nearest CSC center and State Nodal Officer.',
      official_source_url: 'https://pmkisan.gov.in',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-02-01T00:00:00Z').toISOString()
    },
    {
      name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY - Per Drop More Crop)',
      description: 'Promotes micro-irrigation systems (drip and sprinkler) with 45% to 55% government subsidy to maximize water use efficiency.',
      eligibility_summary: 'All farmers owning agricultural land with access to a water source. Small and marginal farmers receive higher subsidy rates (up to 55%).',
      required_documents: JSON.stringify([
        'Identity and Address proof (Aadhaar Card)',
        'Land ownership document (RoR / Patta / 7/12)',
        'Water source proof (Borewell / Well / Canal permission)',
        'Electricity connection bill or NOC for solar pump',
        'Bank account details'
      ]),
      application_route: 'State Agriculture or Horticulture Department portal or District Horticulture Office.',
      official_source_url: 'https://pmksy.gov.in',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-01-10T00:00:00Z').toISOString()
    },
    {
      name: 'Kisan Credit Card (KCC) Scheme',
      description: 'Provides timely and adequate credit at subsidized interest rates (effective 4% per annum upon prompt repayment) for cultivation, farm inputs, and maintenance.',
      eligibility_summary: 'Individual/joint borrowers who are owner-cultivators, tenant farmers, oral lessees, sharecroppers, and SHGs/JLGs of farmers.',
      required_documents: JSON.stringify([
        'Duly completed KCC application form',
        'Identity & Address proof (Aadhaar, Voter ID, PAN)',
        'Land record documents verified by revenue official',
        'Cropping pattern details (crops cultivated and acreage)'
      ]),
      application_route: 'Apply at any commercial bank, Regional Rural Bank (RRB), Cooperative Bank, or via PM-KISAN portal (One Page KCC Form).',
      official_source_url: 'https://myscheme.gov.in/schemes/kcc',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-02-10T00:00:00Z').toISOString()
    },
    {
      name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
      description: 'Financial assistance and subsidies (40% to 50%) for purchasing farm machinery, tractors, power tillers, rotavators, and setting up Custom Hiring Centers.',
      eligibility_summary: 'Farmers across all categories with priority given to small, marginal, women, and SC/ST farmers.',
      required_documents: JSON.stringify([
        'Aadhaar Card',
        'Land records (Patta / Khatauni)',
        'Bank passbook photocopy',
        'Category certificate (for SC/ST where applicable)'
      ]),
      application_route: 'Online application through agrimachinery.nic.in (SMAM portal) or District Agriculture / Engineering Department.',
      official_source_url: 'https://agrimachinery.nic.in',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-01-20T00:00:00Z').toISOString()
    },
    {
      name: 'Paramparagat Krishi Vikas Yojana (PKVY)',
      description: 'Support for organic farming through adoption of organic village clusters and PGS (Participatory Guarantee System) certification, with financial assistance of ₹50,000/ha over 3 years.',
      eligibility_summary: 'Farmers willing to form organic farming clusters (minimum 20 hectares or 50 farmers per cluster) and commit to chemical-free farming.',
      required_documents: JSON.stringify([
        'Aadhaar Card',
        'Cluster Farmer Group registration document',
        'Land record details',
        'Bank account details of group/individual'
      ]),
      application_route: 'State Agriculture Department, District Agriculture Office, or Jaivikkheti portal (jaivikkheti.in).',
      official_source_url: 'https://pgsindia-ncof.gov.in',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-01-18T00:00:00Z').toISOString()
    },
    {
      name: 'National Mission on Edible Oils - Oilseeds & Oil Palm (NMEO)',
      description: 'Financial assistance for seed kits, cluster demonstrations, micro-irrigation, and intercropping inputs to boost domestic oilseed production (Mustard, Groundnut, Soybean, Sunflower).',
      eligibility_summary: 'Farmers cultivating oilseed crops in identified districts and agro-climatic zones.',
      required_documents: JSON.stringify([
        'Aadhaar Card',
        'Land records',
        'Sowing report/certificate',
        'Bank account details'
      ]),
      application_route: 'Local Block Agriculture Officer, Krishi Vigyan Kendra (KVK), or State Department of Agriculture.',
      official_source_url: 'https://nmeo.dac.gov.in',
      verification_status: 'VERIFIED',
      last_verified_at: new Date('2025-01-25T00:00:00Z').toISOString()
    }
  ];

  for (const s of schemes) {
    const existing = await query('SELECT id FROM scheme_records WHERE name = $1', [s.name]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO scheme_records 
          (name, description, eligibility_summary, required_documents, application_route, official_source_url, verification_status, last_verified_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
        [
          s.name,
          s.description,
          s.eligibility_summary,
          s.required_documents,
          s.application_route,
          s.official_source_url,
          s.verification_status,
          s.last_verified_at
        ]
      );
    }
  }

  console.log(`✅ Seeded ${schemes.length} verified government schemes.`);
}

if (process.argv[1]?.includes('seedSchemes.js')) {
  seedSchemes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
