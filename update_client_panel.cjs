const fs = require('fs');

let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

// 1. Import getDoc, doc
if (!code.includes('getDoc')) {
    code = code.replace(
        "import { collection, query, where, onSnapshot } from 'firebase/firestore';",
        "import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';"
    );
}

// 2. Add defaultAvatar state
if (!code.includes('const [defaultAvatar, setDefaultAvatar] = useState')) {
    code = code.replace(
        "const [showRewards, setShowRewards] = useState(false);",
        "const [showRewards, setShowRewards] = useState(false);\n  const [defaultAvatar, setDefaultAvatar] = useState('');"
    );
}

// 3. Add useEffect to fetch setting
if (!code.includes('Load gamification settings')) {
    const fetchCode = `
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'gamification'));
        if (snap.exists()) {
          setDefaultAvatar(snap.data().defaultAvatarUrl || '');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSettings();
  }, []);
`;
    code = code.replace(
        "useEffect(() => {",
        fetchCode + "\n  useEffect(() => {"
    );
}

// 4. Update Player Card avatar display
const targetAvatar = `<div className={\`relative w-[72px] h-[72px] rounded-full border-[3px] \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                   <User className={\`w-8 h-8 \${tier.colorText} opacity-80\`} />
                </div>`;

const newAvatar = `
                <div className={\`relative w-[72px] h-[72px] rounded-full border-[3px] \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                   {clientProfile.avatarUrl || defaultAvatar ? (
                     <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <User className={\`w-8 h-8 \${tier.colorText} opacity-80\`} />
                   )}
                </div>
`;
code = code.replace(targetAvatar, newAvatar);

// 5. Pass down to ClientProfileModal if it's there
if (code.includes('<ClientProfileModal')) {
    code = code.replace(
        "clientProfile={clientProfile}",
        "clientProfile={clientProfile}\n        defaultAvatar={defaultAvatar}"
    );
}

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
console.log("ClientPanel updated");
