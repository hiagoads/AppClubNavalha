const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

if (!code.includes('.bg-noise')) {
    code += `\n
.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
}
`;
    fs.writeFileSync('src/index.css', code);
    console.log("index.css updated");
}
