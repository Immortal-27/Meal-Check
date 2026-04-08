const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

const ids = [
  'P001', 'P002', 'P003', 'P004', 'P005',
  'P006', 'P007', 'P008', 'P009', 'P010',
  'P011', 'P012', 'P013', 'P014', 'P015',
  'P016', 'P017', 'P018', 'P019', 'P020'
];

const names = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Gupta', 'Sneha Reddy', 'Vikram Singh',
  'Ananya Das', 'Karthik Nair', 'Meera Joshi', 'Arjun Kumar', 'Divya Iyer',
  'Rahul Verma', 'Nisha Mehta', 'Siddharth Rao', 'Kavya Menon', 'Aditya Bhatt',
  'Pooja Desai', 'Nikhil Saxena', 'Ritu Agarwal', 'Manish Tiwari', 'Swati Kapoor'
];

const participants = {};

ids.forEach((id, index) => {
  const hash = sha256(id);
  participants[hash] = {
    displayId: `#${id}`,
    name: names[index],
    meals: {
      breakfast: false,
      lunch: false,
      dinner: false,
      snacks: false
    }
  };
});

const output = {
  _meta: {
    generated: new Date().toISOString(),
    totalParticipants: ids.length,
    testIds: ids,
    note: 'Scan QR codes containing these raw IDs to test: ' + ids.join(', ')
  },
  participants
};

const outputPath = path.join(__dirname, '..', 'public', 'hashed_participants.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Generated hashed_participants.json with ${ids.length} participants`);
ids.forEach(id => {
  console.log(`  ${id} => ${sha256(id)}`);
});
