const fs = require('fs');
let code = fs.readFileSync('src/utils/bonusSystem.ts', 'utf-8');

const regex = /export const RANK_BONUSES_CONFIG: RankBonusDefinition\[\] = \[[\s\S]*?\];/;
const replacement = `export const RANK_BONUSES_CONFIG: RankBonusDefinition[] = [];`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/utils/bonusSystem.ts', code);
