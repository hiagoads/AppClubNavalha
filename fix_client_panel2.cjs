const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

// The JoinQueueModal replace
let startIdx = code.indexOf('{showJoinForm && (');
if (startIdx !== -1) {
    let before = code.substring(0, code.lastIndexOf('<AnimatePresence>', startIdx));
    let afterIdx = code.indexOf('</form>', startIdx);
    afterIdx = code.indexOf('</motion.div>', afterIdx);
    afterIdx = code.indexOf('</motion.div>', afterIdx + 1);
    afterIdx = code.indexOf(')}', afterIdx);
    afterIdx = code.indexOf('</AnimatePresence>', afterIdx) + '</AnimatePresence>'.length;
    let after = code.substring(afterIdx);

    code = before + `
      <AnimatePresence>
        <JoinQueueModal
          isOpen={showJoinForm}
          onClose={() => setShowJoinForm(false)}
          formType={formType}
          setFormType={setFormType}
          formData={formData}
          setFormData={setFormData}
          services={services}
          onSubmit={withProcessing(handleSubmit)}
          schedulingFee={schedulingFee}
        />
      </AnimatePresence>
` + after;
}

// The MenuModal
startIdx = code.indexOf('{showMenu && (');
if (startIdx !== -1) {
    let before = code.substring(0, code.lastIndexOf('<AnimatePresence>', startIdx));
    let afterIdx = code.indexOf('</motion.div>', startIdx);
    afterIdx = code.indexOf('</motion.div>', afterIdx + 1);
    afterIdx = code.indexOf('</>', afterIdx);
    afterIdx = code.indexOf(')}', afterIdx);
    afterIdx = code.indexOf('</AnimatePresence>', afterIdx) + '</AnimatePresence>'.length;
    let after = code.substring(afterIdx);

    code = before + `
      <AnimatePresence>
        <ClientMenuModal isOpen={showMenu} onClose={() => setShowMenu(false)} onNavigateToAdmin={() => navigate('/admin')} />
      </AnimatePresence>
` + after;
}

// The EditServicesModal
startIdx = code.indexOf('{editingServices && (');
if (startIdx !== -1) {
    let before = code.substring(0, code.lastIndexOf('<AnimatePresence>', startIdx));
    let afterIdx = code.indexOf('</form>', startIdx);
    afterIdx = code.indexOf('</div>', afterIdx);
    afterIdx = code.indexOf('</div>', afterIdx + 1);
    afterIdx = code.indexOf(')}', afterIdx);
    afterIdx = code.indexOf('</AnimatePresence>', afterIdx) + '</AnimatePresence>'.length;
    let after = code.substring(afterIdx);

    code = before + `
      <AnimatePresence>
        <EditClientServicesModal
          isOpen={!!editingServices}
          editingServices={editingServices}
          setEditingServices={setEditingServices}
          services={services}
          onSubmit={withProcessing(handleUpdateServices)}
        />
      </AnimatePresence>
` + after;
}

// The ReceiptModal
startIdx = code.indexOf('{receipt && (');
if (startIdx !== -1) {
    let before = code.substring(0, code.lastIndexOf('<AnimatePresence>', startIdx));
    let afterIdx = code.indexOf('Fechar', startIdx);
    afterIdx = code.indexOf('</button>', afterIdx);
    afterIdx = code.indexOf('</motion.div>', afterIdx);
    afterIdx = code.indexOf('</motion.div>', afterIdx + 1);
    afterIdx = code.indexOf(')}', afterIdx);
    afterIdx = code.indexOf('</AnimatePresence>', afterIdx) + '</AnimatePresence>'.length;
    let after = code.substring(afterIdx);

    code = before + `
      <AnimatePresence>
        <ReceiptModal
          isOpen={!!receipt}
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      </AnimatePresence>
` + after;
}

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
