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

  function getChatsFromIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onsuccess = function(e) {
        const db = e.target.result;
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const req = store.getAllKeys();
        req.onsuccess = function() {
          const chatKeys = req.result.filter(k => k.startsWith('CHAT_'));
          if (chatKeys.length > 0) {
            const latestKey = chatKeys[chatKeys.length - 1];
            const chatReq = store.get(latestKey);
            chatReq.onsuccess = function() {
              resolve({key: latestKey, data: chatReq.result});
            }
          }
        }
      }
    });
  }

  let lastChatKey = null;
  setInterval(async () => {
    const chat = await getChatsFromIndexedDB();
    if (chat && chat.key !== lastChatKey) {
      lastChatKey = chat.key;
      const topic = chat.data?.title || chat.key;
      const messages = chat.data?.messages || [];
      const conversation = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
      if (conversation) {
        saveToSharePoint(topic, conversation);
      }
    }
  }, 30000);
})();
