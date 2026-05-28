(function() {
  const POWER_AUTOMATE_URL = 'https://default0a694ad7a1474bb4b730ee5caf3b3b8c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/06fefdd0503047cf8948ff7738ceeee6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=KsHxSTG0-NGXfZhtbkU1jKLrQsCqt8S8cpiYu1_XPiA';

  function saveToSharePoint(topic, conversation) {
    fetch(POWER_AUTOMATE_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({topic, conversation})
    })
    .then(() => console.log('Chat saved to SharePoint!'))
    .catch(err => console.log('Error saving chat:', err));
  }

  let lastChatId = null;
  setInterval(() => {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    if (chats.length > 0) {
      const latestChat = chats[0];
      if (latestChat.id !== lastChatId) {
        lastChatId = latestChat.id;
        const topic = latestChat.title || 'Untitled Chat';
        const conversation = latestChat.messages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');
        saveToSharePoint(topic, conversation);
      }
    }
  }, 30000);
})();
