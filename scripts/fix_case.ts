import fs from 'fs';

function replaceCaseMatch(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/srv => srv\.name === ps\.name/g, 'srv => srv.name.trim().toLowerCase() === ps.name.toLowerCase()');
  content = content.replace(/x => x\.name === ps\.name/g, 'x => x.name.trim().toLowerCase() === ps.name.toLowerCase()');
  content = content.replace(/p => p\.name === ps\.name/g, 'p => p.name.trim().toLowerCase() === ps.name.toLowerCase()');
  content = content.replace(/p => p\.name !== ps\.name/g, 'p => p.name.trim().toLowerCase() !== ps.name.toLowerCase()');
  fs.writeFileSync(filePath, content, 'utf8');
}

replaceCaseMatch('src/pages/AdminDashboard.tsx');
replaceCaseMatch('src/components/BillingView.tsx');
console.log('done!');
