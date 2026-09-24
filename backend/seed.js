// Run once after your .env is set up, to load the master Brand/Model list:
//   node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const BrandModel = require('./models/BrandModel');
const Department = require('./models/Department');

const BRAND_MODEL_DATA = {
  "CG": ["CG12HP05C", "CG18HP05C"],
  "CG MERIDIA": ["CGM12HP06C", "CGM18HP06C"],
  "Linken": ["LS0152501"],
  "Innovax": ["9K-IAC009KS", "12K-IAC012KS", "12K-IAC012KIN", "9K-IAC009KIN"],
  "Panasonic": ["CU-RU12CKY", "CU-RU18CKY", "CU-RU18CKY-1", "CU-SU18BKY3T", "CU-KN12CKY", "CU-SU12BKY3W", "CU-SU12BKY3T", "CU-KN18CKY", "CU-KN24CKY", "CU-SU18BKY3W", "CU-SU18BKY3WXH", "CU-NU18BKY5WX", "CU-NU18BKY4WX", "CU-NU18BKY5WXH", "CU-NU12BKY4W", "CU-NU12BKY5W", "CU-RU24CKY", "CU-KN12CKY3X", "CU-KN18CKY3X"],
  "Croma": ["CRLA012INF170291", "CRLA018IND170292", "CRLA018IND170297", "CRLA012INF170296", "CRLA022IND170294", "CRLAS18IND170211"],
  "TCL": ["TAC-12CSD/EV3AM", "TAC-22CSD/EV3AM", "18AMEV3", "TAC-12CSD/EV5AM", "AR18EV3", "TAC-18CSD/EV3AR", "TAC-18CSD/EV5AM", "18AMEV5"],
  "Mitsubishi Electric": ["MUY-AMZ13VF-DA1", "MUY-AMZ18VF-DA1", "MUY-AMZ22VF-DA1", "MU-AGZ19VF-DA2-KT", "MUY-AMZ24VF-DA1-KT"],
  "Mitsubishi Heavy": ["SRC18YAMDA-W", "SRC18CAPDA-W", "SRC25CAPDA-W", "SRC13YAMDA-W", "SRC21YAMDA-W", "SRC20CAPDA-W", "DXC15CAPDA-W", "DXC18YAMDA-W", "DXC13YAMDA-W", "DXC18CAPDA-W", "DXC21YAMDA-W", "DXC25CAPDA-W", "DXC20CAPDA-W", "SRC15CAPDA-W", "SRC27YAMDA-W", "DXC27YAMDA-W"],
  "Toshiba": ["RAS-18Y5ACV3CGB-IN", "RAS-18Y5ACV3CGB-IT", "RAS-13Y5ACV3CGB-IN", "RAS-13Y5ACV3CGB-IT", "RAS-24Y5ACV3CGB-IN", "RAS-24Y5ACV3CGB-IT", "RAS-13Y5ACV5CGB-IN", "RAS-13Y5ACV5CGB-IT", "RAS-18Y5ACV5CGB-IN", "RAS-18Y5ACV5CGB-IT", "RAS-30Y5ACV3CGB-IN", "RAS-30Y5ACV3CGB-IT"],
  "Cruise": ["CWCVBM-VQ3D173", "CWCVBM-VQ3S173", "CWCVBM-VQ1D243", "CWCVBM-VQ1F243", "CWCVBM-VQ1D185", "CWCVBM-VP3F185", "CWCVBM-VQ1F123", "CWCVBM-VQ1D123", "CWCVBM-VP3F185BL", "CWCVBM-VQ1F243BL", "CWCVBM-VP3F193BL"],
  "Realme": ["163IAA26WRMS", "123IAA26WRMS", "155IAA26WRMS", "203IAA26WRMS", "153IAA26WRMS", "103IAA26WRMS"],
  "Anchor": ["CU-AU18S3AAC", "CU-AU12S3AAC", "CU-AU24S3AAC", "CU-AU18S5AAC"],
  "Intec": ["IS3GR18INV"],
  "ONEIRIC": ["ONC243INA6", "ONEIRIC123IA6", "ONC125INA6", "ONC183INA6", "ONEIRIC183IA6", "ONC185INA6", "ONEIRIC182A2"],
  "AKABISHI": ["RBY-HE18VG-AB1", "RBY-HE18VG-AB1-KT", "RBY-HE22VG-AB1", "RBY-HE13VG-AB1-KT", "RBY-HE13VG-AB1"],
  "O General": ["AOGG24CKWA-B", "AOGG24CPWA-B", "AOGG22CNWA-B", "AOGA14NMWA-B(H&C)", "AOGA18NMWA-B(H&C)"],
  "NAPOLEON / Meet": ["NAP18/MR18E", "NAP24/MR24E"],
  "Yasuda": ["YS-AC12AIT(H&C)", "YS-AC18AIT(H&C)", "YS-AC24AIT(H&C)"],
  "Sun mobility": ["ONC153IA6", "ONC153IHA6"],
  "Napoleon": ["NAP24Z74/MM22"],
  "Chilton": ["AC183VSG"],
  "Akaritek": ["AK-AC18EIT", "AK-AC24EIT", "AK-AC12EIT"]
};

async function seed(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Seeding brand/model master data...');

    for(const [brand, models] of Object.entries(BRAND_MODEL_DATA)){
      await BrandModel.findOneAndUpdate(
        { brand },
        { brand, models },
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${brand} (${models.length} models)`);
    }

    console.log('Seeding departments...');
    for(const name of ['Production', 'HEX']){
      await Department.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
      console.log(`  ✓ ${name}`);
    }

    console.log('Done. All brands/models and departments loaded.');
    process.exit(0);
  }catch(err){
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();