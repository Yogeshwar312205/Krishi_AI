/**
 * Comprehensive list of Maharashtra APMC markets and major towns.
 * Frontend copy of backend/src/data/mandiList.js
 * 
 * Used in buyer posting forms and location selection dropdowns.
 * Provides 150+ markets organized by district for easy navigation.
 */

export const MAHARASHTRA_MANDIS = [
  // Mumbai & Konkan Region
  { value: 'Mumbai APMC', label: 'Mumbai APMC (Vashi, Navi Mumbai)', district: 'Mumbai' },
  { value: 'Mumbai Fruit Market APMC', label: 'Mumbai Fruit Market APMC', district: 'Mumbai' },
  { value: 'Mumbai Onion & Potato Market APMC', label: 'Mumbai Onion & Potato Market APMC', district: 'Mumbai' },
  { value: 'Kalyan APMC', label: 'Kalyan APMC', district: 'Thane' },
  { value: 'Panvel APMC', label: 'Panvel APMC', district: 'Raigad' },
  { value: 'Pen APMC', label: 'Pen APMC', district: 'Raigad' },
  { value: 'Alibag APMC', label: 'Alibag APMC', district: 'Raigad' },
  { value: 'Vasai APMC', label: 'Vasai APMC', district: 'Palghar' },
  { value: 'Dahanu APMC', label: 'Dahanu APMC', district: 'Palghar' },
  { value: 'Ratnagiri APMC', label: 'Ratnagiri (Nachane) APMC', district: 'Ratnagiri' },

  // Pune Region
  { value: 'Pune APMC', label: 'Pune APMC (Gultekdi)', district: 'Pune' },
  { value: 'Pune Moshi APMC', label: 'Pune (Moshi) APMC', district: 'Pune' },
  { value: 'Pune Manjri APMC', label: 'Pune (Manjri) APMC', district: 'Pune' },
  { value: 'Pune Khadki APMC', label: 'Pune (Khadki) APMC', district: 'Pune' },
  { value: 'Pune Pimpri APMC', label: 'Pune (Pimpri) APMC', district: 'Pune' },
  { value: 'Baramati APMC', label: 'Baramati APMC', district: 'Pune' },
  { value: 'Manchar APMC', label: 'Manchar APMC', district: 'Pune' },
  { value: 'Khed APMC', label: 'Khed (Rajgurunagar) APMC', district: 'Pune' },
  { value: 'Khed Chakan APMC', label: 'Khed (Chakan) APMC', district: 'Pune' },
  { value: 'Junnar Narayangaon APMC', label: 'Junnar (Narayangaon) APMC', district: 'Pune' },
  { value: 'Junnar Otur APMC', label: 'Junnar (Otur) APMC', district: 'Pune' },
  { value: 'Shirur APMC', label: 'Shirur APMC', district: 'Pune' },
  { value: 'Indapur APMC', label: 'Indapur APMC', district: 'Pune' },
  { value: 'Daund APMC', label: 'Daund APMC', district: 'Pune' },
  { value: 'Saswad APMC', label: 'Saswad APMC', district: 'Pune' },
  { value: 'Bhor APMC', label: 'Bhor APMC', district: 'Pune' },

  // Nashik Region
  { value: 'Nashik APMC', label: 'Nashik APMC (Main Mandi)', district: 'Nashik' },
  { value: 'Nashik Devlali APMC', label: 'Nashik (Devlali) APMC', district: 'Nashik' },
  { value: 'Lasalgaon APMC', label: 'Lasalgaon (Niphad) APMC', district: 'Nashik' },
  { value: 'Pimpalgaon Baswant APMC', label: 'Pimpalgaon Baswant APMC', district: 'Nashik' },
  { value: 'Pimpalgaon Saykheda APMC', label: 'Pimpalgaon Baswant (Saykheda) APMC', district: 'Nashik' },
  { value: 'Manmad APMC', label: 'Manmad APMC', district: 'Nashik' },
  { value: 'Yeola APMC', label: 'Yeola APMC', district: 'Nashik' },
  { value: 'Sinner APMC', label: 'Sinner APMC', district: 'Nashik' },
  { value: 'Satana APMC', label: 'Satana APMC', district: 'Nashik' },
  { value: 'Malegaon APMC', label: 'Malegaon APMC', district: 'Nashik' },
  { value: 'Nandgaon APMC', label: 'Nandgaon APMC', district: 'Nashik' },
  { value: 'Devala APMC', label: 'Devala APMC', district: 'Nashik' },
  { value: 'Chandwad APMC', label: 'Chandwad APMC', district: 'Nashik' },
  { value: 'Ghoti APMC', label: 'Ghoti APMC', district: 'Nashik' },
  { value: 'Kalwan APMC', label: 'Kalwan APMC', district: 'Nashik' },
  { value: 'Dindori APMC', label: 'Dindori APMC', district: 'Nashik' },

  // Nagpur & Vidarbha Region
  { value: 'Nagpur APMC', label: 'Nagpur APMC (Kalamna)', district: 'Nagpur' },
  { value: 'Kamthi APMC', label: 'Kamthi APMC', district: 'Nagpur' },
  { value: 'Hingna APMC', label: 'Hingna APMC', district: 'Nagpur' },
  { value: 'Kalmeshwar APMC', label: 'Kalmeshwar APMC', district: 'Nagpur' },
  { value: 'Ramtek APMC', label: 'Ramtek APMC', district: 'Nagpur' },
  { value: 'Katol APMC', label: 'Katol APMC', district: 'Nagpur' },
  { value: 'Savner APMC', label: 'Savner APMC', district: 'Nagpur' },
  { value: 'Umred APMC', label: 'Umred APMC', district: 'Nagpur' },
  { value: 'Amravati APMC', label: 'Amravati (Fruit & Veg Market) APMC', district: 'Amravati' },
  { value: 'Chandur Bazar APMC', label: 'Chandur Bazar APMC', district: 'Amravati' },
  { value: 'Achalpur APMC', label: 'Achalpur APMC', district: 'Amravati' },
  { value: 'Daryapur APMC', label: 'Daryapur APMC', district: 'Amravati' },
  { value: 'Morshi APMC', label: 'Morshi APMC', district: 'Amravati' },
  { value: 'Akola APMC', label: 'Akola APMC', district: 'Akola' },
  { value: 'Murtizapur APMC', label: 'Murtizapur APMC', district: 'Akola' },
  { value: 'Akot APMC', label: 'Akot APMC', district: 'Akola' },
  { value: 'Balapur APMC', label: 'Balapur APMC', district: 'Akola' },
  { value: 'Wardha APMC', label: 'Wardha APMC', district: 'Wardha' },
  { value: 'Hinganghat APMC', label: 'Hinganghat APMC', district: 'Wardha' },
  { value: 'Arvi APMC', label: 'Arvi APMC', district: 'Wardha' },
  { value: 'Chandrapur APMC', label: 'Chandrapur (Ganjwad) APMC', district: 'Chandrapur' },
  { value: 'Warora APMC', label: 'Warora APMC', district: 'Chandrapur' },

  // Marathwada Region
  { value: 'Chhatrapati Sambhajinagar APMC', label: 'Chhatrapati Sambhajinagar APMC (Aurangabad)', district: 'Chhatrapati Sambhajinagar' },
  { value: 'Gangapur APMC', label: 'Gangapur APMC', district: 'Chhatrapati Sambhajinagar' },
  { value: 'Paithan APMC', label: 'Paithan APMC', district: 'Chhatrapati Sambhajinagar' },
  { value: 'Sillod APMC', label: 'Sillod APMC', district: 'Chhatrapati Sambhajinagar' },
  { value: 'Jalna APMC', label: 'Jalna APMC', district: 'Jalna' },
  { value: 'Gevrai APMC', label: 'Gevrai APMC', district: 'Beed' },
  { value: 'Partur APMC', label: 'Partur APMC', district: 'Jalna' },
  { value: 'Beed APMC', label: 'Beed APMC', district: 'Beed' },
  { value: 'Ambejogai APMC', label: 'Ambejogai APMC', district: 'Beed' },
  { value: 'Parli APMC', label: 'Parli APMC', district: 'Beed' },
  { value: 'Dharashiv APMC', label: 'Dharashiv APMC (Osmanabad)', district: 'Dharashiv' },
  { value: 'Tuljapur APMC', label: 'Tuljapur APMC', district: 'Dharashiv' },
  { value: 'Latur APMC', label: 'Latur APMC', district: 'Latur' },
  { value: 'Ausa APMC', label: 'Ausa APMC', district: 'Latur' },
  { value: 'Udgir APMC', label: 'Udgir APMC', district: 'Latur' },
  { value: 'Nanded APMC', label: 'Nanded APMC', district: 'Nanded' },
  { value: 'Bhokar APMC', label: 'Bhokar APMC', district: 'Nanded' },
  { value: 'Parbhani APMC', label: 'Parbhani APMC', district: 'Parbhani' },
  { value: 'Hingoli APMC', label: 'Hingoli APMC', district: 'Hingoli' },

  // North Maharashtra (Khandesh)
  { value: 'Jalgaon APMC', label: 'Jalgaon APMC', district: 'Jalgaon' },
  { value: 'Bhusaval APMC', label: 'Bhusaval APMC', district: 'Jalgaon' },
  { value: 'Pachora APMC', label: 'Pachora APMC', district: 'Jalgaon' },
  { value: 'Chalisgaon APMC', label: 'Chalisgaon APMC', district: 'Jalgaon' },
  { value: 'Amalner APMC', label: 'Amalner APMC', district: 'Jalgaon' },
  { value: 'Raver APMC', label: 'Raver APMC', district: 'Jalgaon' },
  { value: 'Dhule APMC', label: 'Dhule APMC', district: 'Dhule' },
  { value: 'Shirpur APMC', label: 'Shirpur APMC', district: 'Dhule' },
  { value: 'Sakri APMC', label: 'Sakri APMC', district: 'Dhule' },
  { value: 'Nandurbar APMC', label: 'Nandurbar APMC', district: 'Nandurbar' },
  { value: 'Shahada APMC', label: 'Shahada APMC', district: 'Nandurbar' },

  // Ahilyanagar (Ahmednagar)
  { value: 'Ahilyanagar APMC', label: 'Ahilyanagar APMC (Ahmednagar)', district: 'Ahilyanagar' },
  { value: 'Rahata APMC', label: 'Rahata APMC', district: 'Ahilyanagar' },
  { value: 'Rahuri APMC', label: 'Rahuri APMC', district: 'Ahilyanagar' },
  { value: 'Shrirampur APMC', label: 'Shrirampur APMC', district: 'Ahilyanagar' },
  { value: 'Sangamner APMC', label: 'Sangamner APMC', district: 'Ahilyanagar' },
  { value: 'Kopargaon APMC', label: 'Kopargaon APMC', district: 'Ahilyanagar' },
  { value: 'Shevgaon APMC', label: 'Shevgaon APMC', district: 'Ahilyanagar' },
  { value: 'Jamkhed APMC', label: 'Jamkhed APMC', district: 'Ahilyanagar' },
  { value: 'Newasa APMC', label: 'Newasa APMC', district: 'Ahilyanagar' },
  { value: 'Parner APMC', label: 'Parner APMC', district: 'Ahilyanagar' },

  // Western Maharashtra
  { value: 'Solapur APMC', label: 'Solapur APMC (Shri Siddheshwar)', district: 'Solapur' },
  { value: 'Akluj APMC', label: 'Akluj APMC', district: 'Solapur' },
  { value: 'Barshi APMC', label: 'Barshi APMC', district: 'Solapur' },
  { value: 'Pandharpur APMC', label: 'Pandharpur APMC', district: 'Solapur' },
  { value: 'Sangole APMC', label: 'Sangole APMC', district: 'Solapur' },
  { value: 'Satara APMC', label: 'Satara APMC', district: 'Satara' },
  { value: 'Karad APMC', label: 'Karad APMC', district: 'Satara' },
  { value: 'Patan APMC', label: 'Patan APMC', district: 'Satara' },
  { value: 'Wai APMC', label: 'Wai APMC', district: 'Satara' },
  { value: 'Phaltan APMC', label: 'Phaltan APMC', district: 'Satara' },
  { value: 'Koregaon APMC', label: 'Koregaon APMC', district: 'Satara' },
  { value: 'Sangli APMC', label: 'Sangli (Phale, Vegetable Market) APMC', district: 'Sangli' },
  { value: 'Islampur APMC', label: 'Islampur APMC', district: 'Sangli' },
  { value: 'Tasgaon APMC', label: 'Tasgaon APMC', district: 'Sangli' },
  { value: 'Vita APMC', label: 'Vita APMC', district: 'Sangli' },
  { value: 'Palus APMC', label: 'Palus APMC', district: 'Sangli' },
  { value: 'Kolhapur APMC', label: 'Kolhapur APMC', district: 'Kolhapur' },
  { value: 'Ichalkaranji APMC', label: 'Ichalkaranji APMC', district: 'Kolhapur' },
  { value: 'Gadhinglaj APMC', label: 'Gadhinglaj APMC', district: 'Kolhapur' },

  // Buldhana & Washim
  { value: 'Buldhana APMC', label: 'Buldhana APMC', district: 'Buldhana' },
  { value: 'Malkapur APMC', label: 'Malkapur APMC', district: 'Buldhana' },
  { value: 'Khamgaon APMC', label: 'Khamgaon APMC', district: 'Buldhana' },
  { value: 'Mehkar APMC', label: 'Mehkar APMC', district: 'Buldhana' },
  { value: 'Nandura APMC', label: 'Nandura APMC', district: 'Buldhana' },
  { value: 'Shegaon APMC', label: 'Shegaon APMC', district: 'Buldhana' },
  { value: 'Washim APMC', label: 'Washim APMC', district: 'Washim' },
  { value: 'Karanja APMC', label: 'Karanja APMC', district: 'Washim' },

  // Yavatmal
  { value: 'Yavatmal APMC', label: 'Yavatmal APMC', district: 'Yavatmal' },
  { value: 'Pusad APMC', label: 'Pusad APMC', district: 'Yavatmal' },
  { value: 'Digras APMC', label: 'Digras APMC', district: 'Yavatmal' },
  { value: 'Umarkhed APMC', label: 'Umarkhed APMC', district: 'Yavatmal' },
  { value: 'Arni APMC', label: 'Arni APMC', district: 'Yavatmal' },
];

// Group by district for easier navigation
export const MANDIS_BY_DISTRICT = MAHARASHTRA_MANDIS.reduce((acc, mandi) => {
  const district = mandi.district || 'Other';
  if (!acc[district]) acc[district] = [];
  acc[district].push(mandi);
  return acc;
}, {});

// Get popular/high-volume markets for quick selection
export const POPULAR_MANDIS = [
  'Mumbai APMC',
  'Pune APMC',
  'Nashik APMC',
  'Nagpur APMC',
  'Lasalgaon APMC',
  'Pimpalgaon Baswant APMC',
  'Kolhapur APMC',
  'Solapur APMC',
  'Chhatrapati Sambhajinagar APMC',
  'Jalgaon APMC'
].map(value => MAHARASHTRA_MANDIS.find(m => m.value === value)).filter(Boolean);
