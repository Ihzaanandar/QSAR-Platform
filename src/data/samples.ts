import { SampleDatasetInfo } from '../types/dataset';

export const SAMPLE_DATASETS: (SampleDatasetInfo & { content: string })[] = [
  {
    id: 'kinase_inhibitors',
    name: 'Kinase Inhibitors Dataset (Valid)',
    description: 'Dataset molekuler valid berisi senyawa inhibitor kinase beserta deskriptor fisikokimia (MW, LogP, HBD, HBA) dan bioaktivitas (pIC50).',
    rows: 15,
    columns: 7,
    category: 'valid',
    filename: 'kinase_inhibitors_sample.csv',
    content: `compound_id,smiles,molecular_weight,log_p,hbd,hba,activity_pIC50
CMP_001,CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5,539.67,3.92,2,7,8.45
CMP_002,CS(=O)(=O)CC1=CC=C(O1)C2=CC3=C(C=C2)N=CN=C3NC4=CC(=C(C=C4)OCC5=CC(=CC=C5)F)Cl,581.06,4.71,1,6,7.82
CMP_003,CCOC(=O)C1=C(NC(=C(C1C2=CC=C(C=C2)Cl)C(=O)OC)C)C,347.80,3.15,1,4,6.20
CMP_004,CN1CCN(CC1)CC2=CC=C(C=C2)C(=O)NC3=CC(=C(C=C3)C)C4=NC5=C(N4)C=C(C=C5)OC,470.57,3.34,2,6,8.10
CMP_005,C1CC1C(=O)NC2=CC=C(C=C2)C3=C4C(=NC=N3)N(C=C4)C5CCCC5,348.40,2.89,1,4,6.95
CMP_006,CC(C)(C)C1=CC(=NO1)NC(=O)NC2=CC=C(C=C2)C3=CC4=C(C=C3)C(=NN4)C5=CC=NC=C5,466.54,4.21,2,5,7.60
CMP_007,CNC(=O)C1=CC=CC=C1SC2=CC3=C(C=C2)C(=NN3)C4=CC=C(C=C4)N,374.46,2.65,2,4,7.15
CMP_008,CC1=C(C(=NO1)C)C2=CC=C(C=C2)S(=O)(=O)NC3=NC=C(C=C3)Cl,363.82,2.44,1,5,5.90
CMP_009,C1CNCCC1NC(=O)C2=CC=C(C=C2)C3=CC=CC=C3Cl,314.81,3.48,2,2,6.50
CMP_010,COC1=C(C=C2C(=C1)N=CN=C2NC3=CC(=C(C=C3)F)Cl)OCCCN4CCOCC4,446.90,3.22,1,6,8.30
CMP_011,CC1=CN=C(C(=N1)C2=CC=CC=C2)NC3=CC=C(C=C3)S(=O)(=O)N,326.37,1.80,2,4,6.10
CMP_012,C1=CC=C(C(=C1)C2=NC=C(N2)C3=CC=C(C=C3)NC(=O)C4CC4)F,321.35,3.05,2,3,7.40
CMP_013,CCN(CC)CCNC(=O)C1=C(NC(=C1C)C=C2C3=C(C=CC=C3)NC2=O)C,398.54,2.98,2,3,7.95
CMP_014,CC1=CC(=C(C(=C1)C)C2=NC(=NC(=C2)N)NC3=CC(=CC(=C3)Cl)Cl)C,347.24,3.85,3,3,6.75
CMP_015,CC1=CC=C(C=C1)C2=C(C(=O)N(C2=O)C3=CC=C(C=C3)S(=O)(=O)N)C4=CC=CC=C4,392.43,2.15,1,5,5.80`
  },
  {
    id: 'bioactivity_descriptors',
    name: 'Molecular Descriptors (Dengan Missing & Duplicate)',
    description: 'Dataset molekuler untuk menguji status peringatan (valid with warnings): memiliki beberapa sel kosong (missing) dan baris duplikat.',
    rows: 12,
    columns: 6,
    category: 'warning',
    filename: 'molecular_descriptors_warnings.csv',
    content: `mol_id,smiles,logP,tpsa,num_rotatable_bonds,pic50_activity
MOL_101,CC(=O)Oc1ccccc1C(=O)O,1.19,63.60,3,4.2
MOL_102,CC(C)Cc1ccc(cc1)C(C)C(=O)O,3.50,37.30,4,5.1
MOL_103,CN1C=NC2=C1C(=O)N(C(=O)N2C)C,0.16,58.44,0,3.8
MOL_104,CC(=O)NC1=CC=C(C=C1)O,0.46,49.33,1,4.0
MOL_105,CCN(CC)C(=O)C1CN(C2CC3=CNC4=CC=CC(=C34)C2=C1)C,2.80,,5,6.3
MOL_106,CC(C)NCC(O)COC1=CC=C(C=C1)CC(=O)N,0.10,72.47,,5.9
MOL_107,CC(C)NCC(O)COC1=CC=C(C=C1)CC(=O)N,0.10,72.47,,5.9
MOL_108,C1=CC=C(C=C1)C(=O)NO,-0.12,49.33,1,
MOL_109,CN1C2CCC1C(C(C2)OC(=O)C3=CC=CC=C3)C(=O)OC,2.30,52.93,4,7.2
MOL_110,CN1C2CCC1C(C(C2)OC(=O)C3=CC=CC=C3)C(=O)OC,2.30,52.93,4,7.2
MOL_111,C1=CC(=C(C=C1Cl)Cl)C(C2=CC(=C(C=C2)Cl)Cl)C(Cl)(Cl)Cl,6.91,0.00,2,3.1
MOL_112,c1ccc2c(c1)ccc3c2ccc4c5ccccc5ccc43,5.68,0.00,0,4.7`
  },
  {
    id: 'malformed_structure',
    name: 'Invalid Dataset (Struktur Rusak / Hard Error)',
    description: 'File CSV dengan format rusak (inconsistent field counts, header kosong, dan baris tidak valid) untuk menguji penanganan error.',
    rows: 4,
    columns: 0,
    category: 'error',
    filename: 'invalid_malformed_test.csv',
    content: `compound_id,,activity
C001,0.12,1.45,extra_unmatched_column_here
C002
C003,"broken quote without closing
C004,0.11`
  }
];
